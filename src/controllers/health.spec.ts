import express from 'express'
const request = require('supertest')
import { HealthController } from './health'
import { error } from '../middleware'
import { MockPool, MockBadPool } from './health.mock'

describe('health controller', () => {
  describe('get health check', () => {
    it('should return 200', (done) => {
      const controller = new HealthController(new MockPool())
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
      const controller = new HealthController(new MockBadPool())
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