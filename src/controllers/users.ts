import { NextFunction, Request, Response, Router } from 'express'
import { AsyncHandlerResponse } from '../types'
import { BaseController, responseBase } from './base'
import {
  user as usersRepo,
  organization as orgsRepo,
} from '../models'
import {
  authenticated,
  isSelf,
  asyncWrap as aw,
  isAdmin,
  validator,
  isSelfOrAdmin,
  Introspection,
} from '../middleware/'
import { cancelSubscription, getSubscriptionNextPaymentDate } from '../payment-processing'
import { body, ValidationChain } from 'express-validator'
import { ForbiddenError, NotFoundError, UserInputError } from './errors'

export class UsersController implements BaseController {
  private readonly path = '/users'

  public getRouter(): Router {
    const router = Router()
    router.get(`${this.path}/:id`, authenticated, isSelfOrAdmin, aw(this.getUserDetails))
    router.patch(`${this.path}/:id`, authenticated, isAdmin, this.updateUserValidation, validator, aw(this.updateUser))
    router.put(`${this.path}/:id/organizations/:oid`, authenticated, isSelf, aw(this.setBillingOrganization))
    router.delete(`${this.path}/:id/subscriptions`, authenticated, isSelf, aw(this.cancelSubscription))
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
      billingOrganizationId: user.billingOrganizationId,
    }))
  }

  public cancelSubscription = async (req: Request, res: Response): AsyncHandlerResponse => {
    const user = await usersRepo.getOrBootstrapUser(null, Number(req.params.id))

    if (user.ppCustomerId && user.ppSubscriptionId) {
      await cancelSubscription(user.ppSubscriptionId, user.ppCustomerId)
    }

    await usersRepo.update(null, user.id, {
      subscriptionId: null,
      ppSubscriptionId: null,
    })
    return res.sendStatus(204)
  }

  public updateUser = async (req: Request, res: Response, next: NextFunction): AsyncHandlerResponse => {
    if (Number(req.params.id) === res.locals.authenticatedUser.id) {
      return next(new ForbiddenError('unable to manage own data'))
    }

    const user = await usersRepo.getOrBootstrapUser(null, Number(req.params.id))
    if (!user.billingOrganizationId) return next(new UserInputError(['missing billing organization']))

    await orgsRepo.updateCredits(null, user.billingOrganizationId, Number(req.body.credits || 0))

    return res.status(200).json(responseBase(user))
  }

  public setBillingOrganization = async (req: Request, res: Response, next: NextFunction): AsyncHandlerResponse => {
    const authUser = res.locals.authenticatedUser as Introspection
    const userID = Number(req.params.id)
    const organizationID = Number(req.params.oid)

    if (userID !== authUser.id) return next(new ForbiddenError())
    if (!authUser.organizations.some((o) => o.id === organizationID)) return next(new ForbiddenError())

    const org = await orgsRepo.findById(null, organizationID)
    if (!org) return next(new NotFoundError('organization'))

    const user = await usersRepo.getOrBootstrapUser(null, userID)
    if (!user) return next(new NotFoundError('user'))

    await usersRepo.update(null, userID, {
      billingOrganizationId: organizationID,
    })

    return res.sendStatus(204)
  }
}
