import sinon from 'sinon'
import { fail } from 'assert'
import { mockRequest, mockResponse } from 'mock-req-res'
import { UsersController } from './users'
import { MockUsersRepository } from '../models/user.mock'

describe('users controller', () => {
  describe('get user details', () => {
    const repo = new MockUsersRepository()
    const controller = new UsersController(repo)

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
      repo.db[1] = {
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