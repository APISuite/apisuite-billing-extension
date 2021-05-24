import { NextFunction, Request, Response, Router } from 'express'
import { AsyncHandlerResponse } from '../types'
import { BaseController, responseBase } from './base'
import { transaction as txnRepo, user as usersRepo } from '../models'
import { authenticated, isSelf, asyncWrap as aw, isAdmin, validator } from '../middleware/'
import { createCustomer, firstPayment, cancelSubscription, getSubscriptionNextPaymentDate } from '../payment-processing'
import { TransactionType } from '../models/transaction'
import { db } from '../db'
import { body, ValidationChain } from 'express-validator'

export class UsersController implements BaseController {
  private readonly path = '/users'

  public getRouter(): Router {
    const router = Router()
    router.get(`${this.path}/:id`, authenticated, isSelf, aw(this.getUserDetails))
    router.post(`${this.path}/:id/consent`, authenticated, isSelf, aw(this.setupConsent))
    router.delete(`${this.path}/:id/subscriptions`, authenticated, isSelf, aw(this.cancelSubscription))
    router.patch(`${this.path}/:id`,
      authenticated,
      isAdmin,
      this.getUpdateUserValidations(),
      validator,
      aw(this.updateUser))
    return router
  }

  private getUpdateUserValidations = (): ValidationChain[] => ([
    body('credits').optional().isNumeric(),
  ])

  public getUserDetails = async (req: Request, res: Response): AsyncHandlerResponse => {
    const user = await usersRepo.getOrBootstrapUser(null, Number(req.params.id))
    let nextPaymentDate
    if (user.ppSubscriptionId && user.ppCustomerId) {
      nextPaymentDate = await getSubscriptionNextPaymentDate(user.ppSubscriptionId, user.ppCustomerId)
    }
    return res.status(200).json(responseBase({
      id: user.id,
      subscriptionId: user.ppSubscriptionId ? user.subscriptionId : null,
      credits: user.credits,
      nextPaymentDate,
    }))
  }

  public setupConsent = async (req: Request, res: Response, next: NextFunction): AsyncHandlerResponse => {
    const trx = await db.transaction()
    try {
      const userID = Number(req.params.id)
      const user = await usersRepo.getOrBootstrapUser(trx, userID)

      if (!user.ppCustomerId) {
        const customerId = await createCustomer({
          email: res.locals.authenticatedUser.email,
          name: res.locals.authenticatedUser.name,
        })

        await usersRepo.update(trx, userID, {
          ppCustomerId: customerId,
        })
        user.ppCustomerId = customerId
      }

      const payment = await firstPayment(user.ppCustomerId, 0)

      await txnRepo.create(trx, {
        userId: res.locals.authenticatedUser.id,
        paymentId: payment.id,
        credits: 0,
        verified: false,
        type: TransactionType.Consent,
        amount: payment.amount,
      })
      await usersRepo.update(trx, userID, {
        ppMandateId: payment.mandateId,
      })
      await trx.commit()
      return res.status(200).json(responseBase(payment.checkoutURL))
    } catch(err) {
      await trx.rollback()
      next(err)
    }
  }

  public cancelSubscription = async (req: Request, res: Response): AsyncHandlerResponse => {
    const user = await usersRepo.getOrBootstrapUser(null, Number(req.params.id))

    if (!user.ppCustomerId || !user.ppSubscriptionId || !user.subscriptionId) return res.sendStatus(204)

    await cancelSubscription(user.ppSubscriptionId, user.ppCustomerId)
    await usersRepo.update(null, user.id, {
      subscriptionId: null,
      ppSubscriptionId: null,
    })
    return res.sendStatus(204)
  }

  public updateUser = async (req: Request, res: Response): AsyncHandlerResponse => {
    if (req.params.id === res.locals.authenticatedUser.id) {
      return res.status(403).json({ errors: ['unable to manage own data'] })
    }

    let user = await usersRepo.getOrBootstrapUser(null, Number(req.params.id))
    user = await usersRepo.update(null, user.id, {
      credits: user.credits + Number(req.body.credits || 0),
    })

    return res.status(200).json(responseBase(user))
  }
}
