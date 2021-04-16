import { Request, Response, Router } from 'express'
import { AsyncHandlerResponse } from '../types'
import { BaseController } from './base'
import { user as usersRepo } from '../models'
import { authenticated, isSelf, asyncWrap as aw } from '../middleware/'
import { createCustomer, firstPayment } from '../payment-processing'

export class UsersController implements BaseController {
  private readonly path = '/users'

  public getRouter(): Router {
    const router = Router()
    router.get(`${this.path}/:id`, authenticated, isSelf, aw(this.getUserDetails))
    router.post(`${this.path}/:id/consent`, authenticated, isSelf, aw(this.setupConsent))
    return router
  }

  public getUserDetails = async (req: Request, res: Response): AsyncHandlerResponse => {
    const user = await usersRepo.getOrBootstrapUser(null, Number(req.params.id))

    return res.status(200).json({
      data: user,
    })
  }

  public setupConsent = async (req: Request, res: Response): AsyncHandlerResponse => {
    const userID = Number(req.params.id)
    const user = await usersRepo.getOrBootstrapUser(null, userID)

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
    await usersRepo.update(null, userID, {
      mandateId: payment.mandateId,
    })
    return res.status(302).redirect(payment.checkoutURL)
  }
}
