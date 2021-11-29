import sinon from 'sinon'
import { expect } from 'chai'
import express, { NextFunction, Request, Response, Router } from 'express'
import request from 'supertest'
import { authenticated, error, isOrgOwner } from '../middleware'
import {
  organization as orgsRepo,
  pkg as pkgsRepo,
  subscription as subscriptionsRepo,
  transaction as txnRepo,
} from '../models'
import { OrgPurchasesController } from './organizations.purchases'
import * as paymentProcessing from '../payment-processing'
import * as core from '../core'
import { TransactionType } from "../models/transaction"
import { PaymentMethod, PaymentStatus } from "@mollie/api-client"

const prepareApp = () => {
  const injectUser = (req: Request, res: Response, next: NextFunction) => {
    res.locals.authenticatedUser = {
      id: 1,
      organizations: [{ id: 1, role: { name: 'organizationOwner' } }],
    }
    next()
  }

  const controller = new OrgPurchasesController()
  const router = Router()
  router.use('/organizations/:id/purchases', authenticated, isOrgOwner, controller.getRouter())
  return express()
    .use(injectUser)
    .use(router)
    .use(error)
}

describe('organization purchases controller', () => {
  afterEach(() => sinon.restore())

  describe('get purchases', () => {
    const testApp = prepareApp()

    it('should return 200 and empty purchases list when user has no customer id', (done) => {
      sinon.stub(orgsRepo, 'findById').resolves({
        id: 1,
        ppCustomerId: null,
        ppSubscriptionId: null,
        credits: 100,
        subscriptionId: null,
        invoiceNotes: null,
      })
      sinon.stub(paymentProcessing, 'listCustomerPayments').resolves([])

      request(testApp)
        .get('/organizations/1/purchases')
        .expect('Content-Type', /json/)
        .expect(200)
        .then((res) => {
          expect(res.body.data).to.be.an('array')
          done()
        })
        .catch((err: Error) => done(err))
    })

    it('should return 200 and purchases list', (done) => {
      sinon.stub(orgsRepo, 'findById').resolves({
        id: 1,
        ppCustomerId: null,
        ppSubscriptionId: null,
        credits: 100,
        subscriptionId: null,
        invoiceNotes: null,
      })
      sinon.stub(paymentProcessing, 'listCustomerPayments').resolves([])

      request(testApp)
        .get('/organizations/1/purchases')
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
    const testApp = prepareApp()

    it('should return 404 when transaction not found', (done) => {
      sinon.stub(orgsRepo, 'findById').resolves({
        id: 1,
        ppCustomerId: null,
        ppSubscriptionId: null,
        credits: 100,
        subscriptionId: null,
        invoiceNotes: null,
      })
      sinon.stub(txnRepo, 'findById').resolves()

      request(testApp)
        .get('/organizations/1/purchases/333')
        .expect('Content-Type', /json/)
        .expect(404)
        .then((res) => {
          expect(res.body.errors).to.be.an('array')
          done()
        })
        .catch((err: Error) => done(err))
    })

    it('should return 403 when transaction belongs to another user/organization', (done) => {
      sinon.stub(orgsRepo, 'findById').resolves({
        id: 1,
        ppCustomerId: null,
        ppSubscriptionId: null,
        credits: 100,
        subscriptionId: null,
        invoiceNotes: null,
      })
      sinon.stub(txnRepo, 'findById').resolves({
        userId: 1,
        organizationId: 999,
        credits: 100,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        paymentId: 'randompaymentid',
        type: TransactionType.TopUp,
        amount: 1000,
        verified: true,
      })

      request(testApp)
        .get('/organizations/1/purchases/333')
        .expect('Content-Type', /json/)
        .expect(403)
        .then((res) => {
          expect(res.body.errors).to.be.an('array')
          done()
        })
        .catch((err: Error) => done(err))
    })

    it('should return 404 when payment could not be fetched from PP', (done) => {
      sinon.stub(orgsRepo, 'findById').resolves({
        id: 1,
        ppCustomerId: null,
        ppSubscriptionId: null,
        credits: 100,
        subscriptionId: null,
        invoiceNotes: null,
      })
      sinon.stub(txnRepo, 'findById').resolves({
        userId: 1,
        organizationId: 1,
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
        .get('/organizations/1/purchases/333')
        .expect('Content-Type', /json/)
        .expect(404)
        .then((res) => {
          expect(res.body.errors).to.be.an('array')
          done()
        })
        .catch((err: Error) => done(err))
    })

    it('should return 200 and show payment details', (done) => {
      sinon.stub(orgsRepo, 'findById').resolves({
        id: 1,
        ppCustomerId: null,
        ppSubscriptionId: null,
        credits: 100,
        subscriptionId: null,
        invoiceNotes: null,
      })
      sinon.stub(txnRepo, 'findById').resolves({
        userId: 1,
        organizationId: 1,
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
        .get('/organizations/1/purchases/333')
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
    const testApp = prepareApp()

    it('should return 404 when plan does not exist', (done) => {
      sinon.stub(orgsRepo, 'findById').resolves({
        id: 1,
        credits: 100,
        subscriptionId: null,
        ppCustomerId: 'x-customer-id-123',
        ppSubscriptionId: null,
        invoiceNotes: null,
      })
      sinon.stub(pkgsRepo, 'findById').resolves(null)

      request(testApp)
        .post('/organizations/1/purchases/packages/333')
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
      sinon.stub(orgsRepo, 'findById').resolves({
        id: 1,
        credits: 100,
        subscriptionId: null,
        ppCustomerId: 'x-customer-id-123',
        ppSubscriptionId: null,
        invoiceNotes: null,
      })
      sinon.stub(pkgsRepo, 'findById').resolves({
        id: 333,
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
        .post('/organizations/1/purchases/packages/333')
        .expect(200)
        .then(() => done())
        .catch((err: Error) => done(err))
    })

    it('should return 200 when purchasing a top up (org has no customer id)', (done) => {
      sinon.stub(core, 'getPaymentRedirectURL').resolves(new URL('http://localhost:3000'))
      sinon.stub(orgsRepo, 'findById').resolves({
        id: 1,
        credits: 100,
        subscriptionId: null,
        ppCustomerId: null,
        ppSubscriptionId: null,
        invoiceNotes: null,
      })
      sinon.stub(paymentProcessing, 'createCustomer').resolves('custmr-id')
      sinon.stub(orgsRepo, 'update').resolves()
      sinon.stub(pkgsRepo, 'findById').resolves({
        id: 333,
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
        .post('/organizations/1/purchases/packages/333')
        .send({ planId: 333 })
        .expect(200)
        .then(() => done())
        .catch((err: Error) => done(err))
    })
  })

  describe('purchase subscription', () => {
    const testApp = prepareApp()

    const mockSubscription = {
      id: 99,
      name: '5k creds',
      price: 123,
      credits: 5000,
      periodicity: '1 month',
    }

    it('should return 404 when subscription does not exist', (done) => {
      sinon.stub(orgsRepo, 'findById').resolves({
        id: 1,
        credits: 100,
        subscriptionId: null,
        ppCustomerId: null,
        ppSubscriptionId: null,
        invoiceNotes: null,
      })
      sinon.stub(subscriptionsRepo, 'findById').resolves(null)

      request(testApp)
        .post('/organizations/1/purchases/subscriptions/99')
        .expect('Content-Type', /json/)
        .expect(404)
        .then((res) => {
          expect(res.body.errors).to.be.an('array')
          done()
        })
        .catch((err: Error) => done(err))
    })

    it('should return 400 when subscription is already active', (done) => {
      sinon.stub(orgsRepo, 'findById').resolves({
        id: 1,
        credits: 100,
        subscriptionId: 99,
        ppCustomerId: 'x-customer-1234',
        ppSubscriptionId: 'x-subscription-1234',
        invoiceNotes: null,
      })

      request(testApp)
        .post('/organizations/1/purchases/subscriptions/99')
        .expect(400)
        .expect('Content-Type', /json/)
        .then(() => done())
        .catch((err: Error) => done(err))
    })

    it('should return 200 when first subscription payment is successfully created', (done) => {
      sinon.stub(core, 'getPaymentRedirectURL').resolves(new URL('http://localhost:3000'))
      sinon.stub(orgsRepo, 'findById').resolves({
        id: 1,
        credits: 100,
        subscriptionId: null,
        ppCustomerId: null,
        ppSubscriptionId: null,
        invoiceNotes: null,
      })
      sinon.stub(subscriptionsRepo, 'findById').resolves(mockSubscription)
      sinon.stub(paymentProcessing, 'createCustomer').resolves('customerid123')
      sinon.stub(orgsRepo, 'update').resolves()
      sinon.stub(paymentProcessing, 'updatePaymentRedirectURL').resolves()
      sinon.stub(paymentProcessing, 'subscriptionFirstPayment').resolves({
        id: 'pmntid',
        amount: 123,
        checkoutURL: 'url',
      })
      sinon.stub(txnRepo, 'create').resolves()

      request(testApp)
        .post('/organizations/1/purchases/subscriptions/99')
        .expect(200)
        .then(() => done())
        .catch((err: Error) => done(err))
    })

    it('should return 200 when first subscription payment is successfully created (existing customer)', (done) => {
      sinon.stub(core, 'getPaymentRedirectURL').resolves(new URL('http://localhost:3000'))
      sinon.stub(orgsRepo, 'findById').resolves({
        id: 1,
        credits: 100,
        subscriptionId: null,
        ppCustomerId: 'xcustomerid',
        ppSubscriptionId: null,
        invoiceNotes: null,
      })
      sinon.stub(subscriptionsRepo, 'findById').resolves(mockSubscription)
      sinon.stub(orgsRepo, 'update').resolves()
      sinon.stub(paymentProcessing, 'updatePaymentRedirectURL').resolves()
      sinon.stub(paymentProcessing, 'subscriptionFirstPayment').resolves({
        id: 'pmntid',
        amount: 123,
        checkoutURL: 'url',
      })
      sinon.stub(txnRepo, 'create').resolves()

      request(testApp)
        .post('/organizations/1/purchases/subscriptions/99')
        .expect(200)
        .then(() => done())
        .catch((err: Error) => done(err))
    })

    it('should return 200 when first subscription payment is successfully created (existing customer) and organization ID in body', (done) => {
      sinon.stub(core, 'getPaymentRedirectURL').resolves(new URL('http://localhost:3000'))
      sinon.stub(orgsRepo, 'findById').resolves({
        id: 1,
        credits: 100,
        subscriptionId: null,
        ppCustomerId: 'xcustomerid',
        ppSubscriptionId: null,
        invoiceNotes: null,
      })
      sinon.stub(subscriptionsRepo, 'findById').resolves(mockSubscription)
      sinon.stub(orgsRepo, 'update').resolves()
      sinon.stub(paymentProcessing, 'updatePaymentRedirectURL').resolves()
      sinon.stub(paymentProcessing, 'subscriptionFirstPayment').resolves({
        id: 'pmntid',
        amount: 123,
        checkoutURL: 'url',
      })
      sinon.stub(txnRepo, 'create').resolves()

      request(testApp)
        .post('/organizations/1/purchases/subscriptions/99')
        .send({ body: { organizationId: 1 } })
        .expect(200)
        .then(() => done())
        .catch((err: Error) => done(err))
    })

    it('should return 500 when subscription payment fails', (done) => {
      sinon.stub(subscriptionsRepo, 'findById').resolves(mockSubscription)
      sinon.stub(orgsRepo, 'findById').resolves({
        id: 1,
        credits: 100,
        subscriptionId: null,
        ppCustomerId: 'x-customer-1234',
        ppSubscriptionId: null,
        invoiceNotes: null,
      })
      sinon.stub(paymentProcessing, 'isMandateValid').resolves(true)
      sinon.stub(paymentProcessing, 'cancelSubscription').resolves()
      sinon.stub(paymentProcessing, 'subscriptionPayment').rejects()

      request(testApp)
        .post('/organizations/1/purchases/subscriptions/99')
        .expect(500)
        .then(() => done())
        .catch((err: Error) => done(err))
    })
  })
})
