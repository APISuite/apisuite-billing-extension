import { NextFunction, Request, Response, Router } from 'express'
import { decorateRouter } from '@awaitjs/express'
import { AsyncHandlerResponse } from '../types'
import { BaseController, responseBase } from './base'
import { organization as orgsRepo } from '../models'
import { authenticated, isAdmin, validate, isOrgOwner, Introspection } from '../middleware'
import { cancelSubscription, getSubscriptionNextPaymentDate } from '../payment-processing'
import { body, param, ValidationChain } from 'express-validator'
import { NotFoundError } from './errors'
import { OrgPurchasesController } from './organizations.purchases'

export class OrganizationsController implements BaseController {
  private readonly path = '/organizations'

  public getRouter(): Router {
    const router = decorateRouter(Router())

    router.postAsync(
      this.path,
      authenticated, isAdmin,
      validate(this.createOrgValidation),
      this.createOrganization,
    )

    router.getAsync(
      `${this.path}/:id`,
      authenticated, isAdmin,
      validate(this.idValidation),
      this.getOrganizationDetails,
    )

    router.deleteAsync(
      `${this.path}/:id/subscriptions`,
      authenticated, isAdmin,
      validate(this.idValidation),
      this.cancelSubscription,
    )

    router.patch(
      `${this.path}/:id`,
      authenticated, isOrgOwner,
      validate(this.updOrgValidation),
      this.updateOrganization,
    )

    const or = new OrgPurchasesController()
    router.use(`${this.path}/:id/purchases`, authenticated, isOrgOwner, or.getRouter())
    return router
  }

  readonly idValidation: ValidationChain[] = [
    param('id').isNumeric(),
  ]

  readonly createOrgValidation: ValidationChain[] = [
    body('id').isNumeric(),
    body('credits').isNumeric(),
  ]

  readonly updOrgValidation: ValidationChain[] = [
    ...this.idValidation,
    body('credits').optional().isNumeric(),
    body('invoiceNotes').optional().isString(),
  ]

  public createOrganization = async (req: Request, res: Response): AsyncHandlerResponse => {
    const org = await orgsRepo.create(null, {
      id: req.body.id,
      credits: req.body.credits,
    })

    return res.status(201).json(responseBase(org))
  }

  public getOrganizationDetails = async (req: Request, res: Response, next: NextFunction): AsyncHandlerResponse => {
    const org = await orgsRepo.findById(null, Number(req.params.id))
    if (!org) return next(new NotFoundError('organization'))

    let nextPaymentDate = null
    if (org.ppSubscriptionId && org.ppCustomerId) {
      nextPaymentDate = await getSubscriptionNextPaymentDate(org.ppSubscriptionId, org.ppCustomerId)
    }
    return res.status(200).json(responseBase({
      ...org,
      nextPaymentDate,
    }))
  }

  public cancelSubscription = async (req: Request, res: Response, next: NextFunction): AsyncHandlerResponse => {
    const org = await orgsRepo.findById(null, Number(req.params.id))
    if (!org) return next(new NotFoundError('organization'))

    if (org.ppCustomerId && org.ppSubscriptionId) {
      await cancelSubscription(org.ppSubscriptionId, org.ppCustomerId)
    }

    await orgsRepo.update(null, org.id, {
      subscriptionId: null,
      ppSubscriptionId: null,
    })
    return res.sendStatus(204)
  }

  public updateOrganization = async (req: Request, res: Response, next: NextFunction): AsyncHandlerResponse => {
    let org = await orgsRepo.findById(null, Number(req.params.id))
    if (!org) return next(new NotFoundError('organization'))

    if (req.body.credits !== undefined) {
      req.body.credits = org.credits + Number(req.body.credits || 0)
    }

    const usr: Introspection = res.locals.authenticatedUser
    const isAdmin = usr.organizations.some((o) => o.role.name === 'admin')
    if (!isAdmin) {
      delete req.body.credits
    }

    org = await orgsRepo.update(null, org.id, req.body)

    return res.status(200).json(responseBase(org))
  }
}
