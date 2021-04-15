import sinon from 'sinon'
import { expect } from 'chai'
import express, { Request, Response, NextFunction } from 'express'
import request from 'supertest'
import { error } from '../middleware'
import {
  plan as plansRepo,
  transaction as txnRepo,
} from '../models'
import { PurchasesController } from './purchases'
import * as paymentProcessing from '../payment-processing'

describe('purchases controller', () => {
  const injectUser = (req: Request, res: Response, next: NextFunction) => {
    res.locals.authenticatedUser = { id: 1 }
    next()
  }

  afterEach(() => sinon.restore())

  describe('puchase plan', () => {
    const controller = new PurchasesController()
    const testApp = express()
      .use(express.json())
      .use(injectUser)
      .use(controller.getRouter())
      .use(error)

    it('should return 404 when planId is invalid', (done) => {
      sinon.stub(plansRepo, 'findById').resolves(null)

      request(testApp)
        .post('/purchases')
        .send({ planId: 666 })
        .expect('Content-Type', /json/)
        .expect(404)
        .then((res) => {
          expect(res.body.error).to.be.a('string')
          done()
        })
        .catch((err: Error) => done(err))
    })

    it('should return 302 when purchasing a top up', (done) => {
      sinon.stub(plansRepo, 'findById').resolves({
        id: 99,
        name: '5k creds',
        price: 123,
        credits: 5000,
        periodicity: null,
      })
      sinon.stub(txnRepo, 'create').resolves()
      sinon.stub(paymentProcessing, 'topUpPayment').resolves({
        id: 'payment-id-12345',
        checkoutURL: 'https://redirected.here',
      })

      request(testApp)
        .post('/purchases')
        .send({ planId: 99 })
        .expect(302)
        .then(() => done())
        .catch((err: Error) => done(err))
    })
  })
})
