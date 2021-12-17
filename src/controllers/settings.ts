import { Request, Response, Router } from 'express'
import { decorateRouter } from '@awaitjs/express'
import { AsyncHandlerResponse } from '../types'
import config from '../config'
import { BaseController, responseBase } from './base'
import { authenticated } from '../middleware'

export class SettingsController implements BaseController {
  private readonly path = '/settings'

  public getRouter(): Router {
    const router = decorateRouter(Router())

    router.getAsync(
      this.path,
      authenticated,
      this.getSettings)

    return router
  }

  public getSettings = async (req: Request, res: Response): AsyncHandlerResponse => {
    const vat = config.get('vatRate')
    return res.status(200).json(responseBase({
      vatRate: vat === 0 ? null : vat,
    }))
  }
}
