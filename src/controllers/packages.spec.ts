import { expect } from 'chai'
import express, { Request, Response, NextFunction } from 'express'
import request from 'supertest'
import { error } from '../middleware'
import { pkg as pkgsRepo } from '../models'
import { PackagesController } from './packages'
import sinon from 'sinon'

describe('packages controller', () => {
  const injectUser = (req: Request, res: Response, next: NextFunction) => {
    res.locals.authenticatedUser = {
      role: { name: 'admin' },
    }
    next()
  }

  afterEach(() => sinon.restore())

  describe('get packages', () => {
    const controller = new PackagesController()
    const testApp = express()
      .use(injectUser)
      .use(controller.getRouter())
      .use(error)

    it('should return 200 and package list', (done) => {
      sinon.stub(pkgsRepo, 'findAll').resolves([])

      request(testApp)
        .get('/packages')
        .expect('Content-Type', /json/)
        .expect(200)
        .then((res) => {
          expect(res.body.data).to.be.an('array')
          done()
        })
        .catch((err: Error) => done(err))
    })

    it('should return 500 when a database error occurs', (done) => {
      sinon.stub(pkgsRepo, 'findAll').rejects()

      request(testApp)
        .get('/packages')
        .expect('Content-Type', /json/)
        .expect(500)
        .then((res) => {
          expect(res.body.errors).to.be.an('array')
          done()
        })
        .catch((err: Error) => done(err))
    })
  })

  describe('get package by id', () => {
    const controller = new PackagesController()
    const testApp = express()
      .use(injectUser)
      .use(controller.getRouter())
      .use(error)

    it('should return 200 and package object', (done) => {
      sinon.stub(pkgsRepo, 'findById').resolves({
        id: 1,
        credits: 10,
        name: 'test',
        price: 100,
      })

      request(testApp)
        .get('/packages/1')
        .expect('Content-Type', /json/)
        .expect(200)
        .then((res) => {
          expect(res.body.data).to.be.an('object')
          done()
        })
        .catch((err: Error) => done(err))
    })

    it('should return 404 when package is not found', (done) => {
      sinon.stub(pkgsRepo, 'findById').resolves(null)

      request(testApp)
        .get('/packages/100')
        .expect('Content-Type', /json/)
        .expect(404)
        .then((res) => {
          expect(res.body.errors).to.be.an('array')
          done()
        })
        .catch((err: Error) => done(err))
    })

    it('should return 500 when a database error occurs', (done) => {
      sinon.stub(pkgsRepo, 'findById').rejects()

      request(testApp)
        .get('/packages/1')
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
