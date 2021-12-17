import { NextFunction, Request, Response, Router } from 'express'
import { decorateRouter } from '@awaitjs/express'
import { db, SortOrder } from '../db'
import { AsyncHandlerResponse } from '../types'
import { BaseController, responseBase } from './base'
import { NotFoundError } from './errors'
import { pkg as pkgsRepo } from '../models'
import { authenticated, isAdmin, validate } from '../middleware'
import { query, body, ValidationChain, param } from 'express-validator'
import { SortFields } from '../models/package'
import config from '../config'
import { applyVAT } from '../vat'

export class PackagesController implements BaseController {
  private readonly path = '/packages'

  public getRouter(): Router {
    const router = decorateRouter(Router())

    router.getAsync(
      this.path,
      authenticated,
      validate(this.packagesParamsValidations),
      this.getPackages,
    )

    router.getAsync(
      `${this.path}/:id`,
      authenticated,
      validate(this.idValidation),
      this.getPackage,
    )

    router.postAsync(
      this.path,
      authenticated,
      isAdmin,
      validate(this.packagePayloadValidation),
      this.createPackage,
    )

    router.putAsync(
      `${this.path}/:id`,
      authenticated,
      isAdmin,
      validate([
        ...this.idValidation,
        ...this.packagePayloadValidation,
      ]),
      this.updatePackage,
    )

    router.deleteAsync(`${this.path}/:id`,
      authenticated,
      isAdmin,
      validate(this.idValidation),
      this.deletePackage,
    )

    return router
  }

  readonly idValidation: ValidationChain[] = [
    param('id').isNumeric(),
  ]

  readonly packagesParamsValidations: ValidationChain[] = [
    query('sort_by').optional().isIn(['name', 'price', 'credits']),
    query('order').optional().isIn(['asc', 'desc']),
  ]

  readonly packagePayloadValidation: ValidationChain[] = [
    body('name').isString(),
    body('price').isNumeric(),
    body('credits')
      .isNumeric({ no_symbols: true })
      .isInt({ min: 0 }),
  ]

  public getPackages = async (req: Request, res: Response): AsyncHandlerResponse => {
    let plans = await pkgsRepo.findAll(null, {
      field: req.query.sort_by as SortFields || SortFields.PRICE,
      order: req.query.order as SortOrder || SortOrder.ASC,
    })

    const vat = config.get('vatRate')
    if (vat) {
      plans = plans.map((m) => {
        m.price = applyVAT(m.price, vat)
        return m
      })
    }

    return res.status(200).json(responseBase(plans))
  }

  public getPackage = async (req: Request, res: Response, next: NextFunction): AsyncHandlerResponse => {
    const pkg = await pkgsRepo.findById(null, Number(req.params.id))
    if (!pkg) return next(new NotFoundError('package'))

    const vat = config.get('vatRate')
    if (vat) {
      pkg.price = applyVAT(pkg.price, vat)
    }

    return res.status(200).json(responseBase(pkg))
  }

  public createPackage = async (req: Request, res: Response): AsyncHandlerResponse => {
    const pkg = await pkgsRepo.create(null, {
      name: req.body.name,
      price: req.body.price,
      credits: req.body.credits,
    })

    return res.status(201).json(responseBase(pkg))
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
