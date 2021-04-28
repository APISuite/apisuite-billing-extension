import { NextFunction, Request, Response, Router } from 'express'
import { AsyncHandlerResponse } from '../types'
import { BaseController, responseBase } from './base'
import {
  transaction as txnRepo,
  user as usersRepo,
  subscription as subscriptionsRepo,
} from '../models'
import { verifyPaymentSuccess, verifySubscriptionPaymentSuccess } from '../payment-processing'
import { asyncWrap as aw } from '../middleware'
import { db } from '../db'
import { TransactionType } from '../models/transaction'

export class WebhooksController implements BaseController {
  private readonly path = '/webhooks'

  public getRouter(): Router {
    const router = Router()
    router.post(`${this.path}/subscription`, aw(this.subscriptionPaymentSuccess))
    router.post(`${this.path}/topup`, aw(this.topUpPaymentWebhookHandler))
    router.post(`${this.path}/first`, aw(this.firstPaymentWebhookHandler))
    return router
  }

  public subscriptionPaymentSuccess = async (req: Request, res: Response, next: NextFunction): AsyncHandlerResponse => {
    if (!req.body.id) {
      return res.status(400).json({
        errors: ['missing payment id'],
      })
    }

    const payment = await verifySubscriptionPaymentSuccess(req.body.id)
    if (payment) {
      const trx = await db.transaction()
      try {
        const user = await usersRepo.findByPPSubscriptionId(trx, payment.subscriptionId)
        if (!user || !user.subscriptionId) {
          await trx.rollback()
          throw new Error('invalid subscription user')
        }

        const subscription = await subscriptionsRepo.findById(trx, user?.subscriptionId)
        if (!subscription) {
          await trx.rollback()
          throw new Error('invalid subscription')
        }

        await Promise.all([
          await usersRepo.incrementCredits(trx, user.id, subscription.credits),
          await txnRepo.create(trx, {
            paymentId: req.body.id,
            credits: subscription.credits,
            userId: user.id,
            verified: true,
            type: TransactionType.Subscription,
            amount: payment.amount,
          }),
        ])

        await trx.commit()
        // TODO send invoice email?
      } catch (err) {
        await trx.rollback()
        next(err)
      }
    }

    return res.status(200).json(responseBase('ok'))
  }

  public topUpPaymentWebhookHandler = async (req: Request, res: Response, next: NextFunction): AsyncHandlerResponse => {
    if (!req.body.id) {
      return res.status(400).json({
        errors: ['missing payment id'],
      })
    }

    const payment = await verifyPaymentSuccess(req.body.id)
    if (payment) {
      const trx = await db.transaction()
      try {
        const transaction = await txnRepo.setVerified(trx, payment.id)
        await usersRepo.incrementCredits(trx, transaction.userId, transaction.credits)
        await trx.commit()
        // TODO send invoice email?
      } catch (err) {
        await trx.rollback()
        next(err)
      }
    }

    return res.status(200).json(responseBase('ok'))
  }

  public firstPaymentWebhookHandler = async (req: Request, res: Response): AsyncHandlerResponse => {
    if (!req.body.id) {
      return res.status(400).json({
        errors: ['missing payment id'],
      })
    }

    const payment = await verifyPaymentSuccess(req.body.id)
    if (payment) {
      await txnRepo.setVerified(null, payment.id)
    }

    return res.status(200).json(responseBase('ok'))
  }
}
