import { NextFunction, Request, Response, Router } from 'express'
import { AsyncHandlerResponse } from '../types'
import { BaseController } from './base'
import {
  transaction as txnRepo,
  user as usersRepo,
  pkg as pkgsRepo,
} from '../models'
import { verifyPaymentSuccess, verifySubscriptionPaymentSuccess } from '../payment-processing'
import { asyncWrap as aw } from '../middleware'
import { db } from '../db'

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

    const subscriptionId = await verifySubscriptionPaymentSuccess(req.body.id)
    if (subscriptionId) {
      const trx = await db.transaction()
      try {
        // TODO create transaction record
        // const transaction = await txnRepo.setVerified(trx, paymentId)
        const user = await usersRepo.findByPPSubscriptionId(trx, subscriptionId)
        if (!user || !user.subscriptionId) throw new Error('invalid subscription user')

        const plan = await pkgsRepo.findById(trx, user?.subscriptionId)
        if (!plan) throw new Error('invalid subscription plan')

        await usersRepo.incrementCredits(trx, user.id, plan.credits)
        await trx.commit()
      } catch (err) {
        await trx.rollback()
        next(err)
      }
      // TODO send invoice email?
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

    const paymentId = await verifyPaymentSuccess(req.body.id)
    if (paymentId) {
      const trx = await db.transaction()
      try {
        const transaction = await txnRepo.setVerified(trx, paymentId)
        await usersRepo.incrementCredits(trx, transaction.userId, transaction.credits)
        await trx.commit()
      } catch (err) {
        await trx.rollback()
        next(err)
      }
      // TODO send invoice email?
    }

    return res.status(200).json({
      data: 'ok',
    })
  }

  public firstPaymentWebhookHandler = async (req: Request, res: Response): AsyncHandlerResponse => {
    console.log(req.body)
    // req.body.id => transaction ID

    return res.status(200).json({
      data: 'ok',
    })
  }
}
