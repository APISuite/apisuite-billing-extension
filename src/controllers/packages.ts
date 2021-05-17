import { NextFunction, Request, Response, Router } from 'express'
import { db, SortOrder } from '../db'
import { AsyncHandlerResponse } from '../types'
import { BaseController, responseBase } from './base'
import { NotFoundError } from './errors'
import { pkg as pkgsRepo } from '../models'
import { asyncWrap as aw, authenticated, isAdmin, validator } from '../middleware'
import { query, ValidationChain } from 'express-validator'
import { SortFields } from '../models/package'

export class PackagesController implements BaseController {
  private readonly path = '/packages'

  public getRouter(): Router {
    const router = Router()
    router.get(`${this.path}`, authenticated, this.getPackagesParamsValidations(), validator, aw(this.getPackages))
    router.get(`${this.path}/:id`, authenticated, aw(this.getPackage))
    router.post(`${this.path}`, authenticated, isAdmin, aw(this.createPackage))
    router.put(`${this.path}/:id`, authenticated, isAdmin, aw(this.updatePackage))
    router.delete(`${this.path}/:id`, authenticated, isAdmin, aw(this.deletePackage))
    return router
  }

  private getPackagesParamsValidations = (): ValidationChain[] => ([
    query('sort_by').optional().isIn(['name', 'price', 'credits']),
    query('order').optional().isIn(['asc', 'desc']),
  ])

  public getPackages = async (req: Request, res: Response): AsyncHandlerResponse => {
    const plans = await pkgsRepo.findAll(null, {
      field: req.query.sort_by as SortFields || SortFields.PRICE,
      order: req.query.order as SortOrder || SortOrder.ASC,
    })

    return res.status(200).json(responseBase(plans))
  }

  public getPackage = async (req: Request, res: Response, next: NextFunction): AsyncHandlerResponse => {
    const plan = await pkgsRepo.findById(null, Number(req.params.id))

    if (!plan) {
      return next(new NotFoundError('package'))
    }

    return res.status(200).json(responseBase(plan))
  }

  public createPackage = async (req: Request, res: Response, next: NextFunction): AsyncHandlerResponse => {
    try {
      const pkg = await pkgsRepo.create(null, {
        name: req.body.name,
        price: req.body.price,
        credits: req.body.credits,
      })

      return res.status(201).json(responseBase(pkg))
    } catch (err) {
      next(err)
    }
  }

  public updatePackage = async (req: Request, res: Response, next: NextFunction): AsyncHandlerResponse => {
    const trx = await db.transaction()
    try {
      let pkg = await pkgsRepo.findById(trx, Number(req.params.id))

      if (!pkg) {
        await trx.rollback()
        return next(new NotFoundError('package'))
      }

      pkg = await pkgsRepo.update(trx, pkg.id, req.body)

      await trx.commit()

      return res.status(200).json(responseBase(pkg))
    } catch (err) {
      await trx.rollback()
      next(err)
    }
  }

  public deletePackage = async (req: Request, res: Response): AsyncHandlerResponse => {
    await pkgsRepo.deletePackage(null, Number(req.params.id))
    return res.sendStatus(204)
  }
}
