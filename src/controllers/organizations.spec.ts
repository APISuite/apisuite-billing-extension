import sinon from 'sinon'
import request from 'supertest'
import express, { NextFunction, Request, Response } from 'express'
import { OrganizationsController } from './organizations'
import { organization as orgsRepo } from '../models'
import { error } from '../middleware'
import * as paymentProcessing from '../payment-processing'
import { expect } from "chai"

describe('organizations controller', () => {
  const injectUser = (req: Request, res: Response, next: NextFunction) => {
    res.locals.authenticatedUser = {
      id: 1,
      role: { name: 'admin' },
    }
    next()
  }

  afterEach(() => sinon.restore())

  describe('get organization details', () => {
    const controller = new OrganizationsController()
    const testApp = express()
      .use(express.json())
      .use(injectUser)
      .use(controller.getRouter())
      .use(error)

    it('should return 200 when getting organization', (done) => {
      sinon.stub(orgsRepo, 'findById').resolves({
        id: 1,
        credits: 100,
        subscriptionId: null,
        ppCustomerId: null,
        ppSubscriptionId: null,
        invoiceNotes: null,
      })

      request(testApp)
        .get('/organizations/1')
        .expect('Content-Type', /json/)
        .expect(200)
        .then(() => done())
        .catch((err: Error) => done(err))
    })
  })

  describe('cancel subscription', () => {
    const controller = new OrganizationsController()
    const testApp = express()
      .use(injectUser)
      .use(controller.getRouter())
      .use(error)

    it('should return 204 when organization has no customerID/subscriptionID', (done) => {
      sinon.stub(orgsRepo, 'findById').resolves({
        id: 1,
        credits: 100,
        subscriptionId: 1,
        ppCustomerId: null,
        ppSubscriptionId: 'sid',
        invoiceNotes: null,
      })
      sinon.stub(orgsRepo, 'update').resolves()

      request(testApp)
        .delete('/organizations/1/subscriptions')
        .expect(204)
        .then(() => done())
        .catch((err: Error) => done(err))
    })

    it('should return 204 when organization has no subscription', (done) => {
      sinon.stub(orgsRepo, 'findById').resolves({
        id: 1,
        credits: 100,
        subscriptionId: null,
        ppCustomerId: null,
        ppSubscriptionId: null,
        invoiceNotes: null,
      })
      sinon.stub(paymentProcessing, 'cancelSubscription').resolves()
      sinon.stub(orgsRepo, 'update').resolves()

      request(testApp)
        .delete('/organizations/1/subscriptions')
        .expect(204)
        .then(() => done())
        .catch((err: Error) => done(err))
    })

    it('should return 204 when subscription is cancelled', (done) => {
      sinon.stub(orgsRepo, 'findById').resolves({
        id: 1,
        credits: 100,
        subscriptionId: 1,
        ppCustomerId: 'cid',
        ppSubscriptionId: 'sid',
        invoiceNotes: null,
      })
      sinon.stub(paymentProcessing, 'cancelSubscription').resolves()
      sinon.stub(orgsRepo, 'update').resolves()

      request(testApp)
        .delete('/organizations/1/subscriptions')
        .expect(204)
        .then(() => done())
        .catch((err: Error) => done(err))
    })

    it('should return 500 when subscription cancellation fails', (done) => {
      sinon.stub(orgsRepo, 'findById').resolves({
        id: 1,
        credits: 100,
        subscriptionId: 1,
        ppCustomerId: 'cid',
        ppSubscriptionId: 'sid',
        invoiceNotes: null,
      })
      sinon.stub(paymentProcessing, 'cancelSubscription').rejects()

      request(testApp)
        .delete('/organizations/1/subscriptions')
        .expect(500)
        .expect('Content-Type', /json/)
        .then(() => done())
        .catch((err: Error) => done(err))
    })
  })

  describe('patch organization credits', () => {
    const controller = new OrganizationsController()
    const testApp = express()
      .use(injectUser)
      .use(express.json())
      .use(controller.getRouter())
      .use(error)

    it('should return 400 when payload is invalid', (done) => {
      request(testApp)
        .patch('/organizations/9')
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

    it('should return 200 when data is updated', (done) => {
      sinon.stub(orgsRepo, 'findById').resolves({
        id: 9,
        credits: 100,
        subscriptionId: 1,
        ppCustomerId: 'cid',
        ppSubscriptionId: null,
        invoiceNotes: null,
      })
      sinon.stub(orgsRepo, 'update').resolves()

      request(testApp)
        .patch('/organizations/9')
        .send({
          credits: 10,
        })
        .expect('Content-Type', /json/)
        .expect(200)
        .then(() => done())
        .catch((err: Error) => done(err))
    })
  })

  describe('patch organization invoice notes', () => {
    const controller = new OrganizationsController()
    const testApp = express()
      .use(injectUser)
      .use(express.json())
      .use(controller.getRouter())
      .use(error)

    it('should return 400 when payload is invalid', (done) => {
      request(testApp)
        .patch('/organizations/9')
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

    it('should return 200 when data is updated', (done) => {
      sinon.stub(orgsRepo, 'findById').resolves({
        id: 9,
        credits: 100,
        subscriptionId: 1,
        ppCustomerId: 'cid',
        ppSubscriptionId: null,
        invoiceNotes: null,
      })
      sinon.stub(orgsRepo, 'update').resolves()

      request(testApp)
        .patch('/organizations/9')
        .send({
          invoiceNotes: 'some notes',
        })
        .expect('Content-Type', /json/)
        .expect(200)
        .then(() => done())
        .catch((err: Error) => done(err))
    })
  })
})
