import { db, OptTransaction, SortOrder } from '../db'
import { Optional } from '../types'
import log from '../log'
import { dbErrorParser } from './errors'

const TABLE = 'subscriptions'

export interface Subscription {
  id: number
  name: string
  price: number
  credits: number
  periodicity: string
}

export type SubscriptionBase = Omit<Subscription, 'id'>
export type SubscriptionUpdate = Omit<Optional<Subscription>, 'id'>

export const enum SortFields {
  NAME = 'name',
  PRICE = 'price',
  CREDITS = 'credits',
}

export interface SubscriptionSortOptions {
  field: SortFields
  order: SortOrder,
}

const findAll = async(trx: OptTransaction, sort: SubscriptionSortOptions): Promise<Subscription[]> => {
  const _db = trx ? trx : db

  return _db
    .select()
    .from(TABLE)
    .orderBy(sort.field, sort.order)
}

const findById = async(trx: OptTransaction, id: number): Promise<Subscription | null> => {
  const _db = trx ? trx : db

  const rows = await _db
    .select()
    .from(TABLE)
    .where('id', id)

  if (rows.length) {
    return rows[0]
  }

  return null
}

const create = async (trx: OptTransaction, sub: SubscriptionBase): Promise<Subscription> => {
  const _db = trx ? trx : db

  const rows = await _db
    .insert(sub)
    .into(TABLE)
    .returning('*')
    .catch((err) => {
      log.error(err)
      throw dbErrorParser(err)
    })

  return rows[0]
}

const update = async (trx: OptTransaction, id: number, sub: SubscriptionUpdate): Promise<Subscription> => {
  const _db = trx ? trx : db

  const rows = await _db(TABLE)
    .update(sub)
    .where('id', id)
    .returning('*')
    .catch((err) => {
      log.error(err)
      throw dbErrorParser(err)
    })

  return rows[0]
}

const deleteSubscription = async (trx: OptTransaction, id: number): Promise<number> => {
  const _db = trx ? trx : db

  await _db(TABLE)
    .where('id', id)
    .del()

  return id
}

export {
  findAll,
  findById,
  create,
  update,
  deleteSubscription,
}