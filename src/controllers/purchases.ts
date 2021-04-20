import { Request, Response, Router } from 'express'
import { AsyncHandlerResponse } from '../types'
import { BaseController, SubscriptionPreconditionError } from './base'
import {
  user as usersRepo,
  pkg as pkgsRepo,
  subscription as subscriptionsRepo,
  transaction as txnRepo,
} from '../models'
import { authenticated, asyncWrap as aw } from '../middleware'
import { isMandateValid, subscriptionPayment, topUpPayment } from '../payment-processing'

export class PurchasesController implements BaseController {
  private readonly path = '/purchases'

  public getRouter(): Router {
    const router = Router()
    router.post(`${this.path}/packages/:id`, authenticated, aw(this.purchasePackage))
    router.post(`${this.path}/subscriptions/:id`, authenticated, aw(this.purchaseSubscription))
    return router
  }

  public purchasePackage = async (req: Request, res: Response): AsyncHandlerResponse => {
    const pkg = await pkgsRepo.findById(null, Number(req.params.id))

    if (!pkg) {
      return res.status(404).json({
        errors: ['package not found'],
      })
    }

    const payment = await topUpPayment(pkg.price, pkg.name)
    await txnRepo.create(null, {
      userId: res.locals.authenticatedUser.id,
      paymentId: payment.id,
      credits: pkg.credits,
    })
    return res.status(302).redirect(payment.checkoutURL)
  }

  public purchaseSubscription = async (req: Request, res: Response): AsyncHandlerResponse => {
    const user = await usersRepo.getOrBootstrapUser(null, res.locals.authenticatedUser.id)
    if (!user.ppCustomerId || !user.ppMandateId) {
      throw new SubscriptionPreconditionError('no valid payment method available')
    }

    if (user.ppSubscriptionId || user.subscriptionId) {
      throw new SubscriptionPreconditionError('user has active subscription')
    }

    const subscription = await subscriptionsRepo.findById(null, Number(req.params.id))
    if (!subscription) {
      return res.status(404).json({
        errors: ['subscription not found'],
      })
    }

    if (!(await isMandateValid(user.ppMandateId, user.ppCustomerId))) {
      throw new SubscriptionPreconditionError('configured payment method is invalid')
    }

    const subscriptionId = await subscriptionPayment({
      customerId: user.ppCustomerId,
      mandateId: user.ppMandateId,
      price: subscription.price,
      credits: subscription.credits,
      description: subscription.name,
      interval: subscription.periodicity,
    })
    await usersRepo.update(null, user.id, {
      subscriptionId: subscription.id,
      ppSubscriptionId: subscriptionId,
    })

    return res.sendStatus(204)
  }
}
