import { expect } from 'chai'
import {
  findById,
  findByPPSubscriptionId,
  create,
  update,
  incrementCredits,
  getOrBootstrapUser,
}
  from './user'
import { db } from '../db'


export default function run(): void {
  it('should return null when a user is not found', async () => {
    const testAssertions = (r: any) => {
      expect(r).to.eq(null)
    }
    const res = await findById(null, 1000)
    testAssertions(res)

    const trx = await db.transaction()
    try {
      const trxRes = await findById(null, 1000)
      await trx.commit()
      testAssertions(trxRes)
    } catch(err) {
      throw new Error('unexpected error')
    }
  })

  it('should return a user with id 1', async () => {
    const user = {
      id: 1,
      credits: 700,
      subscriptionId: null,
      ppCustomerId: null,
      ppMandateId: null,
      ppSubscriptionId: null,
    }

    const testAssertions = (r: any) => {
      expect(r).to.be.an('object')
      expect(r).to.deep.eq(user)
    }

    const res = await findById(null, 1)
    testAssertions(res)

    const trx = await db.transaction()
    try {
      const trxRes = await findById(null, 1)
      await trx.commit()
      testAssertions(trxRes)
    } catch(err) {
      throw new Error('unexpected error')
    }
  })

  it('should find a user by payment provider subscription id', async () => {
    const user = {
      id: 2,
      credits: 10000,
      subscriptionId: null,
      ppCustomerId: null,
      ppMandateId: null,
      ppSubscriptionId: 'ppsub',
    }

    const testAssertions = (r: any) => {
      expect(r).to.be.an('object')
      expect(r).to.deep.eq(user)
    }

    const res = await findByPPSubscriptionId(null, 'ppsub')
    testAssertions(res)

    const trx = await db.transaction()
    try {
      const trxRes = await findByPPSubscriptionId(null, 'ppsub')
      await trx.commit()
      testAssertions(trxRes)
    } catch(err) {
      throw new Error('unexpected error')
    }
  })

  it('should return a bootstrapped user with id 666', async () => {
    const user = {
      id: 666,
      credits: 100,
      subscriptionId: null,
      ppCustomerId: null,
      ppMandateId: null,
      ppSubscriptionId: null,
    }

    const testAssertions = (r: any) => {
      expect(r).to.be.an('object')
      expect(r).to.deep.eq(user)
    }

    const res = await getOrBootstrapUser(null, 666)
    testAssertions(res)

    const trx = await db.transaction()
    try {
      const trxRes = await getOrBootstrapUser(null, 666)
      await trx.commit()
      testAssertions(trxRes)
    } catch(err) {
      throw new Error('unexpected error')
    }
  })

  it('should create a user', async () => {
    const newUserData = {
      id: 999,
      credits: 10000,
      subscriptionId: null,
      ppCustomerId: null,
      ppMandateId: null,
      ppSubscriptionId: null,
      invoiceNotes: null,
    }

    const trx = await db.transaction()
    try {
      const res = await create(trx, newUserData)
      const usr = await findById(trx, res.id)
      await trx.commit()

      if (!usr) throw new Error('failed to create user')
      expect(usr).to.be.an('object')
      expect(usr).to.deep.eq({
        ...newUserData,
        subscriptionId: null,
        ppCustomerId: null,
        ppMandateId: null,
        ppSubscriptionId: null,
      })
    } catch(err) {
      throw new Error('unexpected error')
    }
  })

  it('should update all properties of a user', async () => {
    const newUserData = {
      credits: 1,
      subscriptionId: null,
      ppCustomerId: 'ppc1',
      ppMandateId: 'ppm1',
      ppSubscriptionId: 'pps1',
    }

    const testAssertions = (r: any) => {
      expect(r).to.be.an('object')
      expect(r).to.deep.eq({
        id: 1,
        ...newUserData,
      })
    }

    const res = await update(null, 1, newUserData)
    testAssertions(res)

    const trx = await db.transaction()
    try {
      const trxRes = await update(null, 1, newUserData)
      await trx.commit()
      testAssertions(trxRes)
    } catch(err) {
      throw new Error('unexpected error')
    }
  })

  it('should increment a user credits', async () => {
    const trx = await db.transaction()
    try {
      let usr = await findById(trx, 1)
      if (!usr) throw new Error('missing user')
      const beforeCredits = usr.credits
      await incrementCredits(trx, 1, 100)
      usr = await findById(trx, 1)
      if (!usr) throw new Error('missing user')
      await trx.commit()

      expect(usr.credits).to.eq(beforeCredits + 100)
    } catch(err) {
      throw new Error('unexpected error')
    }
  })
}
