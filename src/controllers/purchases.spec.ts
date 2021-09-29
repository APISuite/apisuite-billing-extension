import sinon from 'sinon'
import {expect} from 'chai'
import express, {NextFunction, Request, Response} from 'express'
import request from 'supertest'
import {error} from '../middleware'
import {pkg as pkgsRepo, subscription as subscriptionsRepo, transaction as txnRepo, user as usersRepo} from '../models'
import {PurchasesController} from './purchases'
import * as paymentProcessing from '../payment-processing'
import * as core from '../core'
import {TransactionType} from "../models/transaction"
import {PaymentMethod, PaymentStatus} from "@mollie/api-client"
import {body} from "express-validator";

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

  describe('get purchase', () => {
    const controller = new PurchasesController()
    const testApp = express()
      .use(injectUser)
      .use(controller.getRouter())
      .use(error)

    it('should return 404 when transaction not found', (done) => {
      sinon.stub(usersRepo, 'getOrBootstrapUser').resolves({
        id: 1,
        ppCustomerId: null,
        ppMandateId: null,
        ppSubscriptionId: null,
        credits: 100,
        subscriptionId: null,
      })
      sinon.stub(txnRepo, 'findById').resolves()

      request(testApp)
        .get('/purchases/123')
        .expect('Content-Type', /json/)
        .expect(404)
        .then((res) => {
          expect(res.body.errors).to.be.an('array')
          done()
        })
        .catch((err: Error) => done(err))
    })

    it('should return 403 when transaction belongs to another user', (done) => {
      sinon.stub(usersRepo, 'getOrBootstrapUser').resolves({
        id: 1,
        ppCustomerId: null,
        ppMandateId: null,
        ppSubscriptionId: null,
        credits: 100,
        subscriptionId: null,
      })
      sinon.stub(txnRepo, 'findById').resolves({
        userId: 999,
        credits: 100,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        paymentId: 'randompaymentid',
        type: TransactionType.TopUp,
        amount: 1000,
        verified: true,
      })

      request(testApp)
        .get('/purchases/1')
        .expect('Content-Type', /json/)
        .expect(403)
        .then((res) => {
          expect(res.body.errors).to.be.an('array')
          done()
        })
        .catch((err: Error) => done(err))
    })

    it('should return 404 when payment could not be fetched from PP', (done) => {
      sinon.stub(usersRepo, 'getOrBootstrapUser').resolves({
        id: 1,
        ppCustomerId: null,
        ppMandateId: null,
        ppSubscriptionId: null,
        credits: 100,
        subscriptionId: null,
      })
      sinon.stub(txnRepo, 'findById').resolves({
        userId: 1,
        credits: 100,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        paymentId: 'randompaymentid',
        type: TransactionType.TopUp,
        amount: 1000,
        verified: true,
      })
      sinon.stub(paymentProcessing, 'getPaymentDetails').resolves()

      request(testApp)
        .get('/purchases/1')
        .expect('Content-Type', /json/)
        .expect(404)
        .then((res) => {
          expect(res.body.errors).to.be.an('array')
          done()
        })
        .catch((err: Error) => done(err))
    })

    it('should return 200 when payment could not be fetched from PP', (done) => {
      sinon.stub(usersRepo, 'getOrBootstrapUser').resolves({
        id: 1,
        ppCustomerId: null,
        ppMandateId: null,
        ppSubscriptionId: null,
        credits: 100,
        subscriptionId: null,
      })
      sinon.stub(txnRepo, 'findById').resolves({
        userId: 1,
        credits: 100,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        paymentId: 'randompaymentid',
        type: TransactionType.TopUp,
        amount: 1000,
        verified: true,
      })
      sinon.stub(paymentProcessing, 'getPaymentDetails').resolves({
        id: 'randompaymentid',
        description: '',
        method: PaymentMethod.creditcard,
        status: PaymentStatus.authorized,
        createdAt: new Date().toISOString(),
        amount: {
          currency: 'EUR',
          value: '100',
        },
        metadata: {
          credits: 10,
          type: '',
        },
      })

      request(testApp)
        .get('/purchases/1')
        .expect('Content-Type', /json/)
        .expect(200)
        .then((res) => {
          expect(res.body.data).to.be.an('object')
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

    it('should return 200 when purchasing a top up and organization ID in body', (done) => {
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
          .send({body: { organizationId: 1}, planId: 99 })
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
      sinon.stub(paymentProcessing, 'createCustomer').resolves('custmr-id')
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
      .use(express.json())
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
      sinon.stub(paymentProcessing, 'createCustomer').resolves('customerid123')
      sinon.stub(usersRepo, 'update').resolves()
      sinon.stub(paymentProcessing, 'updatePaymentRedirectURL').resolves()
      sinon.stub(paymentProcessing, 'subscriptionFirstPayment').resolves({
        id: 'pmntid',
        amount: 123,
        checkoutURL: 'url',
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
      sinon.stub(paymentProcessing, 'updatePaymentRedirectURL').resolves()
      sinon.stub(paymentProcessing, 'subscriptionFirstPayment').resolves({
        id: 'pmntid',
        amount: 123,
        checkoutURL: 'url',
      })
      sinon.stub(txnRepo, 'create').resolves()

      request(testApp)
        .post('/purchases/subscriptions/99')
        .expect(200)
        .then(() => done())
        .catch((err: Error) => done(err))
    })

    it('should return 200 when first subscription payment is successfully created (existing customer) and organization ID in body', (done) => {
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
      sinon.stub(paymentProcessing, 'updatePaymentRedirectURL').resolves()
      sinon.stub(paymentProcessing, 'subscriptionFirstPayment').resolves({
        id: 'pmntid',
        amount: 123,
        checkoutURL: 'url',
      })
      sinon.stub(txnRepo, 'create').resolves()

      request(testApp)
          .post('/purchases/subscriptions/99')
          .send({body: { organizationId: 1}})
          .expect(200)
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
