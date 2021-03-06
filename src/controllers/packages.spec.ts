import { expect } from 'chai'
import express, { Request, Response, NextFunction } from 'express'
import request from 'supertest'
import { error } from '../middleware'
import { pkg as pkgsRepo } from '../models'
import { PackagesController } from './packages'
import sinon from 'sinon'
import { DuplicateError } from '../models/errors'
import { db } from '../db'

describe('packages controller', () => {
  const injectUser = (req: Request, res: Response, next: NextFunction) => {
    res.locals.authenticatedUser = {
      organizations: [
        { id: 1, role: { id: 1, name: 'admin' } },
      ],
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

    it('should return 200 and package list when using sort params', async () => {
      sinon.stub(pkgsRepo, 'findAll').resolves([])

      const sortCases = ['name', 'price', 'credits']
      const orderCases = ['asc', 'desc']

      for (const sort of sortCases) {
        for (const order of orderCases) {
          const testRes = await request(testApp)
            .get('/packages')
            .query({
              sort_by: sort,
              order: order,
            })
            .expect('Content-Type', /json/)

          expect(testRes.headers['content-type']).to.match(/json/)
          expect(testRes.status).to.eq(200)
          expect(testRes.body.data).to.be.an('array')
        }
      }
    })

    it('should return 400 when a bad param is used', (done) => {
      request(testApp)
        .get('/packages')
        .query({
          sort_by: 'bad',
        })
        .expect('Content-Type', /json/)
        .expect(400)
        .then((res) => {
          expect(res.body.errors).to.be.an('array')
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

  describe('create package', () => {
    const controller = new PackagesController()
    const testApp = express()
      .use(express.json())
      .use(injectUser)
      .use(controller.getRouter())
      .use(error)

    const mockPackageData = {
      credits: 10,
      name: 'test',
      price: 100,
    }

    it('should return 201 and the newly create package object', (done) => {
      sinon.stub(pkgsRepo, 'create').resolves({
        id: 1,
        ...mockPackageData,
      })

      request(testApp)
        .post('/packages')
        .send(mockPackageData)
        .expect('Content-Type', /json/)
        .expect(201)
        .then((res) => {
          expect(res.body.data).to.be.an('object')
          done()
        })
        .catch((err: Error) => done(err))
    })

    it('should return 400 when payload is not valid', async () => {
      const cases = [
        { credits: 'notanum', name: 'test', price: 100 },
        { credits: '$10', name: 'test', price: 100 },
        { credits: -1, name: 'test', price: 100 },
        { credits: 10 },
        { credits: 10, name: 'test' },
        { price: 10, name: 'test' },
      ]

      for (const tCase of cases) {
        const testRes = await request(testApp)
          .post('/packages')
          .send(tCase)
          .expect('Content-Type', /json/)

        expect(testRes.headers['content-type']).to.match(/json/)
        expect(testRes.status).to.eq(400)
        expect(testRes.body.errors).to.be.an('array')
      }
    })

    it('should return 409 when package name already exists', (done) => {
      sinon
        .stub(pkgsRepo, 'create')
        .throws(new DuplicateError('Key (name)=(test)'))

      request(testApp)
        .post('/packages')
        .send(mockPackageData)
        .expect('Content-Type', /json/)
        .expect(409)
        .then((res) => {
          expect(res.body.errors).to.be.an('array')
          done()
        })
        .catch((err: Error) => done(err))
    })

    it('should return 500 when a database error occurs', (done) => {
      sinon.stub(pkgsRepo, 'create').rejects()

      request(testApp)
        .post('/packages')
        .send(mockPackageData)
        .expect(500)
        .then((res) => {
          expect(res.body.errors).to.be.an('array')
          done()
        })
        .catch((err: Error) => done(err))
    })
  })

  describe('update package', () => {
    const controller = new PackagesController()
    const testApp = express()
      .use(express.json())
      .use(injectUser)
      .use(controller.getRouter())
      .use(error)

    const mockPackageData = {
      credits: 10,
      name: 'test',
      price: 100,
    }

    beforeEach(() => {
      sinon.stub(db, 'transaction').resolves({
        commit: sinon.stub(),
        rollback: sinon.stub(),
      })
    })

    afterEach(() => sinon.restore())

    it('should return 404 when the package does not exist', (done) => {
      sinon.stub(pkgsRepo, 'findById').resolves(null)

      request(testApp)
        .put('/packages/999')
        .send(mockPackageData)
        .expect('Content-Type', /json/)
        .expect(404)
        .then((res) => {
          expect(res.body.errors).to.be.an('array')
          done()
        })
        .catch((err: Error) => done(err))
    })

    it('should return 400 when payload is not valid', async () => {
      const cases = [
        { credits: 'notanum', name: 'test', price: 100 },
        { credits: '$10', name: 'test', price: 100 },
        { credits: -1, name: 'test', price: 100 },
        { credits: 10 },
        { credits: 10, name: 'test' },
        { price: 10, name: 'test' },
      ]

      for (const tCase of cases) {
        const testRes = await request(testApp)
          .put('/packages/1')
          .send(tCase)
          .expect('Content-Type', /json/)

        expect(testRes.headers['content-type']).to.match(/json/)
        expect(testRes.status).to.eq(400)
        expect(testRes.body.errors).to.be.an('array')
      }
    })

    it('should return 200 when the package is updated', (done) => {
      sinon.stub(pkgsRepo, 'findById').resolves({
        id: 1,
        ...mockPackageData,
      })
      sinon.stub(pkgsRepo, 'update').resolves({
        id: 1,
        ...mockPackageData,
      })

      request(testApp)
        .put('/packages/1')
        .send(mockPackageData)
        .expect('Content-Type', /json/)
        .expect(200)
        .then((res) => {
          expect(res.body.data).to.be.an('object')
          done()
        })
        .catch((err: Error) => done(err))
    })

    it('should return 409 when the name is already in use', (done) => {
      sinon.stub(pkgsRepo, 'findById').resolves({
        id: 1,
        ...mockPackageData,
      })
      sinon.stub(pkgsRepo, 'update').throws(new DuplicateError('Key (name)=(test)'))

      request(testApp)
        .put('/packages/1')
        .send(mockPackageData)
        .expect('Content-Type', /json/)
        .expect(409)
        .then((res) => {
          expect(res.body.errors).to.be.an('array')
          done()
        })
        .catch((err: Error) => done(err))
    })

    it('should return 500 when a database error occurs', (done) => {
      sinon.stub(pkgsRepo, 'findById').rejects()

      request(testApp)
        .put('/packages/1')
        .send(mockPackageData)
        .expect('Content-Type', /json/)
        .expect(500)
        .then((res) => {
          expect(res.body.errors).to.be.an('array')
          done()
        })
        .catch((err: Error) => done(err))
    })
  })

  describe('delete package', () => {
    const controller = new PackagesController()
    const testApp = express()
      .use(injectUser)
      .use(controller.getRouter())
      .use(error)

    it('should return 204 when the package is deleted', (done) => {
      sinon.stub(pkgsRepo, 'deletePackage').resolves()

      request(testApp)
        .delete('/packages/1')
        .expect(204)
        .then(() => done())
        .catch((err: Error) => done(err))
    })

    it('should return 500 when a database error occurs', (done) => {
      sinon.stub(pkgsRepo, 'deletePackage').rejects()

      request(testApp)
        .delete('/packages/1')
        .expect(500)
        .then((res) => {
          expect(res.body.errors).to.be.an('array')
          done()
        })
        .catch((err: Error) => done(err))
    })
  })
})
