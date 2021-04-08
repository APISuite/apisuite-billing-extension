import sinon from 'sinon'
import express from 'express'
import request from 'supertest'
import { WebhooksController } from './webhooks'
import { error } from '../middleware'
import { MockTransactionsRepository } from '../models/transaction.mock'
import * as paymentProcessing from '../payment-processing'
import { MockUsersRepository } from '../models/user.mock'
import { db } from '../db'

describe('webhooks controller', () => {
  describe('topup webhook', () => {
    afterEach(() => sinon.restore())

    const mtr = new MockTransactionsRepository()
    const mur = new MockUsersRepository()
    const controller = new WebhooksController(mtr, mur)
    const testApp = express()
      .use(express.urlencoded({ extended: true }))
      .use(controller.getRouter())
      .use(error)

    it('should return 400 when the payload is invalid', (done) => {
      request(testApp)
        .post('/webhooks/topup')
        .send('name=john')
        .expect('Content-Type', /json/)
        .expect(400)
        .then(() => done())
        .catch((err: Error) => done(err))
    })

    it('should return 500 when database connection fails', (done) => {
      sinon.stub(paymentProcessing, 'verifyPaymentSuccess').rejects()

      request(testApp)
        .post('/webhooks/topup')
        .send('id=randompaymentid')
        .expect(500)
        .expect('Content-Type', /json/)
        .then(() => done())
        .catch((err: Error) => done(err))
    })

    it('should return 200 when payment is not verified', (done) => {
      sinon.stub(paymentProcessing, 'verifyPaymentSuccess').resolves(null)

      request(testApp)
        .post('/webhooks/topup')
        .send('id=randompaymentid')
        .expect(200)
        .expect('Content-Type', /json/)
        .then(() => done())
        .catch((err: Error) => done(err))
    })

    it('should return 200 when payment is verified', (done) => {
      sinon.stub(paymentProcessing, 'verifyPaymentSuccess').resolves('randompaymentid')
      sinon.stub(db, 'transaction').resolves({
        commit: sinon.stub(),
        rollback: sinon.stub(),
      })

      request(testApp)
        .post('/webhooks/topup')
        .send('id=randompaymentid')
        .expect(200)
        .expect('Content-Type', /json/)
        .then(() => done())
        .catch((err: Error) => done(err))
    })
  })
})
