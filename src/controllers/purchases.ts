import { NextFunction, Request, Response, Router } from 'express'
import { AsyncHandlerResponse } from '../types'
import { BaseController, responseBase } from './base'
import { NotFoundError, PurchasePreconditionError, ForbiddenError } from './errors'
import { asyncWrap as aw, authenticated } from '../middleware'
import {
  pkg as pkgsRepo,
  subscription as subscriptionsRepo,
  transaction as txnRepo,
  user as usersRepo,
} from '../models'
import {
  topUpPayment,
  listCustomerPayments,
  cancelSubscription,
  createCustomer,
  subscriptionFirstPayment,
  updatePaymentRedirectURL,
  getPaymentDetails,
} from '../payment-processing'
import { TransactionType } from '../models/transaction'
import { getPaymentRedirectURL } from '../core'

export class PurchasesController implements BaseController {
  private readonly path = '/purchases'

  public getRouter(): Router {
    const router = Router()
    router.get(`${this.path}/`, authenticated, aw(this.listPurchases))
    router.get(`${this.path}/:id`, authenticated, aw(this.getPurchase))
    router.post(`${this.path}/packages/:id`, authenticated, aw(this.purchasePackage))
    router.post(`${this.path}/subscriptions/:id`, authenticated, aw(this.purchaseSubscription))
    router.patch(`${this.path}/subscriptions`, authenticated, aw(this.updatePaymentInformation))
    return router
  }

  public listPurchases = async (req: Request, res: Response): AsyncHandlerResponse => {
    const user = await usersRepo.findById(null, res.locals.authenticatedUser.id)
    if (!user?.ppCustomerId) {
      return res.status(200).json(responseBase([]))
    }
    const payments = await listCustomerPayments(user.ppCustomerId)

    return res.status(200).json(responseBase(payments))
  }

  public getPurchase = async (req: Request, res: Response, next: NextFunction): AsyncHandlerResponse => {
    const user = await usersRepo.getOrBootstrapUser(null, res.locals.authenticatedUser.id)

    const transaction = await txnRepo.findById(null, req.params.id)
    if (!transaction) return next(new NotFoundError('transaction'))
    if (transaction.userId !== user.id) return next(new ForbiddenError())

    const payment = await getPaymentDetails(req.params.id)
    if (!payment) return next(new NotFoundError('payment'))

    return res.status(200).json(responseBase({
      id: payment.id,
      description: payment.description,
      method: payment.method,
      status: payment.status,
      createdAt: payment.createdAt,
      amount: {
        currency: payment.amount.currency,
        value: payment.amount.value,
      },
      credits: payment.metadata?.credits,
      type: payment.metadata?.type,
    }))
  }

  public purchasePackage = async (req: Request, res: Response, next: NextFunction): AsyncHandlerResponse => {
    const user = await usersRepo.getOrBootstrapUser(null, res.locals.authenticatedUser.id)
    if (!user.ppCustomerId) {
      user.ppCustomerId = await createCustomer(res.locals.authenticatedUser.name, res.locals.authenticatedUser.email)
      await usersRepo.update(null, res.locals.authenticatedUser.id, { ppCustomerId: user.ppCustomerId })
    }

    let organizationId = res.locals.authenticatedUser.org?.id
    if (Object.keys(req.body).length && req.body.organizationId) {
      organizationId = req.body.organizationId
    }

    const pkg = await pkgsRepo.findById(null, Number(req.params.id))
    if (!pkg) {
      return next(new NotFoundError('package'))
    }

    const payment = await topUpPayment(pkg, user.ppCustomerId, organizationId)
    const redirectURL = await getPaymentRedirectURL(res.locals.authenticatedUser.role.name)
    redirectURL.searchParams.append('id', payment.id)
    await updatePaymentRedirectURL(payment.id, redirectURL.toString())
    await txnRepo.create(null, {
      userId: res.locals.authenticatedUser.id,
      paymentId: payment.id,
      credits: pkg.credits,
      verified: false,
      type: TransactionType.TopUp,
      amount: pkg.price,
    })
    return res.status(200).json(responseBase(payment.checkoutURL))
  }

  public purchaseSubscription = async (req: Request, res: Response, next: NextFunction): AsyncHandlerResponse => {
    const user = await usersRepo.getOrBootstrapUser(null, res.locals.authenticatedUser.id)
    let organizationId = res.locals.authenticatedUser.org?.id
    if (Object.keys(req.body).length && req.body.organizationId) {
      organizationId = req.body.organizationId
    }

    if (user.subscriptionId === Number(req.params.id)) {
      return next(new PurchasePreconditionError('subscription already active'))
    }

    const subscription = await subscriptionsRepo.findById(null, Number(req.params.id))
    if (!subscription) {
      return next(new NotFoundError('subscription'))
    }

    if (!user.ppCustomerId) {
      user.ppCustomerId = await createCustomer(res.locals.authenticatedUser.name, res.locals.authenticatedUser.email)
      await usersRepo.update(null, res.locals.authenticatedUser.id, { ppCustomerId: user.ppCustomerId })
    }

    if (user.ppSubscriptionId) {
      await cancelSubscription(user.ppSubscriptionId, user.ppCustomerId)
      user.ppSubscriptionId = null
      user.subscriptionId = null
    }

    const payment = await subscriptionFirstPayment(user.ppCustomerId, subscription, organizationId, false)
    const redirectURL = await getPaymentRedirectURL(res.locals.authenticatedUser.role.name)
    redirectURL.searchParams.append('id', payment.id)
    await updatePaymentRedirectURL(payment.id, redirectURL.toString())
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

    return res.status(200).json(responseBase(payment.checkoutURL))
  }

  public updatePaymentInformation = async (req: Request, res: Response, next: NextFunction): AsyncHandlerResponse => {
    const user = await usersRepo.getOrBootstrapUser(null, res.locals.authenticatedUser.id)

    if (!user.subscriptionId || !user.ppCustomerId){
      return next(new NotFoundError('subscription'))
    }


    const subscription = await subscriptionsRepo.findById(null, user.subscriptionId)
    if (!subscription) {
      return next(new NotFoundError('subscription'))
    }

    subscription.price = 0
    const payment = await subscriptionFirstPayment(user.ppCustomerId, subscription, res.locals.authenticatedUser.org.id, true)
    const redirectURL = await getPaymentRedirectURL(res.locals.authenticatedUser.role.name)
    redirectURL.searchParams.append('id', payment.id)
    await updatePaymentRedirectURL(payment.id, redirectURL.toString())
    await txnRepo.create(null, {
      userId: res.locals.authenticatedUser.id,
      paymentId: payment.id,
      credits: subscription.credits,
      verified: false,
      type: TransactionType.Consent,
      amount: payment.amount,
    })

    return res.status(200).json(responseBase(payment.checkoutURL))

  }
}
