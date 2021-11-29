import log from '../log'
import { NextFunction, Request, Response, Router } from 'express'
import { AsyncHandlerResponse } from '../types'
import { BaseController, responseBase } from './base'
import { sendPaymentConfirmation } from '../email'
import {
  getOwnerData,
  getPortalSettings,
  getUserData,
} from '../core'
import {
  transaction as txnRepo,
  user as usersRepo,
  subscription as subscriptionsRepo,
  organization as orgsRepo,
} from '../models'
import {
  subscriptionPayment,
  verifyPaymentSuccess,
  verifySubscriptionPaymentSuccess,
  updateSubscription,
  VerifiedPayment,
} from '../payment-processing'
import { asyncWrap as aw } from '../middleware'
import { db } from '../db'
import { Transaction, TransactionType } from '../models/transaction'
import moment from "moment"

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

  private sendConfirmationEmail = async (title: string, transaction: Transaction, payment: VerifiedPayment): Promise<void> => {
    const [user, owner, settings] = await Promise.all([
      getUserData(payment.metadata.userId),
      getOwnerData(),
      getPortalSettings(),
    ])
    if (user) {
      await sendPaymentConfirmation({
        email: user.email,
        paymentID: payment.id,
        paymentTitle: title,
        credits: transaction.credits,
        price: transaction.amount,
        createdAt: moment(transaction.createdAt).format('Do MMMM YYYY, HH:mm'),
        portalName: settings?.portalName || owner?.name || '',
        supportURL: settings?.supportURL || '',
      }, {
        logo: owner?.logo,
      })
    }
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
        const org = await orgsRepo.findByPPSubscriptionId(trx, payment.subscriptionId)
        if (!org) throw new Error('invalid subscription organization')

        const subId = org.subscriptionId
        if (!subId) throw new Error('invalid subscription id')

        const subscription = await subscriptionsRepo.findById(trx, subId)
        if (!subscription) throw new Error('invalid subscription')

        const [, transaction] = await Promise.all([
          await orgsRepo.updateCredits(trx, org.id, subscription.credits),
          await txnRepo.create(trx, {
            userId: null,
            organizationId: org.id,
            paymentId: req.body.id,
            credits: subscription.credits,
            verified: true,
            type: TransactionType.Subscription,
            amount: payment.amount,
          }),
        ])

        await trx.commit()

        if (transaction) {
          this.sendConfirmationEmail('Subscription payment', transaction, payment)
        }
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
      await orgsRepo.updateCredits(trx, transaction.organizationId, transaction.credits)
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

    const org = await orgsRepo.findById(null, transaction.organizationId)
    if (!org) {
      log.error('subscriptionFirstPaymentSuccess: payment successful but could not find org')
      return
    }
    if (!org.ppCustomerId) {
      log.error('subscriptionFirstPaymentSuccess: payment successful but org has no customerId')
      return
    }
    if (!org.subscriptionId) {
      log.error('subscriptionFirstPaymentSuccess: payment successful but org has no associated subscription')
      return
    }

    const subscription = await subscriptionsRepo.findById(null, org.subscriptionId)
    if (!subscription) {
      log.error('subscriptionFirstPaymentSuccess: payment successful but could not find subscription')
      return
    }

    const subscriptionData = {
      customerId: org.ppCustomerId,
      price: subscription.price,
      credits: subscription.credits,
      description: subscription.name,
      interval: subscription.periodicity,
      startAfterFirstInterval: true,
    }

    const userInformation = {
      organizationId: payment.metadata.organizationId,
      userId: payment.metadata.userId,
      invoiceNotes: payment.metadata.invoiceNotes ?? '',
    }
    const subscriptionId = await subscriptionPayment(subscriptionData, userInformation)
    await orgsRepo.update(null, transaction.organizationId, {
      ppSubscriptionId: subscriptionId,
    })

    if (transaction) {
      this.sendConfirmationEmail('Subscription payment', transaction, payment)
    }
  }

  public topUpPaymentWebhookHandler = async (req: Request, res: Response, next: NextFunction): AsyncHandlerResponse => {
    if (!req.body.id) {
      return res.status(400).json({
        errors: ['missing payment id'],
      })
    }

    const payment = await verifyPaymentSuccess(req.body.id)
    if (!payment) {
      return res.status(400).json(responseBase('ok'))
    }

    let transaction
    const trx = await db.transaction()
    try {
      transaction = await txnRepo.setVerified(trx, payment.id)
      await orgsRepo.updateCredits(trx, transaction.organizationId, transaction.credits)
      await trx.commit()
    } catch (err) {
      await trx.rollback()
      next(err)
    }

    res.status(200).json(responseBase('ok'))

    if (transaction) {
      this.sendConfirmationEmail('Top up payment', transaction, payment)
    }
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

    const org = await usersRepo.findById(null, transaction.organizationId)
    if (!org) {
      log.error('update_payment: payment successful but could not find org')
      return
    }
    if (!org.ppCustomerId) {
      log.error('update_payment: payment successful but org has no customerId')
      return
    }
    if (!org.subscriptionId) {
      log.error('update_payment: payment successful but org has no associated subscription')
      return
    }
    if (!org.ppSubscriptionId) {
      log.error('update_payment: payment successful but org has no ppSubscriptionId')
      return
    }

    const subId = transaction.organizationId
    const subscription = await subscriptionsRepo.findById(null, subId)
    if (!subscription) {
      log.error('update_payment: payment successful but could not find subscription')
      return
    }

    await updateSubscription(subId.toString(), {
      customerId: org.ppCustomerId,
      mandateId: payment.mandateId,
    })
  }
}


