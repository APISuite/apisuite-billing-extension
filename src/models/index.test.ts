import { db } from '../db'
import plan from './plan.test'

before(async () => {
  await db.migrate.latest()
  await db.seed.run()
})

after(async () => {
  await db.migrate.rollback({}, true)
})

describe('database integration tests', () => {
  describe('plan', plan.bind(this))
})