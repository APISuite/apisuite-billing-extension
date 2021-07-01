import { Request, Response, Router } from 'express'
import { AsyncHandlerResponse } from '../types'
import { BaseController, responseBase } from './base'
import { user as usersRepo } from '../models'
import { authenticated, isSelf, asyncWrap as aw, isAdmin, validator, isSelfOrAdmin } from '../middleware/'
import { cancelSubscription, getSubscriptionNextPaymentDate } from '../payment-processing'
import { body, ValidationChain } from 'express-validator'

export class UsersController implements BaseController {
  private readonly path = '/users'

  public getRouter(): Router {
    const router = Router()
    router.get(`${this.path}/:id`, authenticated, isSelfOrAdmin, aw(this.getUserDetails))
    router.delete(`${this.path}/:id/subscriptions`, authenticated, isSelf, aw(this.cancelSubscription))
    router.patch(`${this.path}/:id`,
      authenticated,
      isAdmin,
      this.updateUserValidation,
      validator,
      aw(this.updateUser))
    return router
  }

  readonly updateUserValidation: ValidationChain[] = [
    body('credits').optional().isNumeric(),
  ]

  public getUserDetails = async (req: Request, res: Response): AsyncHandlerResponse => {
    const user = await usersRepo.getOrBootstrapUser(null, Number(req.params.id))
    let nextPaymentDate = null
    if (user.ppSubscriptionId && user.ppCustomerId) {
      nextPaymentDate = await getSubscriptionNextPaymentDate(user.ppSubscriptionId, user.ppCustomerId)
    }
    return res.status(200).json(responseBase({
      id: user.id,
      subscriptionId: user.subscriptionId,
      credits: user.credits,
      nextPaymentDate,
    }))
  }

  public cancelSubscription = async (req: Request, res: Response): AsyncHandlerResponse => {
    const user = await usersRepo.getOrBootstrapUser(null, Number(req.params.id))

    if (!user.ppCustomerId || !user.ppSubscriptionId || !user.subscriptionId) return res.sendStatus(204)

    await cancelSubscription(user.ppSubscriptionId, user.ppCustomerId)
    await usersRepo.update(null, user.id, {
      subscriptionId: null,
      ppSubscriptionId: null,
    })
    return res.sendStatus(204)
  }

  public updateUser = async (req: Request, res: Response): AsyncHandlerResponse => {
    if (Number(req.params.id) === res.locals.authenticatedUser.id) {
      return res.status(403).json({ errors: ['unable to manage own data'] })
    }

    let user = await usersRepo.getOrBootstrapUser(null, Number(req.params.id))
    user = await usersRepo.update(null, user.id, {
      credits: user.credits + Number(req.body.credits || 0),
    })

    return res.status(200).json(responseBase(user))
  }
}
