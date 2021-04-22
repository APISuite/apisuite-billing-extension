import { NextFunction, Request, Response, Router } from 'express'
import { db } from '../db'
import { AsyncHandlerResponse } from '../types'
import { BaseController } from './base'
import { subscription as subscriptionsRepo } from '../models'
import { authenticated, isAdmin, asyncWrap as aw } from '../middleware'
import { DuplicateError } from '../models/errors'

export class SubscriptionsController implements BaseController {
  private readonly path = '/subscriptions'

  public getRouter(): Router {
    const router = Router()
    router.get(`${this.path}`, authenticated, aw(this.getSubscriptions))
    router.get(`${this.path}/:id`, authenticated, aw(this.getSubscription))
    router.post(`${this.path}`, authenticated, isAdmin, aw(this.createSubscription))
    router.put(`${this.path}/:id`, authenticated, isAdmin, aw(this.updateSubscription))
    router.delete(`${this.path}/:id`, authenticated, isAdmin, aw(this.deleteSubscription))
    return router
  }

  public getSubscriptions = async (req: Request, res: Response): AsyncHandlerResponse => {
    const subscriptions = await subscriptionsRepo.findAll(null)

    return res.status(200).json({
      data: subscriptions,
    })
  }

  public getSubscription = async (req: Request, res: Response): AsyncHandlerResponse => {
    const subscription = await subscriptionsRepo.findById(null, Number(req.params.id))

    if (!subscription) {
      return res.status(404).json({
        errors: ['subscription not found'],
      })
    }

    return res.status(200).json({
      data: subscription,
    })
  }

  public createSubscription = async (req: Request, res: Response, next: NextFunction): AsyncHandlerResponse => {
    try {
      const subscription = await subscriptionsRepo.create(null, {
        name: req.body.name,
        price: req.body.price,
        credits: req.body.credits,
        periodicity: req.body.periodicity,
      })

      return res.status(201).json({
        data: subscription,
      })
    } catch (err) {
      if (err instanceof DuplicateError) {
        return res.status(409).json({
          error: err.message,
        })
      }
      next(err)
    }
  }

  public updateSubscription = async (req: Request, res: Response, next: NextFunction): AsyncHandlerResponse => {
    const trx = await db.transaction()
    try {
      let subscription = await subscriptionsRepo.findById(trx, Number(req.params.id))

      if (!subscription) {
        return res.status(404).json({
          errors: ['subscription not found'],
        })
      }

      subscription = await subscriptionsRepo.update(trx, subscription.id, req.body)

      await trx.commit()

      return res.status(200).json({
        data: subscription,
      })
    } catch (err) {
      await trx.rollback()
      if (err instanceof DuplicateError) {
        return res.status(409).json({
          errors: [err.message],
        })
      }
      next(err)
    }
  }

  public deleteSubscription = async (req: Request, res: Response): AsyncHandlerResponse => {
    await subscriptionsRepo.deleteSubscription(null, Number(req.params.id))
    return res.sendStatus(204)
  }
}
