import { Request, Response, Router } from 'express'
import { AsyncHandlerResponse } from '../types'
import { BaseController } from './base'
import {
  user as usersRepo,
  setting as settingsRepo,
} from '../models'
import { authenticated, isSelf, asyncWrap as aw } from '../middleware/'
import { createCustomer, firstPayment } from '../payment-processing'
import { User } from '../models/user'
import { SettingKeys } from '../models/setting'

export class UsersController implements BaseController {
  private readonly path = '/users'

  public getRouter(): Router {
    const router = Router()
    router.get(`${this.path}/:id`, authenticated, isSelf, aw(this.getUserDetails))
    router.post(`${this.path}/:id/consent`, authenticated, isSelf, aw(this.setupConsent))
    return router
  }

  public getUserDetails = async (req: Request, res: Response): AsyncHandlerResponse => {
    const user = await this.getOrBootstrapUser(Number(req.params.id))

    return res.status(200).json({
      data: user,
    })
  }

  public setupConsent = async (req: Request, res: Response): AsyncHandlerResponse => {
    const userID = Number(req.params.id)
    const user = await this.getOrBootstrapUser(userID)

    if (!user.customerId) {
      const customerId = await createCustomer({
        email: res.locals.authenticatedUser.email,
        name: res.locals.authenticatedUser.name,
      })

      await usersRepo.update(null, userID, {
        customerId,
      })
      user.customerId = customerId
    }

    const payment = await firstPayment(user.customerId)
    return res.status(302).redirect(payment.checkoutURL)
  }

  private getOrBootstrapUser = async (userID: number): Promise<User> => {
    const user = await usersRepo.findById(null, userID)
    if (user) return user

    const defaultCredits = Number(await settingsRepo.findByName(null, SettingKeys.DefaultCredits))

    return usersRepo.create(null, {
      id: userID,
      credits: defaultCredits,
      planId: null,
    })
  }
}
