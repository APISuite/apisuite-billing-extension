import log from '../log'
import { NextFunction, Request, Response, Router } from 'express'
import { AsyncHandlerResponse } from '../types'
import { BaseController, responseBase } from './base'
import {getOwnerData, getUserData} from '../core'
import { sendPaymentConfirmation } from '../email'
import {
  transaction as txnRepo,
  user as usersRepo,
  subscription as subscriptionsRepo,
} from '../models'
import {
  subscriptionPayment,
  verifyPaymentSuccess,
  verifySubscriptionPaymentSuccess,
  updateSubscription,
} from '../payment-processing'
import { asyncWrap as aw } from '../middleware'
import { db } from '../db'
import { TransactionType } from '../models/transaction'

export class WebhooksController implements BaseController {
  private readonly path = '/webhooks'

  public getRouter(): Router {
    const router = Router()
    router.post(`${this.path}/subscription`, aw(this.subscriptionPaymentSuccess))
    router.post(`${this.path}/subscription_first`, aw(this.subscriptionFirstPaymentHandler))
    router.post(`${this.path}/topup`, aw(this.topUpPaymentWebhookHandler))
    router.post(`${this.path}/update_payment_method`, aw(this.updatePaymentInformationHandler))
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

  public subscriptionFirstPaymentHandler = async (req: Request, res: Response, next: NextFunction): AsyncHandlerResponse => {
    if (!req.body.id) {
      return res.status(400).json({
        errors: ['missing payment id'],
      })
    }

    const payment = await verifyPaymentSuccess(req.body.id)
    if (!payment) {
      log.info(`subscriptionFirstPaymentSuccess: payment ${req.body.id} not verified as successful`)
      return res.status(200).json(responseBase('ok'))
    }
    let transaction
    const trx = await db.transaction()
    try {
      transaction = await txnRepo.setVerified(trx, payment.id)
      await usersRepo.incrementCredits(trx, transaction.userId, transaction.credits)
      await trx.commit()
    } catch (err) {
      await trx.rollback()
      next(err)
    }

    res.status(200).json(responseBase('ok'))

    if (!transaction) {
      log.info('subscriptionFirstPaymentSuccess: halting due to missing transaction')
      return
    }

    const user = await usersRepo.findById(null, transaction.userId)
    if (!user) {
      log.error('subscriptionFirstPaymentSuccess: payment successful but could not find user')
      return
    }
    if (!user.ppCustomerId) {
      log.error('subscriptionFirstPaymentSuccess: payment successful but user has no customerId')
      return
    }
    if (!user.subscriptionId) {
      log.error('subscriptionFirstPaymentSuccess: payment successful but user has no associated subscription')
      return
    }

    const subscription = await subscriptionsRepo.findById(null, user.subscriptionId)
    if (!subscription) {
      log.error('subscriptionFirstPaymentSuccess: payment successful but could not find subscription')
      return
    }

    const subscriptionId = await subscriptionPayment({
      customerId: user.ppCustomerId,
      price: subscription.price,
      credits: subscription.credits,
      description: subscription.name,
      interval: subscription.periodicity,
      startAfterFirstInterval: true,
    })
    await usersRepo.update(null, user.id, {
      ppSubscriptionId: subscriptionId,
    })
  }

  public topUpPaymentWebhookHandler = async (req: Request, res: Response, next: NextFunction): AsyncHandlerResponse => {
    if (!req.body.id) {
      return res.status(400).json({
        errors: ['missing payment id'],
      })
    }

    const payment = await verifyPaymentSuccess(req.body.id)
    let transaction
    if (payment) {
      const trx = await db.transaction()
      try {
        transaction = await txnRepo.setVerified(trx, payment.id)
        await usersRepo.incrementCredits(trx, transaction.userId, transaction.credits)
        await trx.commit()
      } catch (err) {
        await trx.rollback()
        next(err)
      }

      if (transaction) {
        const user = await getUserData(transaction.userId)
        const owner = await getOwnerData()
        if (user) {
          await sendPaymentConfirmation({
            email: user.email,
            paymentID: payment.id,
            paymentTitle: 'Top up payment',
            credits: transaction.credits,
            price: transaction.amount,
            createdAt: transaction.createdAt,
          }, {
            logo: owner?.logo,
          })
        }
      }
    }

    return res.status(200).json(responseBase('ok'))
  }

  public updatePaymentInformationHandler = async (req: Request, res: Response): AsyncHandlerResponse => {
    if (!req.body.id) {
      return res.status(400).json({
        errors: ['missing payment id'],
      })
    }

    const payment = await verifyPaymentSuccess(req.body.id)
    if (!payment) {
      log.info(`subscriptionFirstPaymentSuccess: payment ${req.body.id} not verified as successful`)
      return res.status(200).json(responseBase('ok'))
    }

    const transaction = await txnRepo.setVerified(null, payment.id)

    res.status(200).json(responseBase('ok'))

    if (!transaction) {
      log.info('update_payment: halting due to missing transaction')
      return
    }

    const user = await usersRepo.findById(null, transaction.userId)
    if (!user) {
      log.error('update_payment: payment successful but could not find user')
      return
    }
    if (!user.ppCustomerId) {
      log.error('update_payment: payment successful but user has no customerId')
      return
    }
    if (!user.subscriptionId) {
      log.error('update_payment: payment successful but user has no associated subscription')
      return
    }
    if (!user.ppSubscriptionId) {
      log.error('update_payment: payment successful but user has no ppSubscriptionId')
      return
    }

    const subscription = await subscriptionsRepo.findById(null, user.subscriptionId)
    if (!subscription) {
      log.error('update_payment: payment successful but could not find subscription')
      return
    }

    await updateSubscription(user.ppSubscriptionId, {
      customerId: user.ppCustomerId,
      mandateId: payment.mandateId,
    })
  }
}


