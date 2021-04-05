import knex, { Knex } from 'knex'
import config from '../config'

export const db = knex({
  client: 'pg',
  connection: config.get('dbURI'),
  searchPath: ['knex', 'public'],
})

export interface Transaction extends Knex {
  commit(): any
  rollback(): any
}

export type OptTransaction = Transaction | null