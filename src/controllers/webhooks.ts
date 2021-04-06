import { Request, Response, Router } from 'express'
import { AsyncHandlerResponse } from '../types'
import { BaseController } from './base'

export class WebhooksController implements BaseController {
  private readonly path = '/webhooks'

  public getRouter(): Router {
    const router = Router()
    router.post(`${this.path}/subscriptions`, this.subscriptionPaymentSuccess)
    return router
  }

  public subscriptionPaymentSuccess = async (req: Request, res: Response): AsyncHandlerResponse => {
    console.log(req.body)

    return res.status(200).json({
      data: 'ok',
    })
  }
}
