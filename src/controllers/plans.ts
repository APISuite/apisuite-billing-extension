import { NextFunction, Request, Response, Router } from 'express'
import { db } from '../db'
import { AsyncHandlerResponse } from '../types'
import { BaseController } from './base'
import { plan as plansRepo } from '../models'
import { authenticated, isAdmin, asyncWrap as aw } from '../middleware'
import { DuplicateError } from '../models/errors'

export class PlansController implements BaseController {
  private readonly path = '/plans'

  public getRouter(): Router {
    const router = Router()
    router.get(`${this.path}`, authenticated, isAdmin, aw(this.getPlans))
    router.get(`${this.path}/:id`, authenticated, isAdmin, aw(this.getPlan))
    router.post(`${this.path}`, authenticated, isAdmin, aw(this.createPlan))
    router.put(`${this.path}/:id`, authenticated, isAdmin, aw(this.updatePlan))
    router.delete(`${this.path}/:id`, authenticated, isAdmin, aw(this.deletePlan))
    return router
  }

  public getPlans = async (req: Request, res: Response): AsyncHandlerResponse => {
    const plans = await plansRepo.findAll(null)

    return res.status(200).json({
      data: plans,
    })
  }

  public getPlan = async (req: Request, res: Response): AsyncHandlerResponse => {
    const plan = await plansRepo.findById(null, Number(req.params.id))

    if (!plan) {
      return res.status(404).json({
        error: 'plan not found',
      })
    }

    return res.status(200).json({
      data: plan,
    })
  }

  public createPlan = async (req: Request, res: Response, next: NextFunction): AsyncHandlerResponse => {
    try {
      const plan = await plansRepo.create(null, {
        name: req.body.name,
        price: req.body.price,
        credits: req.body.credits,
        periodicity: req.body.periodicity,
      })

      return res.status(201).json({
        data: plan,
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

  public updatePlan = async (req: Request, res: Response, next: NextFunction): AsyncHandlerResponse => {
    const trx = await db.transaction()
    try {
      let plan = await plansRepo.findById(trx, Number(req.params.id))

      if (!plan) {
        return res.status(404).json({
          error: 'plan not found',
        })
      }

      plan = await plansRepo.update(trx, plan.id, req.body)

      await trx.commit()

      return res.status(200).json({
        data: plan,
      })
    } catch (err) {
      await trx.rollback()
      if (err instanceof DuplicateError) {
        return res.status(409).json({
          error: err.message,
        })
      }
      next(err)
    }
  }

  public deletePlan = async (req: Request, res: Response): AsyncHandlerResponse => {
    await plansRepo.deletePlan(null, Number(req.params.id))
    return res.sendStatus(204)
  }
}
