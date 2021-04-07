import { Request, Response, Router } from 'express'
import { AsyncHandlerResponse } from '../types'
import { BaseController } from './base'
import { IPlansRepository } from '../models'
import { authenticated } from '../middleware/'
import { topUpPayment } from '../payment-processing'

export class PurchasesController implements BaseController {
  private readonly path = '/purchases'
  private readonly plansRepo: IPlansRepository

  constructor(plansRepo: IPlansRepository) {
    this.plansRepo = plansRepo
  }

  public getRouter(): Router {
    const router = Router()
    router.post(`${this.path}/`, authenticated, this.purchasePlan)
    return router
  }

  public purchasePlan = async (req: Request, res: Response): AsyncHandlerResponse => {
    const plan = await this.plansRepo.findById(trx, Number(req.body.planId))

    if (!plan) {
      return res.status(404).json({
        error: 'plan not found',
      })
    }

    let redirectURL
    if (plan.periodicity) {
      // TODO subscriptions
    } else {
      redirectURL = await this.purchaseTopUp(plane)
    }

    return res.status(302).redirect(payment.checkoutURL)
  }

  private purchaseTopUp = (plan: Plan): string => {
    const payment = await topUpPayment(plan.price, plan.name)
    // TODO store payment.id
  }
}
