import sinon from 'sinon'
import request from 'supertest'
import express, { NextFunction, Request, Response } from 'express'
import { UsersController } from './users'
import { user as usersRepo } from '../models'
import { error } from '../middleware'
import * as paymentProcessing from '../payment-processing'
import {expect} from "chai"

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
      .use(express.json())
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
        invoiceNotes: null,
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

    it('should return 204 when user has no customerID/subscriptionID', (done) => {
      sinon.stub(usersRepo, 'getOrBootstrapUser').resolves({
        id: 1,
        credits: 100,
        subscriptionId: 1,
        ppCustomerId: null,
        ppMandateId: null,
        ppSubscriptionId: 'sid',
        invoiceNotes: null,
      })
      sinon.stub(usersRepo, 'update').resolves()

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
        subscriptionId: null,
        ppCustomerId: null,
        ppMandateId: null,
        ppSubscriptionId: null,
        invoiceNotes: null,
      })
      sinon.stub(paymentProcessing, 'cancelSubscription').resolves()
      sinon.stub(usersRepo, 'update').resolves()

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
        invoiceNotes: null,
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
        invoiceNotes: null,
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

  describe('patch user details', () => {
    const controller = new UsersController()
    const testApp = express()
      .use(injectUser)
      .use(express.json())
      .use(controller.getRouter())
      .use(error)

    it('should return 403 when user updates own data', (done) => {
      request(testApp)
        .patch('/users/1')
        .expect('Content-Type', /json/)
        .expect(403)
        .then((res) => {
          expect(res.body.errors).to.be.an('array')
          done()
        })
        .catch((err: Error) => done(err))
    })

    it('should return 400 when payload is invalid', (done) => {
      request(testApp)
        .patch('/users/9')
        .send({
          credits: 'xxx10',
        })
        .expect('Content-Type', /json/)
        .expect(400)
        .then((res) => {
          expect(res.body.errors).to.be.an('array')
          done()
        })
        .catch((err: Error) => done(err))
    })

    it('should return 200 when user updates own data', (done) => {
      sinon.stub(usersRepo, 'getOrBootstrapUser').resolves({
        id: 9,
        credits: 100,
        subscriptionId: 1,
        ppCustomerId: 'cid',
        ppMandateId: 'mid',
        ppSubscriptionId: null,
        invoiceNotes: null,
      })
      sinon.stub(usersRepo, 'update').resolves()

      request(testApp)
        .patch('/users/9')
        .send({
          credits: 10,
        })
        .expect('Content-Type', /json/)
        .expect(200)
        .then(() => done())
        .catch((err: Error) => done(err))
    })
  })
})
