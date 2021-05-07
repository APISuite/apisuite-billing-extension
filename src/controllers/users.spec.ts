import sinon from 'sinon'
import request from 'supertest'
import express, { NextFunction, Request, Response } from 'express'
import { UsersController } from './users'
import {
  user as usersRepo,
  transaction as txnRepo,
} from '../models'
import { error } from '../middleware'
import * as paymentProcessing from '../payment-processing'
import { db } from '../db'

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

  describe('user payment consent', () => {
    const controller = new UsersController()
    const testApp = express()
      .use(injectUser)
      .use(controller.getRouter())
      .use(error)

    beforeEach(() => {
      sinon.stub(db, 'transaction').resolves({
        commit: sinon.stub(),
        rollback: sinon.stub(),
      })
    })

    it('should return 200 when the user already has a customerID', (done) => {
      sinon.stub(usersRepo, 'getOrBootstrapUser').resolves({
        id: 1,
        credits: 100,
        subscriptionId: null,
        ppCustomerId: 'fakeid',
        ppMandateId: null,
        ppSubscriptionId: null,
      })
      sinon.stub(paymentProcessing, 'firstPayment').resolves({
        checkoutURL: 'someURL',
        id: 'paymentid',
        mandateId: 'mandateId',
        amount: 0,
      })
      sinon.stub(txnRepo, 'create').resolves()
      sinon.stub(usersRepo, 'update').resolves()

      request(testApp)
        .post('/users/1/consent')
        .expect(200)
        .then(() => done())
        .catch((err: Error) => done(err))
    })

    it('should return 200 and setup customer when the user has no customerID', (done) => {
      sinon.stub(usersRepo, 'getOrBootstrapUser').resolves({
        id: 1,
        credits: 100,
        subscriptionId: null,
        ppCustomerId: null,
        ppMandateId: null,
        ppSubscriptionId: null,
      })
      sinon.stub(paymentProcessing, 'createCustomer').resolves('fakeCustomerId')
      sinon.stub(paymentProcessing, 'firstPayment').resolves({
        checkoutURL: 'someURL',
        id: 'paymentid',
        mandateId: 'mandateId',
        amount: 0,
      })
      sinon.stub(txnRepo, 'create').resolves()
      sinon.stub(usersRepo, 'update').resolves()

      request(testApp)
        .post('/users/1/consent')
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

    it('should return 204 when user has non matching plan', (done) => {
      sinon.stub(usersRepo, 'getOrBootstrapUser').resolves({
        id: 1,
        credits: 100,
        subscriptionId: 999,
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
