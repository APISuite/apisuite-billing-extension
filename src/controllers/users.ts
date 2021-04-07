import { Request, Response, Router } from 'express'
import { AsyncHandlerResponse } from '../types'
import { BaseController } from './base'
import { IPlansRepository, IUsersRepository, ISettingsRepository, SettingKeys } from '../models'
import { authenticated, isSelf } from '../middleware/'

export class UsersController implements BaseController {
  private readonly path = '/users'
  private readonly usersRepo: IUsersRepository
  private readonly plansRepo: IPlansRepository
  private readonly settingsRepo: ISettingsRepository

  constructor(
    usersRepo: IUsersRepository,
    plansRepo: IPlansRepository,
    settingsRepo: ISettingsRepository,
  ) {
    this.usersRepo = usersRepo
    this.plansRepo = plansRepo
    this.settingsRepo = settingsRepo
  }

  public getRouter(): Router {
    const router = Router()
    router.get(`${this.path}/:id`, authenticated, this.getUserDetails)
    return router
  }

  public getUserDetails = async (req: Request, res: Response): AsyncHandlerResponse => {
    const defaultCredits = Number(await this.settingsRepo.findByName(null, SettingKeys.DefaultCredits))

    let user = await this.usersRepo.findById(null, Number(req.params.id))

    if (!user) {
      user = await this.usersRepo.create(null, {
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
