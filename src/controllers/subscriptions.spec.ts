import { expect } from 'chai'
import express, { Request, Response, NextFunction } from 'express'
import request from 'supertest'
import { error } from '../middleware'
import { subscription as subscriptionsRepo } from '../models'
import { SubscriptionsController } from './subscriptions'
import sinon from 'sinon'

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
})
