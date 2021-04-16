import { Request, Response, Router } from 'express'
import { body } from 'express-validator'
import { AsyncHandlerResponse } from '../types'
import { BaseController, SubscriptionPreconditionError } from './base'
import {
  user as usersRepo,
  plan as plansRepo,
  transaction as txnRepo,
} from '../models'
import { Plan } from '../models/plan'
import { authenticated, asyncWrap as aw, validator } from '../middleware'
import { isMandateValid, subscriptionPayment, topUpPayment } from '../payment-processing'

export class PurchasesController implements BaseController {
  private readonly path = '/purchases'

  public getRouter(): Router {
    const router = Router()
    router.post(
      `${this.path}/`,
      authenticated,
      body('planId').isInt(),
      validator,
      aw(this.purchasePlan))
    return router
  }

  public purchasePlan = async (req: Request, res: Response): AsyncHandlerResponse => {
    const plan = await plansRepo.findById(null, Number(req.body.planId))

    if (!plan) {
      return res.status(404).json({
        error: 'plan not found',
      })
    }

    if (plan.periodicity) {
      await this.purchaseSubscription(res.locals.authenticatedUser.id, plan)
      return res.sendStatus(204)
    }

    const redirectURL = await this.purchaseTopUp(res.locals.authenticatedUser.id, plan)
    return res.status(302).redirect(redirectURL)
  }

  private purchaseTopUp = async (userId: number, plan: Plan): Promise<string> => {
    const payment = await topUpPayment(plan.price, plan.name)
    await txnRepo.create(null, {
      userId,
      paymentId: payment.id,
      credits: plan.credits,
    })
    return payment.checkoutURL
  }

  private purchaseSubscription = async (userId: number, plan: Plan): Promise<void> => {
    if (!plan.periodicity) {
      throw new Error('invalid subscription')
    }

    const user = await usersRepo.getOrBootstrapUser(null, userId)
    if (!user.customerId || !user.mandateId) {
      throw new SubscriptionPreconditionError('no valid payment method available')
    }

    if (user.subscriptionId) {
      throw new SubscriptionPreconditionError('user has active subscription')
    }

    if (!(await isMandateValid(user.mandateId, user.customerId))) {
      throw new SubscriptionPreconditionError('configured payment method is invalid')
    }

    const subscriptionId = await subscriptionPayment({
      customerId: user.customerId,
      mandateId: user.mandateId,
      price: plan.price,
      credits: plan.credits,
      description: plan.name,
      interval: plan.periodicity,
    })
    await usersRepo.update(null, userId, {
      planId: plan.id,
      subscriptionId,
    })
  }
}
