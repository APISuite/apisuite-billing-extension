import { Request, Response, Router } from 'express'
import { AsyncHandlerResponse } from '../types'
import { BaseController } from './base'
import {
  user as usersRepo,
  setting as settingsRepo,
} from '../models'
import { SettingKeys } from '../models/setting'
import { authenticated, isSelf } from '../middleware/'

export class UsersController implements BaseController {
  private readonly path = '/users'

  public getRouter(): Router {
    const router = Router()
    router.get(`${this.path}/:id`, authenticated, isSelf, this.getUserDetails)
    return router
  }

  public getUserDetails = async (req: Request, res: Response): AsyncHandlerResponse => {
    const defaultCredits = Number(await settingsRepo.findByName(null, SettingKeys.DefaultCredits))

    let user = await usersRepo.findById(null, Number(req.params.id))

    if (!user) {
      user = await usersRepo.create(null, {
        id: res.locals.authenticatedUser.id,
        credits: defaultCredits,
        planId: null,
      })
    }

    return res.status(200).json({
      data: user,
    })
  }
}
