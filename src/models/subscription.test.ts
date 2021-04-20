import { expect } from 'chai'
import { findAll, findById, update, deleteSubscription } from './subscription'
import { db } from '../db'


export default function run(): void {
  it('should return a list of subscriptions', async () => {
    const testAssertions = (r: any) => {
      expect(r).to.be.an('array')
      expect(r.length).to.eq(3)
    }
    const res = await findAll(null)
    testAssertions(res)

    const trx = await db.transaction()
    try {
      const trxRes = await findAll(trx)
      await trx.commit()
      testAssertions(trxRes)
    } catch(err) {
      throw new Error('unexpected error')
    }
  })

  it('should return null when a subscription is not found', async () => {
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

  it('should return a subscription with id 1', async () => {
    const pkg = {
      id: 1,
      name: 'Starter Subscription',
      price: '200.00',
      credits: 200,
      periodicity: '1 month',
    }

    const testAssertions = (r: any) => {
      expect(r).to.be.an('object')
      expect(r).to.deep.eq(pkg)
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

  it('should update all properties of a subscription', async () => {
    const newSubData = {
      name: 'Edited Starter Pack',
      price: 900,
      credits: 900,
      periodicity: '2 months',
    }

    const testAssertions = (r: any) => {
      expect(r).to.be.an('object')
      expect(r).to.deep.eq({
        id: 1,
        ...newSubData,
        price: '900.00',
      })
    }

    const res = await update(null, 1, newSubData)
    testAssertions(res)

    const trx = await db.transaction()
    try {
      const trxRes = await update(null, 1, newSubData)
      await trx.commit()
      testAssertions(trxRes)
    } catch(err) {
      throw new Error('unexpected error')
    }
  })

  it('should delete a subscription', async () => {
    const testAssertions = (r: any) => {
      expect(r).to.eq(3)
    }
    const res = await deleteSubscription(null, 3)
    testAssertions(res)

    const trx = await db.transaction()
    try {
      const trxRes = await deleteSubscription(null, 3)
      await trx.commit()
      testAssertions(trxRes)
    } catch(err) {
      throw new Error('unexpected error')
    }
  })

  it('should allow seamless transaction usage', async () => {
    const trx = await db.transaction()
    try {
      const sub = await findById(trx, 1)
      if (!sub) throw new Error()
      expect(sub).to.be.an('object')
      expect(sub.id).to.eq(1)

      await deleteSubscription(trx, 1)
      await trx.rollback()
    } catch(err) {
      await trx.rollback()
      throw new Error('unexpected error')
    }

    const sub = await findById(null, 1)
    if (!sub) throw new Error()
    expect(sub).to.be.an('object')
    expect(sub.id).to.eq(1)

    const trx2 = await db.transaction()
    try {
      const sub = await findById(trx2, 1)
      if (!sub) throw new Error()
      expect(sub).to.be.an('object')
      expect(sub.id).to.eq(1)

      await update(trx2, 1, { credits: 1 })
      await trx2.commit()
    } catch(err) {
      await trx2.rollback()
      throw new Error('unexpected error')
    }

    const sub2 = await findById(null, 1)
    if (!sub2) throw new Error()
    expect(sub2).to.be.an('object')
    expect(sub2.id).to.eq(1)
    expect(sub2.credits).to.eq(1)
  })
}
