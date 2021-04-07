import { Request, Response, Router } from 'express'
import { AsyncHandlerResponse } from '../types'
import { BaseController } from './base'
import { IPlansRepository, IUsersRepository, Plan } from '../models'
import { authenticated } from '../middleware/'
import { topUpPayment } from '../payment-processing'

export class PurchasesController implements BaseController {
  private readonly path = '/purchases'
  private readonly plansRepo: IPlansRepository
  private readonly usersRepo: IUsersRepository

  constructor(
    plansRepo: IPlansRepository,
    usersRepo: IUsersRepository,
    ) {
    this.plansRepo = plansRepo
    this.usersRepo = usersRepo
  }

  public getRouter(): Router {
    const router = Router()
    router.post(`${this.path}/`, authenticated, this.purchasePlan)
    return router
  }

  public purchasePlan = async (req: Request, res: Response): AsyncHandlerResponse => {
    const plan = await this.plansRepo.findById(null, Number(req.body.planId))

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
    await this.usersRepo.savePayment(null, userId, payment.id, plan.credits)
    return payment.checkoutURL
  }
}
