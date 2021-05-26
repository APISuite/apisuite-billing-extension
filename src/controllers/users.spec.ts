import sinon from 'sinon'
import request from 'supertest'
import express, { NextFunction, Request, Response } from 'express'
import { UsersController } from './users'
import { user as usersRepo } from '../models'
import { error } from '../middleware'
import * as paymentProcessing from '../payment-processing'

describe('users controller', () => {
  const injectUser = (req: Request, res: Response, next: NextFunction) => {
    res.locals.authenticatedUser = {
      id: 1,
      role: { name: 'admin' },
    }
    next()
  }

  afterEach(() => sinon.restore())

  describe('get user details', () => {
    const controller = new UsersController()
    const testApp = express()
      .use(injectUser)
      .use(controller.getRouter())
      .use(error)

    it('should return 200 when getting user', (done) => {
      sinon.stub(usersRepo, 'getOrBootstrapUser').resolves({
        id: 1,
        credits: 100,
        subscriptionId: null,
        ppCustomerId: null,
        ppMandateId: null,
        ppSubscriptionId: null,
      })

      request(testApp)
        .get('/users/1')
        .expect('Content-Type', /json/)
        .expect(200)
        .then(() => done())
        .catch((err: Error) => done(err))
    })
  })

  describe('cancel subscription', () => {
    const controller = new UsersController()
    const testApp = express()
      .use(injectUser)
      .use(controller.getRouter())
      .use(error)

    it('should return 204 when user has no customerID', (done) => {
      sinon.stub(usersRepo, 'getOrBootstrapUser').resolves({
        id: 1,
        credits: 100,
        subscriptionId: 1,
        ppCustomerId: null,
        ppMandateId: 'mid',
        ppSubscriptionId: 'sid',
      })

      request(testApp)
        .delete('/users/1/subscriptions')
        .expect(204)
        .then(() => done())
        .catch((err: Error) => done(err))
    })

    it('should return 204 when user has no subscription', (done) => {
      sinon.stub(usersRepo, 'getOrBootstrapUser').resolves({
        id: 1,
        credits: 100,
        subscriptionId: 1,
        ppCustomerId: 'cid',
        ppMandateId: 'mid',
        ppSubscriptionId: null,
      })

      request(testApp)
        .delete('/users/1/subscriptions')
        .expect(204)
        .then(() => done())
        .catch((err: Error) => done(err))
    })

    it('should return 204 when user has no plan', (done) => {
      sinon.stub(usersRepo, 'getOrBootstrapUser').resolves({
        id: 1,
        credits: 100,
        subscriptionId: null,
        ppCustomerId: 'cid',
        ppMandateId: 'mid',
        ppSubscriptionId: 'sid',
      })

      request(testApp)
        .delete('/users/1/subscriptions')
        .expect(204)
        .then(() => done())
        .catch((err: Error) => done(err))
    })

    it('should return 204 when subscription is cancelled', (done) => {
      sinon.stub(usersRepo, 'getOrBootstrapUser').resolves({
        id: 1,
        credits: 100,
        subscriptionId: 1,
        ppCustomerId: 'cid',
        ppMandateId: 'mid',
        ppSubscriptionId: 'sid',
      })
      sinon.stub(paymentProcessing, 'cancelSubscription').resolves()
      sinon.stub(usersRepo, 'update').resolves()

      request(testApp)
        .delete('/users/1/subscriptions')
        .expect(204)
        .then(() => done())
        .catch((err: Error) => done(err))
    })

    it('should return 500 when subscription cancellation fails', (done) => {
      sinon.stub(usersRepo, 'getOrBootstrapUser').resolves({
        id: 1,
        credits: 100,
        subscriptionId: 1,
        ppCustomerId: 'cid',
        ppMandateId: 'mid',
        ppSubscriptionId: 'sid',
      })
      sinon.stub(paymentProcessing, 'cancelSubscription').rejects()

      request(testApp)
        .delete('/users/1/subscriptions')
        .expect(500)
        .expect('Content-Type', /json/)
        .then(() => done())
        .catch((err: Error) => done(err))
    })
  })
})
