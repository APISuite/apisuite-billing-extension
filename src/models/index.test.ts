import { db } from '../db'
import pkg from './package.test'
import subscription from './subscription.test'
import user from './user.test'

before(async () => {
  await db.migrate.latest()
  await db.seed.run()
})

after(async () => {
  await db.migrate.rollback({}, true)
})

describe('database integration tests', () => {
  describe('package', pkg.bind(this))
  describe('subscription', subscription.bind(this))
  describe('user', user.bind(this))
})