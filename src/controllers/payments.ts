import { Request, Response, Router } from 'express'
import { AsyncHandlerResponse } from '../types'
import { BaseController } from './base'
import { IUsersRepository } from '../models'
import { authenticated } from '../middleware/'

export class PaymentsController implements BaseController {
  private readonly path = '/payments'
  private readonly repo: IUsersRepository

  constructor(repo: IUsersRepository) {
    this.repo = repo
  }

  public getRouter(): Router {
    const router = Router()
    router.post(`${this.path}/webhook`, this.paymentSuccessWebhookHandler)
    return router
  }

  public paymentSuccessWebhookHandler = async (req: Request, res: Response): AsyncHandlerResponse => {
    console.log(req.body.id)

    return res.status(200).json({
      data: 'ok',
    })
  }
}
