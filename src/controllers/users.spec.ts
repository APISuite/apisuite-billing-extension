import sinon from 'sinon'
import { fail } from 'assert'
import { mockRequest, mockResponse } from 'mock-req-res'
import { UsersController } from './users'
import { MockUsersRepository } from '../models/user.mock'
import { MockPlansRepository } from '../models/plan.mock'

describe('users controller', () => {
  describe('get user details', () => {
    const uRepo = new MockUsersRepository()
    const pRepo = new MockPlansRepository()
    const controller = new UsersController(uRepo, pRepo)

    it('should return 404 when the user cannot be found', async () => {
      const req = mockRequest({
        params: { id: 1 },
      })
      const res = mockResponse()

      try {
        await controller.getUserDetails(req, res)
        sinon.assert.calledWith(res.status, 404)
      } catch(err) {
        fail('unexpected error')
      }
    })

    it('should return 200 when the user is found', async () => {
      uRepo.db[1] = {
        id: 1,
        credits: 100,
        planId: 1,
      }
      const req = mockRequest({
        params: { id: 1 },
      })
      const res = mockResponse()

      try {
        await controller.getUserDetails(req, res)
        sinon.assert.calledWith(res.status, 200)
      } catch(err) {
        fail('unexpected error')
      }
    })
  })
})
