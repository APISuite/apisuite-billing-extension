import express from 'express'
import request from 'supertest'
import sinon from 'sinon'
import { HealthController } from './health'
import { error } from '../middleware'
import { db } from '../db'

describe('health controller', () => {
  describe('get health check', () => {
    beforeEach(() => sinon.restore())

    it('should return 200', (done) => {
      sinon.stub(db, 'raw').resolves()

      const controller = new HealthController()
      const testApp = express()
        .use(controller.getRouter())
        .use(error)

      request(testApp)
        .get('/health')
        .expect('Content-Type', /json/)
        .expect(200)
        .then(() => done())
        .catch((err: Error) => done(err))
    })

    it('should return 500 when database connection fails', (done) => {
      sinon.stub(db, 'raw').rejects()

      const controller = new HealthController()
      const testApp = express()
        .use(controller.getRouter())
        .use(error)

      request(testApp)
        .get('/health')
        .expect(500)
        .expect('Content-Type', /json/)
        .then(() => done())
        .catch((err: Error) => done(err))
    })
  })
})
