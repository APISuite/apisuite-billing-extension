import { Request, Response, Router } from 'express'
import mollie, { SequenceType } from '@mollie/api-client'
import { db } from '../db'
import log from '../log'
import config from '../config'
import { AsyncHandlerResponse } from '../types'
import { BaseController } from './base'
import { IPlansRepository, IUsersRepository } from '../models'
import { authenticated, isSelf } from '../middleware/'
import { findValidMandate, createCustomer } from '../payment-processing'

export class UsersController implements BaseController {
  private readonly path = '/users'
  private readonly usersRepo: IUsersRepository
  private readonly plansRepo: IPlansRepository

  constructor(
    usersRepo: IUsersRepository,
    plansRepo: IPlansRepository,
  ) {
    this.usersRepo = usersRepo
    this.plansRepo = plansRepo
  }

  public getRouter(): Router {
    const router = Router()
    router.get(`${this.path}/:id`, authenticated, this.getUserDetails)
    router.post(`${this.path}/:id/plans/:planId`, authenticated, isSelf, this.subscribePlan)
    return router
  }

  public getUserDetails = async (req: Request, res: Response): AsyncHandlerResponse => {
    let user = await this.usersRepo.findById(null, Number(req.params.id))

    if (!user) {
      user = await this.usersRepo.create(null, {
        id: res.locals.authenticatedUser.id,
        credits: 100,
        planId: null,
      })
    }

    return res.status(200).json({
      data: user,
    })
  }

  public subscribePlan = async (req: Request, res: Response): AsyncHandlerResponse => {
    const trx = await db.transaction()
    try {
      const mollieClient = mollie({
        apiKey: config.get('mollie.apiKey'),
      })

      const plan = await this.plansRepo.findById(trx, Number(req.params.planId))

      if (!plan) {
        return res.status(404).json({
          error: 'plan not found',
        })
      }

      const uid = Number(req.params.id)
      let user = await this.usersRepo.findById(trx, uid)

      if (!user) {
        user = await this.usersRepo.create(trx, {
          id: uid,
          credits: plan.credits,
          planId: plan.id,
        })
      }

      if (!user.customerId) {
        const customerId = await createCustomer({
          email: res.locals.authenticatedUser.email,
          name: res.locals.authenticatedUser.name,
        })
        user = await this.usersRepo.update(trx, user.id, {
          customerId: customerId,
        })
      }

      if (!user.customerId) throw Error('could not create mollie customer')

      const mandateId = await findValidMandate(user.customerId)

      const payment = await mollieClient.payments.create({
        amount: {
          currency: 'EUR',
          value: plan.price.toString(),
        },
        // mandateId: mandateId,
        description: 'API Suite marketplace subscription setup',  // TODO config this
        sequenceType: SequenceType.first,
        webhookUrl: config.get('mollie.webhookUrl'),
        redirectUrl: config.get('mollie.paymentRedirectUrl'),
      })

      // TODO create subscription

      await trx.commit()

      return res.status(200).json({
        data: user,
      })
    } catch (err) {
      log.error(err)
      await trx.rollback()
      return res.status(500).json({
        error: 'could not create user plan subscription',
      })
    }
  }
}
