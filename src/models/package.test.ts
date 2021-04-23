import { expect } from 'chai'
import { findAll, findById, update, deletePackage } from './package'
import { db } from '../db'


export default function run(): void {
  it('should return a list of packages', async () => {
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

  it('should return null when a package is not found', async () => {
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

  it('should return a package with id 1', async () => {
    const pkg = {
      id: 1,
      name: 'Starter Pack',
      price: 200.55,
      credits: 200.1,
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

  it('should update all properties of a package', async () => {
    const newPkgData = {
      name: 'Edited Starter Pack',
      price: 900,
      credits: 900,
    }

    const testAssertions = (r: any) => {
      expect(r).to.be.an('object')
      expect(r).to.deep.eq({
        id: 1,
        ...newPkgData,
        price: 900,
      })
    }

    const res = await update(null, 1, newPkgData)
    testAssertions(res)

    const trx = await db.transaction()
    try {
      const trxRes = await update(null, 1, newPkgData)
      await trx.commit()
      testAssertions(trxRes)
    } catch(err) {
      throw new Error('unexpected error')
    }
  })

  it('should delete a package', async () => {
    const testAssertions = (r: any) => {
      expect(r).to.eq(3)
    }
    const res = await deletePackage(null, 3)
    testAssertions(res)

    const trx = await db.transaction()
    try {
      const trxRes = await deletePackage(null, 3)
      await trx.commit()
      testAssertions(trxRes)
    } catch(err) {
      throw new Error('unexpected error')
    }
  })

  it('should allow seamless transaction usage', async () => {
    const trx = await db.transaction()
    try {
      const pkg = await findById(trx, 1)
      if (!pkg) throw new Error()
      expect(pkg).to.be.an('object')
      expect(pkg.id).to.eq(1)

      await deletePackage(trx, 1)
      await trx.rollback()
    } catch(err) {
      await trx.rollback()
      throw new Error('unexpected error')
    }

    const pkg = await findById(null, 1)
    if (!pkg) throw new Error()
    expect(pkg).to.be.an('object')
    expect(pkg.id).to.eq(1)

    const trx2 = await db.transaction()
    try {
      const pkg = await findById(trx2, 1)
      if (!pkg) throw new Error()
      expect(pkg).to.be.an('object')
      expect(pkg.id).to.eq(1)

      await update(trx2, 1, { credits: 1 })
      await trx2.commit()
    } catch(err) {
      await trx2.rollback()
      throw new Error('unexpected error')
    }

    const pkg2 = await findById(null, 1)
    if (!pkg2) throw new Error()
    expect(pkg2).to.be.an('object')
    expect(pkg2.id).to.eq(1)
    expect(pkg2.credits).to.eq(1)
  })
}
