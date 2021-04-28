import sinon from 'sinon'
import { expect } from 'chai'
import express, { Request, Response, NextFunction } from 'express'
import request from 'supertest'
import { error } from '../middleware'
import { subscription as subscriptionsRepo } from '../models'
import { SubscriptionsController } from './subscriptions'
import { DuplicateError } from '../models/errors'
import { db } from '../db'

describe('subscriptions controller', () => {
  const injectUser = (req: Request, res: Response, next: NextFunction) => {
    res.locals.authenticatedUser = {
      role: { name: 'admin' },
    }
    next()
  }

  afterEach(() => sinon.restore())

  describe('get subscriptions', () => {
    const controller = new SubscriptionsController()
    const testApp = express()
      .use(injectUser)
      .use(controller.getRouter())
      .use(error)

    it('should return 200 and subscription list', (done) => {
      sinon.stub(subscriptionsRepo, 'findAll').resolves([])

      request(testApp)
        .get('/subscriptions')
        .expect('Content-Type', /json/)
        .expect(200)
        .then((res) => {
          expect(res.body.data).to.be.an('array')
          done()
        })
        .catch((err: Error) => done(err))
    })

    it('should return 500 when a database error occurs', (done) => {
      sinon.stub(subscriptionsRepo, 'findAll').rejects()

      request(testApp)
        .get('/subscriptions')
        .expect('Content-Type', /json/)
        .expect(500)
        .then((res) => {
          expect(res.body.errors).to.be.an('array')
          done()
        })
        .catch((err: Error) => done(err))
    })
  })

  describe('get subscription by id', () => {
    const controller = new SubscriptionsController()
    const testApp = express()
      .use(injectUser)
      .use(controller.getRouter())
      .use(error)

    it('should return 200 and subscription object', (done) => {
      sinon.stub(subscriptionsRepo, 'findById').resolves({
        id: 1,
        credits: 10,
        name: 'test',
        price: 100,
        periodicity: '1 month',
      })

      request(testApp)
        .get('/subscriptions/1')
        .expect('Content-Type', /json/)
        .expect(200)
        .then((res) => {
          expect(res.body.data).to.be.an('object')
          done()
        })
        .catch((err: Error) => done(err))
    })

    it('should return 404 when subscription is not found', (done) => {
      sinon.stub(subscriptionsRepo, 'findById').resolves(null)

      request(testApp)
        .get('/subscriptions/100')
        .expect('Content-Type', /json/)
        .expect(404)
        .then((res) => {
          expect(res.body.errors).to.be.an('array')
          done()
        })
        .catch((err: Error) => done(err))
    })

    it('should return 500 when a database error occurs', (done) => {
      sinon.stub(subscriptionsRepo, 'findById').rejects()

      request(testApp)
        .get('/subscriptions/1')
        .expect('Content-Type', /json/)
        .expect(500)
        .then((res) => {
          expect(res.body.errors).to.be.an('array')
          done()
        })
        .catch((err: Error) => done(err))
    })
  })

  describe('create subscription', () => {
    const controller = new SubscriptionsController()
    const testApp = express()
      .use(express.json())
      .use(injectUser)
      .use(controller.getRouter())
      .use(error)

    const mockSubscriptionData = {
      credits: 10,
      name: 'test',
      price: 100,
      periodicity: '2 months',
    }

    it('should return 201 and the newly create subscription object', (done) => {
      sinon.stub(subscriptionsRepo, 'create').resolves({
        id: 1,
        ...mockSubscriptionData,
      })

      request(testApp)
        .post('/subscriptions')
        .send(mockSubscriptionData)
        .expect('Content-Type', /json/)
        .expect(201)
        .then((res) => {
          expect(res.body.data).to.be.an('object')
          done()
        })
        .catch((err: Error) => done(err))
    })

    it('should return 409 when subscription name already exists', (done) => {
      sinon
        .stub(subscriptionsRepo, 'create')
        .throws(new DuplicateError('Key (name)=(test)'))

      request(testApp)
        .post('/subscriptions')
        .send(mockSubscriptionData)
        .expect('Content-Type', /json/)
        .expect(409)
        .then((res) => {
          expect(res.body.errors).to.be.an('array')
          done()
        })
        .catch((err: Error) => done(err))
    })

    it('should return 500 when a database error occurs', (done) => {
      sinon.stub(subscriptionsRepo, 'create').rejects()

      request(testApp)
        .post('/subscriptions')
        .send(mockSubscriptionData)
        .expect(500)
        .then((res) => {
          expect(res.body.errors).to.be.an('array')
          done()
        })
        .catch((err: Error) => done(err))
    })
  })

  describe('update subscription', () => {
    const controller = new SubscriptionsController()
    const testApp = express()
      .use(express.json())
      .use(injectUser)
      .use(controller.getRouter())
      .use(error)

    const mockSubscriptionData = {
      credits: 10,
      name: 'test',
      price: 100,
      periodicity: '1 month',
    }

    beforeEach(() => {
      sinon.stub(db, 'transaction').resolves({
        commit: sinon.stub(),
        rollback: sinon.stub(),
      })
    })

    afterEach(() => sinon.restore())

    it('should return 404 when the subscription does not exist', (done) => {
      sinon.stub(subscriptionsRepo, 'findById').resolves(null)

      request(testApp)
        .put('/subscriptions/999')
        .send(mockSubscriptionData)
        .expect('Content-Type', /json/)
        .expect(404)
        .then((res) => {
          expect(res.body.errors).to.be.an('array')
          done()
        })
        .catch((err: Error) => done(err))
    })

    it('should return 200 when the subscription is updated', (done) => {
      sinon.stub(subscriptionsRepo, 'findById').resolves({
        id: 1,
        ...mockSubscriptionData,
      })
      sinon.stub(subscriptionsRepo, 'update').resolves({
        id: 1,
        ...mockSubscriptionData,
      })

      request(testApp)
        .put('/subscriptions/1')
        .send(mockSubscriptionData)
        .expect('Content-Type', /json/)
        .expect(200)
        .then((res) => {
          expect(res.body.data).to.be.an('object')
          done()
        })
        .catch((err: Error) => done(err))
    })

    it('should return 409 when the name is already in use', (done) => {
      sinon.stub(subscriptionsRepo, 'findById').resolves({
        id: 1,
        ...mockSubscriptionData,
      })
      sinon.stub(subscriptionsRepo, 'update').throws(new DuplicateError('Key (name)=(test)'))

      request(testApp)
        .put('/subscriptions/1')
        .send(mockSubscriptionData)
        .expect('Content-Type', /json/)
        .expect(409)
        .then((res) => {
          expect(res.body.errors).to.be.an('array')
          done()
        })
        .catch((err: Error) => done(err))
    })

    it('should return 500 when a database error occurs', (done) => {
      sinon.stub(subscriptionsRepo, 'findById').rejects()

      request(testApp)
        .put('/subscriptions/1')
        .send(mockSubscriptionData)
        .expect('Content-Type', /json/)
        .expect(500)
        .then((res) => {
          expect(res.body.errors).to.be.an('array')
          done()
        })
        .catch((err: Error) => done(err))
    })
  })

  describe('delete subscription', () => {
    const controller = new SubscriptionsController()
    const testApp = express()
      .use(injectUser)
      .use(controller.getRouter())
      .use(error)

    it('should return 204 when the subscription is deleted', (done) => {
      sinon.stub(subscriptionsRepo, 'deleteSubscription').resolves()

      request(testApp)
        .delete('/subscriptions/1')
        .expect(204)
        .then(() => done())
        .catch((err: Error) => done(err))
    })

    it('should return 500 when a database error occurs', (done) => {
      sinon.stub(subscriptionsRepo, 'deleteSubscription').rejects()

      request(testApp)
        .delete('/subscriptions/1')
        .expect(500)
        .then((res) => {
          expect(res.body.errors).to.be.an('array')
          done()
        })
        .catch((err: Error) => done(err))
    })
  })
})
