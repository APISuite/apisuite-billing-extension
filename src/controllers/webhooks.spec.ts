import sinon from 'sinon'
import express from 'express'
import request from 'supertest'
import { WebhooksController } from './webhooks'
import { error } from '../middleware'
import {
  user as usersRepo,
  transaction as txnRepo,
  subscription as subscriptionsRepo,
} from '../models'
import * as paymentProcessing from '../payment-processing'
import { db } from '../db'
import { TransactionType } from '../models/transaction'

describe.only('webhooks controller', () => {
  describe('topup webhook', () => {
    afterEach(() => sinon.restore())

    const controller = new WebhooksController()
    const testApp = express()
      .use(express.urlencoded({ extended: true }))
      .use(controller.getRouter())
      .use(error)

    it('should return 400 when the payload is invalid', (done) => {
      request(testApp)
        .post('/webhooks/topup')
        .send('name=john')
        .expect('Content-Type', /json/)
        .expect(400)
        .then(() => done())
        .catch((err: Error) => done(err))
    })

    it('should return 500 when database connection fails', (done) => {
      sinon.stub(paymentProcessing, 'verifyPaymentSuccess').rejects()

      request(testApp)
        .post('/webhooks/topup')
        .send('id=randompaymentid')
        .expect(500)
        .expect('Content-Type', /json/)
        .then(() => done())
        .catch((err: Error) => done(err))
    })

    it('should return 200 when payment is not verified', (done) => {
      sinon.stub(paymentProcessing, 'verifyPaymentSuccess').resolves(null)

      request(testApp)
        .post('/webhooks/topup')
        .send('id=randompaymentid')
        .expect(200)
        .expect('Content-Type', /json/)
        .then(() => done())
        .catch((err: Error) => done(err))
    })

    it('should return 200 when payment is verified', (done) => {
      sinon.stub(paymentProcessing, 'verifyPaymentSuccess').resolves({
        id: 'paymentid123',
        amount: 1000,
      })
      sinon.stub(db, 'transaction').resolves({
        commit: sinon.stub(),
        rollback: sinon.stub(),
      })
      sinon.stub(usersRepo, 'incrementCredits').resolves()
      sinon.stub(txnRepo, 'setVerified').resolves({
        userId: 1,
        credits: 100,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        paymentId: 'randompaymentid',
        type: TransactionType.TopUp,
        amount: 1000,
        verified: true,
      })

      request(testApp)
        .post('/webhooks/topup')
        .send('id=randompaymentid')
        .expect(200)
        .expect('Content-Type', /json/)
        .then(() => done())
        .catch((err: Error) => done(err))
    })
  })

  describe('subscription webhook', () => {
    afterEach(() => sinon.restore())

    const controller = new WebhooksController()
    const testApp = express()
      .use(express.urlencoded({ extended: true }))
      .use(controller.getRouter())
      .use(error)

    it('should return 400 when the payload is invalid', (done) => {
      request(testApp)
        .post('/webhooks/subscription')
        .send('name=john')
        .expect('Content-Type', /json/)
        .expect(400)
        .then(() => done())
        .catch((err: Error) => done(err))
    })

    it('should return 200 when payment is not verified', (done) => {
      sinon.stub(paymentProcessing, 'verifySubscriptionPaymentSuccess').resolves(null)

      request(testApp)
        .post('/webhooks/subscription')
        .send('id=randompaymentid')
        .expect(200)
        .expect('Content-Type', /json/)
        .then(() => done())
        .catch((err: Error) => done(err))
    })

    it('should return 200 when payment is verified', (done) => {
      sinon.stub(paymentProcessing, 'verifySubscriptionPaymentSuccess').resolves({
        id: 'paymentid123',
        amount: 1000,
        subscriptionId: 'subsId123',
      })
      sinon.stub(db, 'transaction').resolves({
        commit: sinon.stub(),
        rollback: sinon.stub(),
      })
      sinon.stub(usersRepo, 'findByPPSubscriptionId').resolves({
        id: 1,
        credits: 100,
        subscriptionId: 1,
        ppCustomerId: 'x-customer-1234',
        ppMandateId: 'x-mandate-1234',
        ppSubscriptionId: 'subsId123',
      })
      sinon.stub(subscriptionsRepo, 'findById').resolves({
        id: 1,
        credits: 10,
        name: 'test',
        price: 100,
        periodicity: '1 month',
      })
      sinon.stub(usersRepo, 'incrementCredits').resolves()
      sinon.stub(txnRepo, 'create').resolves()

      request(testApp)
        .post('/webhooks/subscription')
        .send('id=randompaymentid')
        .expect(200)
        .expect('Content-Type', /json/)
        .then(() => done())
        .catch((err: Error) => done(err))
    })

    it('should return 500 when subscription is invalid', (done) => {
      sinon.stub(paymentProcessing, 'verifySubscriptionPaymentSuccess').resolves({
        id: 'paymentid123',
        amount: 1000,
        subscriptionId: 'subsId123',
      })
      sinon.stub(db, 'transaction').resolves({
        commit: sinon.stub(),
        rollback: sinon.stub(),
      })
      sinon.stub(usersRepo, 'findByPPSubscriptionId').resolves({
        id: 1,
        credits: 100,
        subscriptionId: 1,
        ppCustomerId: 'x-customer-1234',
        ppMandateId: 'x-mandate-1234',
        ppSubscriptionId: 'subsId123',
      })
      sinon.stub(subscriptionsRepo, 'findById').resolves(null)
      sinon.stub(usersRepo, 'incrementCredits').resolves()
      sinon.stub(txnRepo, 'create').resolves()

      request(testApp)
        .post('/webhooks/subscription')
        .send('id=randompaymentid')
        .expect(500)
        .expect('Content-Type', /json/)
        .then(() => done())
        .catch((err: Error) => done(err))
    })

    it('should return 500 when user has no subscription', (done) => {
      sinon.stub(paymentProcessing, 'verifySubscriptionPaymentSuccess').resolves({
        id: 'paymentid123',
        amount: 1000,
        subscriptionId: 'subsId123',
      })
      sinon.stub(db, 'transaction').resolves({
        commit: sinon.stub(),
        rollback: sinon.stub(),
      })
      sinon.stub(usersRepo, 'findByPPSubscriptionId').resolves({
        id: 1,
        credits: 100,
        subscriptionId: 1,
        ppCustomerId: null,
        ppMandateId: 'x-mandate-1234',
        ppSubscriptionId: null,
      })

      request(testApp)
        .post('/webhooks/subscription')
        .send('id=randompaymentid')
        .expect(500)
        .expect('Content-Type', /json/)
        .then(() => done())
        .catch((err: Error) => done(err))
    })
  })

  describe('first payment webhook', () => {
    afterEach(() => sinon.restore())

    const controller = new WebhooksController()
    const testApp = express()
      .use(express.urlencoded({ extended: true }))
      .use(controller.getRouter())
      .use(error)

    it('should return 400 when the payload is invalid', (done) => {
      request(testApp)
        .post('/webhooks/first')
        .send('name=john')
        .expect('Content-Type', /json/)
        .expect(400)
        .then(() => done())
        .catch((err: Error) => done(err))
    })

    it('should return 500 when database connection fails', (done) => {
      sinon.stub(paymentProcessing, 'verifyPaymentSuccess').rejects()

      request(testApp)
        .post('/webhooks/first')
        .send('id=randompaymentid')
        .expect(500)
        .expect('Content-Type', /json/)
        .then(() => done())
        .catch((err: Error) => done(err))
    })

    it('should return 200 when payment is not verified', (done) => {
      sinon.stub(paymentProcessing, 'verifyPaymentSuccess').resolves(null)

      request(testApp)
        .post('/webhooks/first')
        .send('id=randompaymentid')
        .expect(200)
        .expect('Content-Type', /json/)
        .then(() => done())
        .catch((err: Error) => done(err))
    })

    it('should return 200 when payment is verified', (done) => {
      sinon.stub(paymentProcessing, 'verifyPaymentSuccess').resolves({
        id: 'paymentid123',
        amount: 1000,
      })
      sinon.stub(txnRepo, 'setVerified').resolves()

      request(testApp)
        .post('/webhooks/first')
        .send('id=randompaymentid')
        .expect(200)
        .expect('Content-Type', /json/)
        .then(() => done())
        .catch((err: Error) => done(err))
    })
  })
})
