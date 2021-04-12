import knex, { Knex } from 'knex'
import config from '../config'

const camelToSnakeCase = (str: string): string => {
  return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`)
}

export const db = knex({
  client: 'pg',
  connection: config.get('dbURI'),
  searchPath: ['knex', 'public'],
  wrapIdentifier: (value, origImpl) => origImpl(camelToSnakeCase(value)),
})

export interface Transaction extends Knex {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  commit(): any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  rollback(): any
}

export type OptTransaction = Transaction | null
