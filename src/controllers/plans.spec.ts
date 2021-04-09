import { expect } from 'chai'
import express, { Request, Response, NextFunction } from 'express'
import request from 'supertest'
import { error } from '../middleware'
import { MockPlansRepository } from '../models/plan.mock'
import { PlansController } from './plans'

describe.only('plans controller', () => {
  const injectUser = (req: Request, res: Response, next: NextFunction) => {
    res.locals.authenticatedUser = {
      role: { name: 'admin' },
    }
    next()
  }

  describe('get plans', () => {
    const mpr = new MockPlansRepository()
    const controller = new PlansController(mpr)
    const testApp = express()
      .use(injectUser)
      .use(controller.getRouter())
      .use(error)

    it('should return 200 and plan list', (done) => {
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
  })

  describe('get plan by id', () => {
    const mpr = new MockPlansRepository()
    mpr.db[1] = {
      id: 1,
      credits: 10,
      periodicity: null,
      name: 'test',
      price: 100,
    }

    const controller = new PlansController(mpr)
    const testApp = express()
      .use(injectUser)
      .use(controller.getRouter())
      .use(error)

    it('should return 200 and plan object', (done) => {
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
  })
})
