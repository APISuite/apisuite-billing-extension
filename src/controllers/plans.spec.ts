import { expect } from 'chai'
import express, { Request, Response, NextFunction } from 'express'
import request from 'supertest'
import { error } from '../middleware'
import { plan as plansRepo } from '../models'
import { PlansController } from './plans'
import sinon from 'sinon'

describe('plans controller', () => {
  const injectUser = (req: Request, res: Response, next: NextFunction) => {
    res.locals.authenticatedUser = {
      role: { name: 'admin' },
    }
    next()
  }

  afterEach(() => sinon.restore())

  describe('get plans', () => {
    const controller = new PlansController()
    const testApp = express()
      .use(injectUser)
      .use(controller.getRouter())
      .use(error)

    it('should return 200 and plan list', (done) => {
      sinon.stub(plansRepo, 'findAll').resolves([])

      request(testApp)
        .get('/plans')
        .expect('Content-Type', /json/)
        .expect(200)
        .then((res) => {
          expect(res.body.data).to.be.an('array')
          done()
        })
        .catch((err: Error) => done(err))
    })

    it('should return 500 when a database error occurs', (done) => {
      sinon.stub(plansRepo, 'findAll').rejects()

      request(testApp)
        .get('/plans')
        .expect('Content-Type', /json/)
        .expect(500)
        .then((res) => {
          expect(res.body.error).to.be.a('string')
          done()
        })
        .catch((err: Error) => done(err))
    })
  })

  describe('get plan by id', () => {
    const controller = new PlansController()
    const testApp = express()
      .use(injectUser)
      .use(controller.getRouter())
      .use(error)

    it('should return 200 and plan object', (done) => {
      sinon.stub(plansRepo, 'findById').resolves({
        id: 1,
        credits: 10,
        periodicity: null,
        name: 'test',
        price: 100,
      })

      request(testApp)
        .get('/plans/1')
        .expect('Content-Type', /json/)
        .expect(200)
        .then((res) => {
          expect(res.body.data).to.be.an('object')
          done()
        })
        .catch((err: Error) => done(err))
    })

    it('should return 404 when plan is not found', (done) => {
      sinon.stub(plansRepo, 'findById').resolves(null)

      request(testApp)
        .get('/plans/100')
        .expect('Content-Type', /json/)
        .expect(404)
        .then((res) => {
          expect(res.body.error).to.be.a('string')
          done()
        })
        .catch((err: Error) => done(err))
    })

    it('should return 500 when a database error occurs', (done) => {
      sinon.stub(plansRepo, 'findById').rejects()

      request(testApp)
        .get('/plans/1')
        .expect('Content-Type', /json/)
        .expect(500)
        .then((res) => {
          expect(res.body.error).to.be.a('string')
          done()
        })
        .catch((err: Error) => done(err))
    })
  })
})
