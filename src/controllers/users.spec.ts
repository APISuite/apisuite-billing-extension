import sinon from 'sinon'
import request from 'supertest'
import express, { NextFunction, Request, Response } from 'express'
import { UsersController } from './users'
import { organization as orgsRepo, user as usersRepo } from '../models'
import { error } from '../middleware'
import * as paymentProcessing from '../payment-processing'
import { expect } from "chai"

describe('users controller', () => {
  const injectUser = (req: Request, res: Response, next: NextFunction) => {
    res.locals.authenticatedUser = {
      id: 1,
      role: { name: 'admin' },
      organizations: [
        { id: 1, role: { id: 1, name: 'admin' } },
        { id: 2, role: { id: 2, name: 'organizationOwner' } },
        { id: 3, role: { id: 3, name: 'developer' } },
      ],
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
        billingOrganizationId: 1,
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
        billingOrganizationId: 1,
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
        billingOrganizationId: 1,
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
        billingOrganizationId: 1,
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
        billingOrganizationId: 1,
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

    it('should return 400 when user has no billing org', (done) => {
      sinon.stub(usersRepo, 'getOrBootstrapUser').resolves({
        id: 9,
        credits: 100,
        subscriptionId: 1,
        ppCustomerId: 'cid',
        ppMandateId: 'mid',
        ppSubscriptionId: null,
        invoiceNotes: null,
        billingOrganizationId: null,
      })

      request(testApp)
        .patch('/users/9')
        .send({
          credits: '100',
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
        billingOrganizationId: 1,
      })
      sinon.stub(orgsRepo, 'updateCredits').resolves()

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

  describe('set billing organization', () => {
    const controller = new UsersController()
    const testApp = express()
      .use(injectUser)
      .use(express.json())
      .use(controller.getRouter())
      .use(error)

    it('should return 403 when non admin user tries to update other users data', (done) => {
      const app = express()
        .use((req: Request, res: Response, next: NextFunction) => {
          res.locals.authenticatedUser = {
            id: 1,
            organizations: [
              { id: 3, role: { id: 3, name: 'developer' } },
            ],
          }
          next()
        })
        .use(express.json())
        .use(controller.getRouter())
        .use(error)

      request(app)
        .put('/users/999/organizations/1')
        .expect('Content-Type', /json/)
        .expect(403)
        .then((res) => {
          expect(res.body.errors).to.be.an('array')
          done()
        })
        .catch((err: Error) => done(err))
    })

    it('should return 403 when non admin user tries to set a billing org when has no access to it', (done) => {
      const app = express()
        .use((req: Request, res: Response, next: NextFunction) => {
          res.locals.authenticatedUser = {
            id: 1,
            role: { name: 'developer' },
            organizations: [
              { id: 3, role: { id: 3, name: 'developer' } },
            ],
          }
          next()
        })
        .use(express.json())
        .use(controller.getRouter())
        .use(error)

      request(app)
        .put('/users/1/organizations/999')
        .expect('Content-Type', /json/)
        .expect(403)
        .then((res) => {
          expect(res.body.errors).to.be.an('array')
          done()
        })
        .catch((err: Error) => done(err))
    })

    it('should return 404 when organization does not exist', (done) => {
      sinon.stub(orgsRepo, 'findById').resolves()
      request(testApp)
        .put('/users/1/organizations/999')
        .expect('Content-Type', /json/)
        .expect(404)
        .then((res) => {
          expect(res.body.errors).to.be.an('array')
          done()
        })
        .catch((err: Error) => done(err))
    })

    it('should return 200 when user updates own data', (done) => {
      sinon.stub(orgsRepo, 'findById').resolves({
        id: 1,
        credits: 100,
        subscriptionId: null,
        invoiceNotes: null,
        ppSubscriptionId: null,
        ppCustomerId: null,
      })
      sinon.stub(usersRepo, 'getOrBootstrapUser').resolves({
        id: 9,
        credits: 100,
        subscriptionId: 1,
        ppCustomerId: 'cid',
        ppMandateId: 'mid',
        ppSubscriptionId: null,
        invoiceNotes: null,
        billingOrganizationId: 1,
      })
      sinon.stub(usersRepo, 'update').resolves()

      request(testApp)
        .put('/users/1/organizations/2')
        .expect(204)
        .then(() => done())
        .catch((err: Error) => done(err))
    })
  })
})
