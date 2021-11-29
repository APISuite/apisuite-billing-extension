import { NextFunction, Request, Response, Router } from 'express'
import { AsyncHandlerResponse } from '../types'
import { BaseController, responseBase } from './base'
import config from '../config'
import { NotFoundError, PurchasePreconditionError, ForbiddenError } from './errors'
import { asyncWrap as aw, Introspection } from '../middleware'
import {
  pkg as pkgsRepo,
  subscription as subscriptionsRepo,
  transaction as txnRepo,
  organization as orgsRepo,
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
import { applyVAT } from '../vat'

function extractUserOrgRole(orgId: number, authUser: Introspection) {
  const org = authUser.organizations.find((o) => o.id === orgId)
  return org?.role.name || 'developer'
}

export class OrgPurchasesController implements BaseController {
  public getRouter(): Router {
    const router = Router({
      mergeParams: true,
    })
    router.get('/', aw(this.listPurchases))
    router.get('/:pid', aw(this.getPurchase))
    router.post('/packages/:pid', aw(this.purchasePackage))
    router.post('/subscriptions/:sid', aw(this.purchaseSubscription))
    router.patch('/method', aw(this.updatePaymentInformation))
    return router
  }

  public listPurchases = async (req: Request, res: Response): AsyncHandlerResponse => {
    const org = await orgsRepo.findById(null, Number(req.params.id))
    if (!org?.ppCustomerId) {
      return res.status(200).json(responseBase([]))
    }
    const payments = await listCustomerPayments(org.ppCustomerId)

    return res.status(200).json(responseBase(payments))
  }

  public getPurchase = async (req: Request, res: Response, next: NextFunction): AsyncHandlerResponse => {
    const org = await orgsRepo.findById(null, Number(req.params.id))
    if (!org) return next(new NotFoundError('payment'))

    const transaction = await txnRepo.findById(null, req.params.pid)
    if (!transaction) return next(new NotFoundError('transaction'))
    if (transaction.organizationId !== org.id) return next(new ForbiddenError())

    const payment = await getPaymentDetails(req.params.pid)
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
    const org = await orgsRepo.findById(null, Number(req.params.id))
    if (!org) return next(new NotFoundError('organization'))
    if (!org.ppCustomerId) {
      org.ppCustomerId = await createCustomer(res.locals.authenticatedUser.name, res.locals.authenticatedUser.email)
      await orgsRepo.update(null, res.locals.authenticatedUser.id, { ppCustomerId: org.ppCustomerId })
    }

    const pkg = await pkgsRepo.findById(null, Number(req.params.pid))
    if (!pkg) return next(new NotFoundError('package'))

    const vat = config.get('vatRate')
    if (vat) {
      pkg.price = applyVAT(pkg.price, vat)
    }

    const meta = {
      organizationId: org.id,
      userId: res.locals.authenticatedUser.id,
      invoiceNotes: org.invoiceNotes ?? '',
    }

    const payment = await topUpPayment(pkg, org.ppCustomerId, meta)
    const redirectURL = await getPaymentRedirectURL(extractUserOrgRole(org.id, res.locals.authenticatedUser))
    redirectURL.searchParams.append('id', payment.id)
    await updatePaymentRedirectURL(payment.id, redirectURL.toString())
    await txnRepo.create(null, {
      userId: res.locals.authenticatedUser.id,
      organizationId: org.id,
      paymentId: payment.id,
      credits: pkg.credits,
      verified: false,
      type: TransactionType.TopUp,
      amount: pkg.price,
    })
    return res.status(200).json(responseBase(payment.checkoutURL))
  }

  public purchaseSubscription = async (req: Request, res: Response, next: NextFunction): AsyncHandlerResponse => {
    const org = await orgsRepo.findById(null, Number(req.params.id))
    if (!org) return next(new NotFoundError('organization'))

    const subscriptionID = Number(req.params.sid)
    if (org.subscriptionId === subscriptionID) {
      return next(new PurchasePreconditionError('subscription already active'))
    }

    const subscription = await subscriptionsRepo.findById(null, subscriptionID)
    if (!subscription) return next(new NotFoundError('subscription'))

    if (!org.ppCustomerId) {
      org.ppCustomerId = await createCustomer(res.locals.authenticatedUser.name, res.locals.authenticatedUser.email)
      await orgsRepo.update(null, res.locals.authenticatedUser.id, { ppCustomerId: org.ppCustomerId })
    }

    const vat = config.get('vatRate')
    if (vat) {
      subscription.price = applyVAT(subscription.price, vat)
    }

    if (!org.ppCustomerId) {
      org.ppCustomerId = await createCustomer(res.locals.authenticatedUser.name, res.locals.authenticatedUser.email)
      await orgsRepo.update(null, res.locals.authenticatedUser.id, { ppCustomerId: org.ppCustomerId })
    }

    if (org.ppSubscriptionId) {
      await cancelSubscription(org.ppSubscriptionId, org.ppCustomerId)
      org.ppSubscriptionId = null
      org.subscriptionId = null
    }

    const meta = {
      organizationId: org.id,
      userId: res.locals.authenticatedUser.id,
      invoiceNotes: org.invoiceNotes ?? '',
    }

    const payment = await subscriptionFirstPayment(org.ppCustomerId, subscription, meta, false)
    const redirectURL = await getPaymentRedirectURL(extractUserOrgRole(org.id, res.locals.authenticatedUser))
    redirectURL.searchParams.append('id', payment.id)
    await updatePaymentRedirectURL(payment.id, redirectURL.toString())
    await txnRepo.create(null, {
      userId: res.locals.authenticatedUser.id,
      organizationId: org.id,
      paymentId: payment.id,
      credits: subscription.credits,
      verified: false,
      type: TransactionType.Consent,
      amount: payment.amount,
    })
    await orgsRepo.update(null, org.id, {
      subscriptionId: subscription.id,
    })

    return res.status(200).json(responseBase(payment.checkoutURL))
  }

  public updatePaymentInformation = async (req: Request, res: Response, next: NextFunction): AsyncHandlerResponse => {
    const org = await orgsRepo.findById(null, Number(req.params.id))
    if (!org) return next(new NotFoundError('organization'))

    if (!org.subscriptionId || !org.ppCustomerId){
      return next(new NotFoundError('subscription'))
    }

    const subscription = await subscriptionsRepo.findById(null, org.subscriptionId)
    if (!subscription) return next(new NotFoundError('subscription'))

    const meta = {
      organizationId: org.id,
      userId: res.locals.authenticatedUser.id,
      invoiceNotes: org.invoiceNotes ?? '',
    }

    subscription.price = 0
    subscription.credits = 0
    const payment = await subscriptionFirstPayment(org.ppCustomerId, subscription, meta, true)
    const redirectURL = new URL(config.get('apisuite.editPaymentMethodRedirectPath'), config.get('apisuite.portal'))
    redirectURL.searchParams.append('id', payment.id)
    await updatePaymentRedirectURL(payment.id, redirectURL.toString())
    await txnRepo.create(null, {
      userId: res.locals.authenticatedUser.id,
      organizationId: org.id,
      paymentId: payment.id,
      credits: subscription.credits,
      verified: false,
      type: TransactionType.Consent,
      amount: payment.amount,
    })

    return res.status(200).json(responseBase(payment.checkoutURL))
  }
}
