import sinon from 'sinon'
import { expect } from 'chai'
import express, { Request, Response, NextFunction } from 'express'
import request from 'supertest'
import { error } from '../middleware'
import {
  pkg as pkgsRepo,
  subscription as subscriptionsRepo,
  transaction as txnRepo,
  user as usersRepo,
} from '../models'
import { PurchasesController } from './purchases'
import * as paymentProcessing from '../payment-processing'
import * as core from '../core'

describe('purchases controller', () => {
  const injectUser = (req: Request, res: Response, next: NextFunction) => {
    res.locals.authenticatedUser = {
      id: 1,
      role: { name: 'developer' },
    }
    next()
  }

  afterEach(() => sinon.restore())

  describe('get purchases', () => {
    const controller = new PurchasesController()
    const testApp = express()
      .use(injectUser)
      .use(controller.getRouter())
      .use(error)

    it('should return 200 and empty purchases list when user has no customer id', (done) => {
      sinon.stub(usersRepo, 'findById').resolves({
        id: 1,
        ppCustomerId: null,
        ppMandateId: null,
        ppSubscriptionId: null,
        credits: 100,
        subscriptionId: null,
      })
      sinon.stub(paymentProcessing, 'listCustomerPayments').resolves([])

      request(testApp)
        .get('/purchases')
        .expect('Content-Type', /json/)
        .expect(200)
        .then((res) => {
          expect(res.body.data).to.be.an('array')
          done()
        })
        .catch((err: Error) => done(err))
    })

    it('should return 200 and purchases list', (done) => {
      sinon.stub(usersRepo, 'findById').resolves({
        id: 1,
        ppCustomerId: null,
        ppMandateId: null,
        ppSubscriptionId: null,
        credits: 100,
        subscriptionId: null,
      })
      sinon.stub(paymentProcessing, 'listCustomerPayments').resolves([])

      request(testApp)
        .get('/purchases')
        .expect('Content-Type', /json/)
        .expect(200)
        .then((res) => {
          expect(res.body.data).to.be.an('array')
          done()
        })
        .catch((err: Error) => done(err))
    })
  })

  describe('purchase top up', () => {
    const controller = new PurchasesController()
    const testApp = express()
      .use(injectUser)
      .use(controller.getRouter())
      .use(error)

    it('should return 404 when plan does not exist', (done) => {
      sinon.stub(usersRepo, 'getOrBootstrapUser').resolves({
        id: 1,
        credits: 100,
        subscriptionId: null,
        ppCustomerId: 'x-customer-id-123',
        ppMandateId: null,
        ppSubscriptionId: null,
      })
      sinon.stub(pkgsRepo, 'findById').resolves(null)

      request(testApp)
        .post('/purchases/packages/666')
        .expect('Content-Type', /json/)
        .expect(404)
        .then((res) => {
          expect(res.body.errors).to.be.an('array')
          done()
        })
        .catch((err: Error) => done(err))
    })

    it('should return 200 when purchasing a top up', (done) => {
      sinon.stub(core, 'getPaymentRedirectURL').resolves(new URL('http://localhost:3000'))
      sinon.stub(usersRepo, 'getOrBootstrapUser').resolves({
        id: 1,
        credits: 100,
        subscriptionId: null,
        ppCustomerId: 'x-customer-id-123',
        ppMandateId: null,
        ppSubscriptionId: null,
      })
      sinon.stub(pkgsRepo, 'findById').resolves({
        id: 99,
        name: '5k creds',
        price: 123,
        credits: 5000,
      })
      sinon.stub(txnRepo, 'create').resolves()
      sinon.stub(paymentProcessing, 'updatePaymentRedirectURL').resolves()
      sinon.stub(paymentProcessing, 'topUpPayment').resolves({
        id: 'payment-id-12345',
        checkoutURL: 'https://redirected.here',
      })

      request(testApp)
        .post('/purchases/packages/99')
        .send({ planId: 99 })
        .expect(200)
        .then(() => done())
        .catch((err: Error) => done(err))
    })

    it('should return 200 when purchasing a top up (user has no customer id)', (done) => {
      sinon.stub(core, 'getPaymentRedirectURL').resolves(new URL('http://localhost:3000'))
      sinon.stub(usersRepo, 'getOrBootstrapUser').resolves({
        id: 1,
        credits: 100,
        subscriptionId: null,
        ppCustomerId: null,
        ppMandateId: null,
        ppSubscriptionId: null,
      })
      sinon.stub(paymentProcessing, 'createUser').resolves('custmr-id')
      sinon.stub(usersRepo, 'update').resolves()
      sinon.stub(pkgsRepo, 'findById').resolves({
        id: 99,
        name: '5k creds',
        price: 123,
        credits: 5000,
      })
      sinon.stub(txnRepo, 'create').resolves()
      sinon.stub(paymentProcessing, 'updatePaymentRedirectURL').resolves()
      sinon.stub(paymentProcessing, 'topUpPayment').resolves({
        id: 'payment-id-12345',
        checkoutURL: 'https://redirected.here',
      })

      request(testApp)
        .post('/purchases/packages/99')
        .send({ planId: 99 })
        .expect(200)
        .then(() => done())
        .catch((err: Error) => done(err))
    })
  })

  describe('purchase subscription', () => {
    const controller = new PurchasesController()
    const testApp = express()
      .use(injectUser)
      .use(controller.getRouter())
      .use(error)

    const mockSubscription = {
      id: 99,
      name: '5k creds',
      price: 123,
      credits: 5000,
      periodicity: '1 month',
    }

    it('should return 404 when subscription does not exist', (done) => {
      sinon.stub(usersRepo, 'getOrBootstrapUser').resolves({
        id: 1,
        credits: 100,
        subscriptionId: null,
        ppCustomerId: null,
        ppMandateId: null,
        ppSubscriptionId: null,
      })
      sinon.stub(subscriptionsRepo, 'findById').resolves(null)

      request(testApp)
        .post('/purchases/subscriptions/666')
        .expect('Content-Type', /json/)
        .expect(404)
        .then((res) => {
          expect(res.body.errors).to.be.an('array')
          done()
        })
        .catch((err: Error) => done(err))
    })

    it('should return 400 when subscription is already active', (done) => {
      sinon.stub(usersRepo, 'getOrBootstrapUser').resolves({
        id: 1,
        credits: 100,
        subscriptionId: 99,
        ppCustomerId: 'x-customer-1234',
        ppMandateId: 'x-mandate-1234',
        ppSubscriptionId: 'x-subscription-1234',
      })

      request(testApp)
        .post('/purchases/subscriptions/99')
        .expect(400)
        .expect('Content-Type', /json/)
        .then(() => done())
        .catch((err: Error) => done(err))
    })

    it('should return 200 when first subscription payment is successfully created', (done) => {
      sinon.stub(core, 'getPaymentRedirectURL').resolves(new URL('http://localhost:3000'))
      sinon.stub(usersRepo, 'getOrBootstrapUser').resolves({
        id: 1,
        credits: 100,
        subscriptionId: null,
        ppCustomerId: null,
        ppMandateId: null,
        ppSubscriptionId: null,
      })
      sinon.stub(subscriptionsRepo, 'findById').resolves(mockSubscription)
      sinon.stub(paymentProcessing, 'createUser').resolves('customerid123')
      sinon.stub(usersRepo, 'update').resolves()
      sinon.stub(paymentProcessing, 'findValidMandate').resolves(null)
      sinon.stub(paymentProcessing, 'updatePaymentRedirectURL').resolves()
      sinon.stub(paymentProcessing, 'subscriptionFirstPayment').resolves({
        id: 'pmntid',
        amount: 123,
        checkoutURL: 'url',
        mandateId: 'mmm',
      })
      sinon.stub(txnRepo, 'create').resolves()

      request(testApp)
        .post('/purchases/subscriptions/99')
        .expect(200)
        .then(() => done())
        .catch((err: Error) => done(err))
    })

    it('should return 200 when first subscription payment is successfully created (existing customer)', (done) => {
      sinon.stub(core, 'getPaymentRedirectURL').resolves(new URL('http://localhost:3000'))
      sinon.stub(usersRepo, 'getOrBootstrapUser').resolves({
        id: 1,
        credits: 100,
        subscriptionId: null,
        ppCustomerId: 'xcustomerid',
        ppMandateId: null,
        ppSubscriptionId: null,
      })
      sinon.stub(subscriptionsRepo, 'findById').resolves(mockSubscription)
      sinon.stub(usersRepo, 'update').resolves()
      sinon.stub(paymentProcessing, 'findValidMandate').resolves(null)
      sinon.stub(paymentProcessing, 'updatePaymentRedirectURL').resolves()
      sinon.stub(paymentProcessing, 'subscriptionFirstPayment').resolves({
        id: 'pmntid',
        amount: 123,
        checkoutURL: 'url',
        mandateId: 'mmm',
      })
      sinon.stub(txnRepo, 'create').resolves()

      request(testApp)
        .post('/purchases/subscriptions/99')
        .expect(200)
        .then(() => done())
        .catch((err: Error) => done(err))
    })

    it('should return 204 when subscription is successfully created (existing customer)', (done) => {
      sinon.stub(usersRepo, 'getOrBootstrapUser').resolves({
        id: 1,
        credits: 100,
        subscriptionId: null,
        ppCustomerId: 'xcustomerid',
        ppMandateId: null,
        ppSubscriptionId: null,
      })
      sinon.stub(subscriptionsRepo, 'findById').resolves(mockSubscription)
      sinon.stub(usersRepo, 'update').resolves()
      sinon.stub(paymentProcessing, 'findValidMandate').resolves('xmandateid')
      sinon.stub(paymentProcessing, 'subscriptionPayment').resolves('xsubid')

      request(testApp)
        .post('/purchases/subscriptions/99')
        .expect(204)
        .then(() => done())
        .catch((err: Error) => done(err))
    })

    it('should return 204 when subscription is successfully created (existing customer, subscription change)', (done) => {
      sinon.stub(usersRepo, 'getOrBootstrapUser').resolves({
        id: 1,
        credits: 100,
        subscriptionId: null,
        ppCustomerId: 'xcustomerid',
        ppMandateId: null,
        ppSubscriptionId: 'mysubid',
      })
      sinon.stub(subscriptionsRepo, 'findById').resolves(mockSubscription)
      sinon.stub(usersRepo, 'update').resolves()
      sinon.stub(paymentProcessing, 'findValidMandate').resolves('xmandateid')
      sinon.stub(paymentProcessing, 'subscriptionPayment').resolves('xsubid')
      sinon.stub(paymentProcessing, 'cancelSubscription').resolves()

      request(testApp)
        .post('/purchases/subscriptions/99')
        .expect(204)
        .then(() => done())
        .catch((err: Error) => done(err))
    })

    it('should return 500 when subscription payment fails', (done) => {
      sinon.stub(subscriptionsRepo, 'findById').resolves(mockSubscription)
      sinon.stub(usersRepo, 'getOrBootstrapUser').resolves({
        id: 1,
        credits: 100,
        subscriptionId: null,
        ppCustomerId: 'x-customer-1234',
        ppMandateId: 'x-mandate-1234',
        ppSubscriptionId: null,
      })
      sinon.stub(paymentProcessing, 'isMandateValid').resolves(true)
      sinon.stub(paymentProcessing, 'cancelSubscription').resolves()
      sinon.stub(paymentProcessing, 'subscriptionPayment').rejects()

      request(testApp)
        .post('/purchases/subscriptions/99')
        .expect(500)
        .then(() => done())
        .catch((err: Error) => done(err))
    })
  })
})
