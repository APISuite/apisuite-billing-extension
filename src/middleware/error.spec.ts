import express from 'express'
import request from 'supertest'
import { error } from './error'


describe('error handler middleware', () => {
  it('should return 500 and JSON message on sync error', (done) => {
    const testApp = express()
      .get('/test', () => {
        throw Error('sync error')
      })
      .use(error)

    request(testApp)
      .get('/test')
      .expect('Content-Type', /json/)
      .expect(500)
      .then(() => done())
      .catch((err: Error) => done(err))
  })

  it('should return 500 and JSON body on implicit next call', (done) => {
    const testApp = express()
      .get('/test', (req, res, next) => {
        next(new Error('implicit next call'))
      })
      .use(error)

    request(testApp)
      .get('/test')
      .expect('Content-Type', /json/)
      .expect(500)
      .then(() => done())
      .catch((err: Error) => done(err))
  })
})