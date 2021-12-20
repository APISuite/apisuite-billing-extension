import { NextFunction, Request, Response, Router } from 'express'
import { decorateRouter } from '@awaitjs/express'
import { AsyncHandlerResponse } from '../types'
import { BaseController, responseBase } from './base'
import {
  user as usersRepo,
  organization as orgsRepo,
} from '../models'
import {
  authenticated,
  isSelf,
  isAdmin,
  validate,
  isSelfOrAdmin,
  Introspection,
} from '../middleware/'
import { cancelSubscription, getSubscriptionNextPaymentDate } from '../payment-processing'
import { body, param, ValidationChain } from 'express-validator'
import { ForbiddenError, NotFoundError, UserInputError } from './errors'
import { isAdminCheck } from '../middleware'

export class UsersController implements BaseController {
  private readonly path = '/users'

  public getRouter(): Router {
    const router = decorateRouter(Router())

    router.getAsync(
      `${this.path}/:id`,
      authenticated, isSelfOrAdmin,
      validate(this.idValidation),
      this.getUserDetails,
    )

    router.patchAsync(
      `${this.path}/:id`,
      authenticated, isAdmin,
      validate(this.updateValidation),
      this.updateUser,
    )

    router.putAsync(
      `${this.path}/:id/organizations/:oid`,
      authenticated, isSelfOrAdmin,
      validate(this.setBillingOrgValidation),
      this.setBillingOrganization,
    )

    router.deleteAsync(
      `${this.path}/:id/subscriptions`,
      authenticated, isSelf,
      validate(this.idValidation),
      this.cancelSubscription,
    )

    return router
  }

  readonly idValidation: ValidationChain[] = [
    param('id').isNumeric(),
  ]

  readonly updateValidation: ValidationChain[] = [
    ...this.idValidation,
    body('credits').optional().isNumeric(),
  ]

  readonly setBillingOrgValidation: ValidationChain[] = [
    ...this.idValidation,
    param('oid').isNumeric(),
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

    if (!isAdminCheck(res)) {
      if (userID !== authUser.id) return next(new ForbiddenError())
      if (!authUser.organizations.some((o) => o.id === organizationID)) return next(new ForbiddenError())
    }

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
