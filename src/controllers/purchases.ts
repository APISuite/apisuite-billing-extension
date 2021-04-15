import { NextFunction, Request, Response, Router } from 'express'
import { body, } from 'express-validator'
import { AsyncHandlerResponse } from '../types'
import { BaseController } from './base'
import {
  plan as plansRepo,
  transaction as txnRepo,
} from '../models'
import { Plan } from '../models/plan'
import { authenticated, asyncWrap as aw, validator } from '../middleware'
import { topUpPayment } from '../payment-processing'

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
      // TODO subscriptions
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
}
