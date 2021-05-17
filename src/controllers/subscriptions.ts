import { NextFunction, Request, Response, Router } from 'express'
import { db, SortOrder } from '../db'
import { AsyncHandlerResponse } from '../types'
import { BaseController, responseBase } from './base'
import { NotFoundError } from './errors'
import { subscription as subscriptionsRepo } from '../models'
import { authenticated, isAdmin, asyncWrap as aw, validator } from '../middleware'
import { query, ValidationChain } from 'express-validator'
import { SortFields } from '../models/subscription'

export class SubscriptionsController implements BaseController {
  private readonly path = '/subscriptions'

  public getRouter(): Router {
    const router = Router()
    router.get(`${this.path}`, authenticated, this.getSubscriptionsParamsValidations(), validator, aw(this.getSubscriptions))
    router.get(`${this.path}/:id`, authenticated, aw(this.getSubscription))
    router.post(`${this.path}`, authenticated, isAdmin, aw(this.createSubscription))
    router.put(`${this.path}/:id`, authenticated, isAdmin, aw(this.updateSubscription))
    router.delete(`${this.path}/:id`, authenticated, isAdmin, aw(this.deleteSubscription))
    return router
  }

  private getSubscriptionsParamsValidations = (): ValidationChain[] => ([
    query('sort_by').optional().isIn(['name', 'price', 'credits']),
    query('order').optional().isIn(['asc', 'desc']),
  ])

  public getSubscriptions = async (req: Request, res: Response): AsyncHandlerResponse => {
    const subscriptions = await subscriptionsRepo.findAll(null, {
      field: req.query.sort_by as SortFields || SortFields.PRICE,
      order: req.query.order as SortOrder || SortOrder.ASC,
    })

    return res.status(200).json(responseBase(subscriptions))
  }

  public getSubscription = async (req: Request, res: Response, next: NextFunction): AsyncHandlerResponse => {
    const subscription = await subscriptionsRepo.findById(null, Number(req.params.id))

    if (!subscription) {
      return next(new NotFoundError('subscription'))
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
