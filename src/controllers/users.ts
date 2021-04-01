import { Request, Response, Router } from 'express'
import { AsyncHandlerResponse } from '../types'
import { BaseController } from './base'
import { IUsersRepository } from '../models'
import { authenticated } from '../middleware/'

export class UsersController implements BaseController {
  private readonly path = '/users'
  private readonly repo: IUsersRepository

  constructor(repo: IUsersRepository) {
    this.repo = repo
  }

  public getRouter(): Router {
    const router = Router()
    router.get(`${this.path}/:id`, authenticated, this.getUserDetails)
    return router
  }

  public getUserDetails = async (req: Request, res: Response): AsyncHandlerResponse => {
    const user = await this.repo.findById(Number(req.params.id))

    if (!user) {
      return res.status(404).json({
        error: 'user not found',
      })
    }

    return res.status(200).json({
      data: user,
    })
  }
}
