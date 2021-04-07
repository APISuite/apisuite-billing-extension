import { Request, Response, Router } from 'express'
import { db } from '../db'
import log from '../log'
import { AsyncHandlerResponse } from '../types'
import { BaseController } from './base'
import { IPlansRepository } from '../models'
import { authenticated } from '../middleware/'

export class PlansController implements BaseController {
  private readonly path = '/plans'
  private readonly plansRepo: IPlansRepository

  constructor(plansRepo: IPlansRepository) {
    this.plansRepo = plansRepo
  }

  public getRouter(): Router {
    const router = Router()
    // TODO admin middleware
    router.get(`${this.path}/`, authenticated, this.getPlans)
    router.get(`${this.path}/:id`, authenticated, this.getPlan)
    router.post(`${this.path}/:id`, authenticated, this.createPlan)
    router.put(`${this.path}/:id`, authenticated, this.updatePlan)
    router.delete(`${this.path}/:id`, authenticated, this.deletePlan)
    return router
  }

  public getPlans = async (req: Request, res: Response): AsyncHandlerResponse => {
    const plans = await this.plansRepo.findAll(null)

    return res.status(200).json({
      data: plans,
    })
  }

  public getPlan = async (req: Request, res: Response): AsyncHandlerResponse => {
    const plan = await this.plansRepo.findById(null, Number(req.params.id))

    if (!plan) {
      return res.status(404).json({
        error: 'plan not found',
      })
    }

    return res.status(200).json({
      data: plan,
    })
  }

  public createPlan = async (req: Request, res: Response): AsyncHandlerResponse => {
    const plan = await this.plansRepo.create(null, {
      name: req.body.name,
      price: req.body.price,
      credits: req.body.credits,
      periodicity: req.body.periodicity,
    })

    return res.status(201).json({
      data: plan,
    })
  }

  public updatePlan = async (req: Request, res: Response): AsyncHandlerResponse => {
    const trx = await db.transaction()
    try {
      let plan = await this.plansRepo.findById(trx, Number(req.params.id))

      if (!plan) {
        return res.status(404).json({
          error: 'plan not found',
        })
      }

      plan = await this.plansRepo.update(trx, plan.id, req.body)

      await trx.commit()

      return res.status(200).json({
        data: plan,
      })
    } catch (err) {
      log.error(err)
      await trx.rollback()
      return res.status(500).json({
        error: 'could not create user plan subscription',
      })
    }
  }

  public deletePlan = async (req: Request, res: Response): AsyncHandlerResponse => {
    const trx = await db.transaction()
    try {
      const plan = await this.plansRepo.findById(trx, Number(req.params.id))

      if (!plan) {
        return res.status(404).json({
          error: 'plan not found',
        })
      }

      await this.plansRepo.delete(trx, plan.id)

      await trx.commit()

      return res.sendStatus(204)
    } catch (err) {
      log.error(err)
      await trx.rollback()
      return res.status(500).json({
        error: 'could not create user plan subscription',
      })
    }
  }
}
