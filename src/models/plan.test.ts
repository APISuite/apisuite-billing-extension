import { expect } from 'chai'
import { findAll, findById, update, deletePlan } from './plan'
import { db } from '../db'


export default function run(): void {
  it('should return a list of plans', async () => {
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

  it('should return null when a plan is not found', async () => {
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

  it('should return a plan with id 1', async () => {
    const plan = {
      id: 1,
      name: 'Starter Pack',
      price: '200.00',
      credits: 200,
      periodicity: null,
    }

    const testAssertions = (r: any) => {
      expect(r).to.be.an('object')
      expect(r).to.deep.eq(plan)
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

  it('should update all properties of a plan', async () => {
    const newPlanData = {
      name: 'Edited Starter Pack',
      price: 900,
      credits: 900,
      periodicity: '1 year',
    }

    const testAssertions = (r: any) => {
      expect(r).to.be.an('object')
      expect(r).to.deep.eq({
        id: 1,
        ...newPlanData,
        price: '900.00',
      })
    }

    const res = await update(null, 1, newPlanData)
    testAssertions(res)

    const trx = await db.transaction()
    try {
      const trxRes = await update(null, 1, newPlanData)
      await trx.commit()
      testAssertions(trxRes)
    } catch(err) {
      throw new Error('unexpected error')
    }
  })

  it('should delete a plan', async () => {
    const testAssertions = (r: any) => {
      expect(r).to.eq(3)
    }
    const res = await deletePlan(null, 3)
    testAssertions(res)

    const trx = await db.transaction()
    try {
      const trxRes = await deletePlan(null, 3)
      await trx.commit()
      testAssertions(trxRes)
    } catch(err) {
      throw new Error('unexpected error')
    }
  })

  it('should allow seamless transaction usage', async () => {
    const trx = await db.transaction()
    try {
      const plan = await findById(trx, 1)
      if (!plan) throw new Error()
      expect(plan).to.be.an('object')
      expect(plan.id).to.eq(1)

      await deletePlan(trx, 1)
      await trx.rollback()
    } catch(err) {
      await trx.rollback()
      throw new Error('unexpected error')
    }

    const plan = await findById(null, 1)
    if (!plan) throw new Error()
    expect(plan).to.be.an('object')
    expect(plan.id).to.eq(1)

    const trx2 = await db.transaction()
    try {
      const plan = await findById(trx2, 1)
      if (!plan) throw new Error()
      expect(plan).to.be.an('object')
      expect(plan.id).to.eq(1)

      await update(trx2, 1, { credits: 1 })
      await trx2.commit()
    } catch(err) {
      await trx2.rollback()
      throw new Error('unexpected error')
    }

    const plan2 = await findById(null, 1)
    if (!plan2) throw new Error()
    expect(plan2).to.be.an('object')
    expect(plan2.id).to.eq(1)
    expect(plan2.credits).to.eq(1)
  })
}
