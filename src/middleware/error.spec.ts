import express from 'express'
import request from 'supertest'
import { expect } from 'chai'
import { error } from './error'
import { NotFoundError, PurchasePreconditionError, UserInputError } from '../controllers'
import { DuplicateError } from '../models/errors'

describe('error handler middleware', () => {
  it('should return 500 on Error', (done) => {
    const testApp = express()
      .get('/test', (req, res, next) => {
        next(new Error('generic error'))
      })
      .use(error)

    request(testApp)
      .get('/test')
      .expect('Content-Type', /json/)
      .expect(500)
      .then((res) => {
        expect(res.body.errors).to.be.an('array')
        done()
      })
      .catch((err: Error) => done(err))
  })

  it('should return 400 on UserInputError', (done) => {
    const testApp = express()
      .get('/test', (req, res, next) => {
        next(new UserInputError(['field1', 'field2']))
      })
      .use(error)

    request(testApp)
      .get('/test')
      .expect('Content-Type', /json/)
      .expect(400)
      .then((res) => {
        expect(res.body.errors).to.be.an('array')
        done()
      })
      .catch((err: Error) => done(err))
  })

  it('should return 400 on PurchasePreconditionError', (done) => {
    const testApp = express()
      .get('/test', (req, res, next) => {
        next(new PurchasePreconditionError('failed precondition'))
      })
      .use(error)

    request(testApp)
      .get('/test')
      .expect('Content-Type', /json/)
      .expect(400)
      .then((res) => {
        expect(res.body.errors).to.be.an('array')
        done()
      })
      .catch((err: Error) => done(err))
  })

  it('should return 404 on NotFoundError', (done) => {
    const testApp = express()
      .get('/test', (req, res, next) => {
        next(new NotFoundError('entity'))
      })
      .use(error)

    request(testApp)
      .get('/test')
      .expect('Content-Type', /json/)
      .expect(404)
      .then((res) => {
        expect(res.body.errors).to.be.an('array')
        done()
      })
      .catch((err: Error) => done(err))
  })

  it('should return 409 on DuplicateError', (done) => {
    const testApp = express()
      .get('/test', (req, res, next) => {
        next(new DuplicateError('Key (name)=(test)'))
      })
      .use(error)

    request(testApp)
      .get('/test')
      .expect('Content-Type', /json/)
      .expect(409)
      .then((res) => {
        expect(res.body.errors).to.be.an('array')
        done()
      })
      .catch((err: Error) => done(err))
  })
})