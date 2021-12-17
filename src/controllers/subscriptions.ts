import { NextFunction, Request, Response, Router } from 'express'
import { decorateRouter } from '@awaitjs/express'
import { db, SortOrder } from '../db'
import { AsyncHandlerResponse } from '../types'
import { BaseController, responseBase } from './base'
import { NotFoundError } from './errors'
import { subscription as subscriptionsRepo } from '../models'
import { authenticated, isAdmin, validate } from '../middleware'
import { body, param, query, ValidationChain } from 'express-validator'
import { SortFields } from '../models/subscription'
import config from "../config"
import { applyVAT } from "../vat"

export class SubscriptionsController implements BaseController {
  private readonly path = '/subscriptions'

  public getRouter(): Router {
    const router = decorateRouter(Router())

    router.getAsync(
      this.path,
      authenticated,
      validate(this.subscriptionsParamsValidation),
      this.getSubscriptions,
    )

    router.getAsync(
      `${this.path}/:id`,
      authenticated,
      validate(this.idValidation),
      this.getSubscription,
    )

    router.postAsync(
      this.path,
      authenticated,
      isAdmin,
      validate(this.subscriptionPayloadValidation),
      this.createSubscription,
    )

    router.putAsync(
      `${this.path}/:id`,
      authenticated,
      isAdmin,
      validate([
        ...this.idValidation,
        ...this.subscriptionPayloadValidation,
      ]),
      this.updateSubscription,
    )

    router.deleteAsync(
      `${this.path}/:id`,
      authenticated,
      isAdmin,
      validate(this.idValidation),
      this.deleteSubscription,
    )

    return router
  }

  readonly idValidation: ValidationChain[] = [
    param('id').isNumeric(),
  ]

  readonly subscriptionsParamsValidation: ValidationChain[] = [
    query('sort_by').optional().isIn(['name', 'price', 'credits']),
    query('order').optional().isIn(['asc', 'desc']),
  ]

  readonly subscriptionPayloadValidation: ValidationChain[] = [
    body('name').isString(),
    body('price').isNumeric(),
    body('credits').isNumeric({ no_symbols: true }),
    body('periodicity').isString(),
  ]

  public getSubscriptions = async (req: Request, res: Response): AsyncHandlerResponse => {
    let subscriptions = await subscriptionsRepo.findAll(null, {
      field: req.query.sort_by as SortFields || SortFields.PRICE,
      order: req.query.order as SortOrder || SortOrder.ASC,
    })

    const vat = config.get('vatRate')
    if (vat) {
      subscriptions = subscriptions.map((s) => {
        s.price = applyVAT(s.price, vat)
        return s
      })
    }

    return res.status(200).json(responseBase(subscriptions))
  }

  public getSubscription = async (req: Request, res: Response, next: NextFunction): AsyncHandlerResponse => {
    const subscription = await subscriptionsRepo.findById(null, Number(req.params.id))

    if (!subscription) {
      return next(new NotFoundError('subscription'))
    }

    const vat = config.get('vatRate')
    if (vat) {
      subscription.price = applyVAT(subscription.price, vat)
    }

    return res.status(200).json(responseBase(subscription))
  }

  public createSubscription = async (req: Request, res: Response, next: NextFunction): AsyncHandlerResponse => {
    try {
      const subscription = await subscriptionsRepo.create(null, {
        name: req.body.name,
        price: req.body.price,
        credits: req.body.credits,
        periodicity: req.body.periodicity,
      })

      return res.status(201).json(responseBase(subscription))
    } catch (err) {
      next(err)
    }
  }

  public updateSubscription = async (req: Request, res: Response, next: NextFunction): AsyncHandlerResponse => {
    const trx = await db.transaction()
    try {
      let subscription = await subscriptionsRepo.findById(trx, Number(req.params.id))

      if (!subscription) {
        await trx.rollback()
        return next(new NotFoundError('subscription'))
      }

      subscription = await subscriptionsRepo.update(trx, subscription.id, req.body)

      await trx.commit()

      return res.status(200).json(responseBase(subscription))
    } catch (err) {
      await trx.rollback()
      next(err)
    }
  }

  public deleteSubscription = async (req: Request, res: Response): AsyncHandlerResponse => {
    await subscriptionsRepo.deleteSubscription(null, Number(req.params.id))
    return res.sendStatus(204)
  }
}
