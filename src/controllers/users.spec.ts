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
        planId: null,
        customerId: null,
        mandateId: null,
        subscriptionId: null,
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

    it('should return 302 when the user already has a customerID', (done) => {
      sinon.stub(usersRepo, 'getOrBootstrapUser').resolves({
        id: 1,
        credits: 100,
        planId: null,
        customerId: 'fakeid',
        mandateId: null,
        subscriptionId: null,
      })
      sinon.stub(usersRepo, 'update').resolves()
      sinon.stub(paymentProcessing, 'firstPayment').resolves({
        checkoutURL: 'someURL',
        id: 'paymentid',
        mandateId: 'mandateId',
      })

      request(testApp)
        .post('/users/1/consent')
        .expect(302)
        .then(() => done())
        .catch((err: Error) => done(err))
    })

    it('should return 302 and setup customer when the user has no customerID', (done) => {
      sinon.stub(usersRepo, 'getOrBootstrapUser').resolves({
        id: 1,
        credits: 100,
        planId: null,
        customerId: null,
        mandateId: null,
        subscriptionId: null,
      })
      sinon.stub(paymentProcessing, 'createCustomer').resolves('fakeCustomerId')
      sinon.stub(usersRepo, 'update').resolves()
      sinon.stub(paymentProcessing, 'firstPayment').resolves({
        checkoutURL: 'someURL',
        id: 'paymentid',
        mandateId: 'mandateId',
      })

      request(testApp)
        .post('/users/1/consent')
        .expect(302)
        .then(() => done())
        .catch((err: Error) => done(err))
    })
  })
})
