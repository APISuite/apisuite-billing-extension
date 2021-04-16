import sinon from 'sinon'
import { expect } from 'chai'
import express, { Request, Response, NextFunction } from 'express'
import request from 'supertest'
import { error } from '../middleware'
import {
  plan as plansRepo,
  transaction as txnRepo, user as usersRepo,
} from '../models'
import { PurchasesController } from './purchases'
import * as paymentProcessing from '../payment-processing'

describe('purchases controller', () => {
  const injectUser = (req: Request, res: Response, next: NextFunction) => {
    res.locals.authenticatedUser = { id: 1 }
    next()
  }

  afterEach(() => sinon.restore())

  describe('purchase plan validation', () => {
    const controller = new PurchasesController()
    const testApp = express()
      .use(express.json())
      .use(injectUser)
      .use(controller.getRouter())
      .use(error)

    it('should return 400 when planId is invalid', (done) => {
      request(testApp)
        .post('/purchases')
        .send({ planId: 'notAPlanId' })
        .expect('Content-Type', /json/)
        .expect(400)
        .then((res) => {
          expect(res.body.errors).to.be.an('array')
          done()
        })
        .catch((err: Error) => done(err))
    })

    it('should return 404 when plan is does not exist', (done) => {
      sinon.stub(plansRepo, 'findById').resolves(null)

      request(testApp)
        .post('/purchases')
        .send({ planId: 666 })
        .expect('Content-Type', /json/)
        .expect(404)
        .then((res) => {
          expect(res.body.error).to.be.a('string')
          done()
        })
        .catch((err: Error) => done(err))
    })
  })

  describe('purchase top up', () => {
    const controller = new PurchasesController()
    const testApp = express()
      .use(express.json())
      .use(injectUser)
      .use(controller.getRouter())
      .use(error)

    it('should return 302 when purchasing a top up', (done) => {
      sinon.stub(plansRepo, 'findById').resolves({
        id: 99,
        name: '5k creds',
        price: 123,
        credits: 5000,
        periodicity: null,
      })
      sinon.stub(txnRepo, 'create').resolves()
      sinon.stub(paymentProcessing, 'topUpPayment').resolves({
        id: 'payment-id-12345',
        checkoutURL: 'https://redirected.here',
      })

      request(testApp)
        .post('/purchases')
        .send({ planId: 99 })
        .expect(302)
        .then(() => done())
        .catch((err: Error) => done(err))
    })
  })

  describe('purchase subscription', () => {
    const controller = new PurchasesController()
    const testApp = express()
      .use(express.json())
      .use(injectUser)
      .use(controller.getRouter())
      .use(error)

    beforeEach(() => {
      sinon.stub(plansRepo, 'findById').resolves({
        id: 99,
        name: '5k creds',
        price: 123,
        credits: 5000,
        periodicity: '1 month',
      })
    })

    it('should return 400 when user has no customer id', (done) => {
      sinon.stub(usersRepo, 'getOrBootstrapUser').resolves({
        id: 1,
        credits: 100,
        planId: null,
        customerId: null,
        mandateId: 'x-mandate-1234',
        subscriptionId: null,
      })

      request(testApp)
        .post('/purchases')
        .send({ planId: 99 })
        .expect(400)
        .expect('Content-Type', /json/)
        .then(() => done())
        .catch((err: Error) => done(err))
    })

    it('should return 400 when user has no mandate id', (done) => {
      sinon.stub(usersRepo, 'getOrBootstrapUser').resolves({
        id: 1,
        credits: 100,
        planId: null,
        customerId: 'x-customer-1234',
        mandateId: null,
        subscriptionId: null,
      })

      request(testApp)
        .post('/purchases')
        .send({ planId: 99 })
        .expect(400)
        .expect('Content-Type', /json/)
        .then(() => done())
        .catch((err: Error) => done(err))
    })

    it('should return 400 when user has active subscription', (done) => {
      sinon.stub(usersRepo, 'getOrBootstrapUser').resolves({
        id: 1,
        credits: 100,
        planId: null,
        customerId: 'x-customer-1234',
        mandateId: 'x-mandate-1234',
        subscriptionId: 'x-subscription-1234',
      })

      request(testApp)
        .post('/purchases')
        .send({ planId: 99 })
        .expect(400)
        .expect('Content-Type', /json/)
        .then(() => done())
        .catch((err: Error) => done(err))
    })

    it('should return 400 when user mandate is invalid', (done) => {
      sinon.stub(usersRepo, 'getOrBootstrapUser').resolves({
        id: 1,
        credits: 100,
        planId: null,
        customerId: 'x-customer-1234',
        mandateId: 'x-mandate-1234',
        subscriptionId: 'x-subscription-1234',
      })
      sinon.stub(paymentProcessing, 'isMandateValid').resolves(false)

      request(testApp)
        .post('/purchases')
        .send({ planId: 99 })
        .expect(400)
        .expect('Content-Type', /json/)
        .then(() => done())
        .catch((err: Error) => done(err))
    })

    it('should return 204 when subscription is successfully created', (done) => {
      sinon.stub(usersRepo, 'getOrBootstrapUser').resolves({
        id: 1,
        credits: 100,
        planId: null,
        customerId: 'x-customer-1234',
        mandateId: 'x-mandate-1234',
        subscriptionId: null,
      })
      sinon.stub(paymentProcessing, 'isMandateValid').resolves(true)
      sinon.stub(paymentProcessing, 'subscriptionPayment').resolves('sub-id')
      sinon.stub(usersRepo, 'update').resolves()

      request(testApp)
        .post('/purchases')
        .send({ planId: 99 })
        .expect(204)
        .then(() => done())
        .catch((err: Error) => done(err))
    })

    it('should return 500 when subscription payment fails', (done) => {
      sinon.stub(usersRepo, 'getOrBootstrapUser').resolves({
        id: 1,
        credits: 100,
        planId: null,
        customerId: 'x-customer-1234',
        mandateId: 'x-mandate-1234',
        subscriptionId: null,
      })
      sinon.stub(paymentProcessing, 'isMandateValid').resolves(true)
      sinon.stub(paymentProcessing, 'subscriptionPayment').rejects()

      request(testApp)
        .post('/purchases')
        .send({ planId: 99 })
        .expect(500)
        .then(() => done())
        .catch((err: Error) => done(err))
    })
  })
})
