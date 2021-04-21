import { NextFunction, Request, Response, Router } from 'express'
import { AsyncHandlerResponse } from '../types'
import { BaseController } from './base'
import { pkg as pkgsRepo, transaction as txnRepo, user as usersRepo, } from '../models'
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
        if (!user || !user.subscriptionId) throw new Error('invalid subscription user')

        const plan = await pkgsRepo.findById(trx, user?.subscriptionId)
        if (!plan) throw new Error('invalid subscription plan')

        await Promise.all([
          await usersRepo.incrementCredits(trx, user.id, plan.credits),
          await txnRepo.create(trx, {
            paymentId: req.body.id,
            credits: plan.credits,
            userId: user.id,
            verified: true,
            type: TransactionType.Subscription,
            amount: payment.subscriptionId,
          }),
        ])

        await trx.commit()
        // TODO send invoice email?
      } catch (err) {
        await trx.rollback()
        next(err)
      }
    }

    return res.status(200).json({
      data: 'ok',
    })
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

    return res.status(200).json({
      data: 'ok',
    })
  }

  public firstPaymentWebhookHandler = async (req: Request, res: Response): AsyncHandlerResponse => {
    const payment = await verifyPaymentSuccess(req.body.id)
    if (payment) {
      await txnRepo.setVerified(null, payment.id)
    }

    return res.status(200).json({
      data: 'ok',
    })
  }
}
