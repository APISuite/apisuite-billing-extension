import { db, OptTransaction } from '../db'
import { Optional } from '../types'
import log from '../log'
import { dbErrorParser } from './errors'

const TABLE = 'organizations'

export interface Organization {
  id: number
  credits: number
  subscriptionId: number | null
  ppCustomerId: string | null
  ppSubscriptionId: string | null
  invoiceNotes: string | null
}

export type OrganizationBase = Pick<Organization, 'id' | 'credits'>
export type OrganizationUpdate = Omit<Optional<Organization>, 'id'>

const findById = async(trx: OptTransaction, id: number): Promise<Organization | null> => {
  const _db = trx ? trx : db

  const rows = await _db
    .select('*')
    .from(TABLE)
    .where('id', id)

  if (rows.length) {
    return rows[0]
  }

  return null
}

const create = async (trx: OptTransaction, org: OrganizationBase): Promise<Organization> => {
  const _db = trx ? trx : db

  const rows = await _db
    .insert(org)
    .into(TABLE)
    .returning('*')
    .catch((err) => {
      log.error(err)
      throw dbErrorParser(err)
    })

  return rows[0]
}

const update = async (trx: OptTransaction, id: number, org: OrganizationUpdate): Promise<Organization> => {
  const _db = trx ? trx : db

  const rows = await _db(TABLE)
    .update(org)
    .where('id', id)
    .returning('*')
    .catch((err) => {
      log.error(err)
      throw dbErrorParser(err)
    })

  return rows[0]
}

const updateCredits = async (trx: OptTransaction, id: number, amount: number): Promise<number> => {
  const _db = trx ? trx : db

  const rows = await _db(TABLE)
    .where('id', id)
    .increment('credits', amount)
    .returning('credits')

  return rows[0].credits
}

const findByPPSubscriptionId = async(trx: OptTransaction, subscriptionId: string): Promise<Organization | null> => {
  const _db = trx ? trx : db

  const rows = await _db
    .select('*')
    .from(TABLE)
    .where('pp_subscription_id', subscriptionId)

  if (rows.length) {
    return rows[0]
  }

  return null
}

const del = async (trx: OptTransaction, id: number): Promise<number> => {
  const _db = trx ? trx : db

  await _db(TABLE)
    .where('id', id)
    .del()

  return id
}

export {
  findById,
  create,
  update,
  del,
  updateCredits,
  findByPPSubscriptionId,
}
