import { Request, Response, Router } from 'express'
import { AsyncHandlerResponse } from '../types'
import config from '../config'
import { BaseController, responseBase } from './base'
import { asyncWrap as aw, authenticated } from '../middleware'

export class SettingsController implements BaseController {
  private readonly path = '/settings'

  public getRouter(): Router {
    const router = Router()

    router.get(
      this.path,
      authenticated,
      aw(this.getSettings))

    return router
  }

  public getSettings = async (req: Request, res: Response): AsyncHandlerResponse => {
    const vat = config.get('vatRate')
    return res.status(200).json(responseBase({
      vatRate: vat === 0 ? null : vat,
    }))
  }
}
