import { NextFunction, Request, Response, Router } from 'express'
import { AsyncHandlerResponse } from '../types'
import { BaseController, responseBase } from './base'
import { NotFoundError, PurchasePreconditionError } from './errors'
import { asyncWrap as aw, authenticated } from '../middleware'
import {
  pkg as pkgsRepo,
  subscription as subscriptionsRepo,
  transaction as txnRepo,
  user as usersRepo,
} from '../models'
import {
  findValidMandate,
  subscriptionPayment,
  topUpPayment,
  listCustomerPayments,
  cancelSubscription,
  createUser, subscriptionFirstPayment,
} from '../payment-processing'
import { TransactionType } from '../models/transaction'

export class PurchasesController implements BaseController {
  private readonly path = '/purchases'

  public getRouter(): Router {
    const router = Router()
    router.get(`${this.path}/`, authenticated, aw(this.listPurchases))
    router.post(`${this.path}/packages/:id`, authenticated, aw(this.purchasePackage))
    router.post(`${this.path}/subscriptions/:id`, authenticated, aw(this.purchaseSubscription))
    return router
  }

  public listPurchases = async (req: Request, res: Response): AsyncHandlerResponse => {
    const user = await usersRepo.getOrBootstrapUser(null, res.locals.authenticatedUser.id)
    if (!user.ppCustomerId) {
      return res.status(200).json(responseBase([]))
    }
    const payments = await listCustomerPayments(user.ppCustomerId)

    return res.status(200).json(responseBase(payments))
  }

  public purchasePackage = async (req: Request, res: Response, next: NextFunction): AsyncHandlerResponse => {
    const user = await usersRepo.getOrBootstrapUser(null, res.locals.authenticatedUser.id)
    if (!user.ppCustomerId) {
      user.ppCustomerId = await createUser(res.locals.authenticatedUser.name, res.locals.authenticatedUser.email)
      await usersRepo.update(null, res.locals.authenticatedUser.id, { ppCustomerId: user.ppCustomerId })
    }

    const pkg = await pkgsRepo.findById(null, Number(req.params.id))
    if (!pkg) {
      return next(new NotFoundError('package'))
    }

    const payment = await topUpPayment(pkg.price, pkg.name, user.ppCustomerId)
    await txnRepo.create(null, {
      userId: res.locals.authenticatedUser.id,
      paymentId: payment.id,
      credits: pkg.credits,
      verified: false,
      type: TransactionType.TopUp,
      amount: pkg.price,
    })
    return res.status(302).redirect(payment.checkoutURL)
  }

  public purchaseSubscription = async (req: Request, res: Response, next: NextFunction): AsyncHandlerResponse => {
    const user = await usersRepo.getOrBootstrapUser(null, res.locals.authenticatedUser.id)

    if (user.subscriptionId === Number(req.params.id)) {
      return next(new PurchasePreconditionError('subscription already active'))
    }

    const subscription = await subscriptionsRepo.findById(null, Number(req.params.id))
    if (!subscription) {
      return next(new NotFoundError('subscription'))
    }

    if (!user.ppCustomerId) {
      user.ppCustomerId = await createUser(res.locals.authenticatedUser.name, res.locals.authenticatedUser.email)
      await usersRepo.update(null, res.locals.authenticatedUser.id, { ppCustomerId: user.ppCustomerId })
    }

    const mandate = await findValidMandate(user.ppCustomerId)
    if (!mandate) {
      const payment = await subscriptionFirstPayment(user.ppCustomerId, subscription)
      await txnRepo.create(null, {
        userId: res.locals.authenticatedUser.id,
        paymentId: payment.id,
        credits: subscription.credits,
        verified: false,
        type: TransactionType.Consent,
        amount: payment.amount,
      })
      await usersRepo.update(null, user.id, {
        subscriptionId: subscription.id,
      })

      return res.status(302).redirect(payment.checkoutURL)
    }

    if (user.ppSubscriptionId) {
      await cancelSubscription(user.ppSubscriptionId, user.ppCustomerId)
      user.ppSubscriptionId = null
      user.subscriptionId = null
    }

    const subscriptionId = await subscriptionPayment({
      customerId: user.ppCustomerId,
      price: subscription.price,
      credits: subscription.credits,
      description: subscription.name,
      interval: subscription.periodicity,
      startAfterFirstInterval: false,
    })
    await usersRepo.update(null, user.id, {
      subscriptionId: subscription.id,
      ppSubscriptionId: subscriptionId,
    })

    return res.sendStatus(204)
  }
}
