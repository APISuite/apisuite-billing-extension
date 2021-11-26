import { NextFunction, Request, Response, Router } from 'express'
import { AsyncHandlerResponse } from '../types'
import { BaseController, responseBase } from './base'
import { organization as orgsRepo } from '../models'
import { authenticated, asyncWrap as aw, isAdmin, validator } from '../middleware'
import { cancelSubscription, getSubscriptionNextPaymentDate } from '../payment-processing'
import { body, ValidationChain } from 'express-validator'
import { NotFoundError } from './errors'

export class OrganizationsController implements BaseController {
  private readonly path = '/organizations'

  public getRouter(): Router {
    const router = Router()
    router.post(this.path, authenticated, isAdmin, this.createOrgValidation, validator, aw(this.createOrganization))
    router.get(`${this.path}/:id`, authenticated, isAdmin, aw(this.getOrganizationDetails))
    router.delete(`${this.path}/:id/subscriptions`, authenticated, isAdmin, aw(this.cancelSubscription))
    router.patch(`${this.path}/:id`, authenticated, isAdmin, this.updOrgValidation, validator, aw(this.updateOrganizationCredits))
    router.patch(`${this.path}/:id/invoice-notes`, authenticated, isAdmin, this.updOrgInvoiceNotesValidation, validator, aw(this.updateOrganizationInvoiceNotes))
    return router
  }

  readonly createOrgValidation: ValidationChain[] = [
    body('id').isNumeric(),
    body('credits').isNumeric(),
  ]

  readonly updOrgValidation: ValidationChain[] = [
    body('credits').optional().isNumeric(),
  ]

  readonly updOrgInvoiceNotesValidation: ValidationChain[] = [
    body('invoiceNotes').exists(),
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
      id: org.id,
      subscriptionId: org.subscriptionId,
      credits: org.credits,
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

  public updateOrganizationCredits = async (req: Request, res: Response, next: NextFunction): AsyncHandlerResponse => {
    let org = await orgsRepo.findById(null, Number(req.params.id))
    if (!org) return next(new NotFoundError('organization'))

    org = await orgsRepo.update(null, org.id, {
      credits: org.credits + Number(req.body.credits || 0),
    })

    return res.status(200).json(responseBase(org))
  }

  public updateOrganizationInvoiceNotes = async (req: Request, res: Response, next: NextFunction): AsyncHandlerResponse => {
    let org = await orgsRepo.findById(null, Number(req.params.id))
    if (!org) return next(new NotFoundError('organization'))

    org = await orgsRepo.update(null, org.id, {
      invoiceNotes: req.body.invoiceNotes,
    })

    return res.status(200).json(responseBase(org))
  }
}
