import sinon from 'sinon'
import request from 'supertest'
import { UsersController } from './users'
import {
  user as usersRepo,
  setting as settingsRepo,
} from '../models'
import express, { NextFunction, Request, Response } from 'express'
import { error } from '../middleware'

describe('users controller', () => {
  const injectUser = (req: Request, res: Response, next: NextFunction) => {
    res.locals.authenticatedUser = {
      id: 1,
      role: { name: 'admin' },
    }
    next()
  }

  afterEach(() => sinon.restore())

  describe('get user details', () => {
    const controller = new UsersController()
    const testApp = express()
      .use(injectUser)
      .use(controller.getRouter())
      .use(error)

    it('should return 200 when getting user for the first time', (done) => {
      sinon.stub(settingsRepo, 'findByName').resolves('100')
      sinon.stub(usersRepo, 'findById').resolves(null)
      sinon.stub(usersRepo, 'create').resolves({
        id: 1,
        credits: 100,
        planId: null,
        customerId: null,
      })

      request(testApp)
        .get('/users/1')
        .expect('Content-Type', /json/)
        .expect(200)
        .then(() => done())
        .catch((err: Error) => done(err))
    })

    it('should return 200 when getting user for the first time', (done) => {
      sinon.stub(settingsRepo, 'findByName').resolves('100')
      sinon.stub(usersRepo, 'findById').resolves({
        id: 1,
        credits: 100,
        planId: null,
        customerId: null,
      })

      request(testApp)
        .get('/users/1')
        .expect('Content-Type', /json/)
        .expect(200)
        .then(() => done())
        .catch((err: Error) => done(err))
    })
  })
})
