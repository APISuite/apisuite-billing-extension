import { db, OptTransaction } from '../db'
import { Optional } from '../types'

export interface User {
  id: number
  credits: number
  planId: number | null
  customerId: string | null
}

export type UserBase = Omit<User, 'customerId'>
export type UserUpdate = Omit<Optional<User>, 'id'>

const findById = async(trx: OptTransaction, id: number): Promise<User | null> => {
  const _db = trx ? trx : db

  const rows = await _db
    .select()
    .from('users')
    .where('id', id)

  if (rows.length) {
    return {
      id: rows[0].id,
      credits: rows[0].credits,
      planId: rows[0].plan_id,
      customerId: rows[0].costumer_id,
    }
  }

  return null
}

const create = async (trx: OptTransaction, user: UserBase): Promise<User> => {
  const _db = trx ? trx : db

  const rows = await _db
    .insert({
      id: user.id,
      credits: user.credits,
      plan_id: user.planId,
    })
    .into('users')
    .returning('*')

  return {
    id: rows[0].id,
    credits: rows[0].credits,
    planId: rows[0].plan_id,
    customerId: rows[0].customer_id,
  }
}

const update = async (trx: OptTransaction, id: number, user: UserUpdate): Promise<User> => {
  const _db = trx ? trx : db

  const rows = await _db('users')
    .update(user)
    .where('id', id)
    .returning('*')

  return {
    id: rows[0].id,
    credits: rows[0].credits,
    planId: rows[0].plan_id,
    customerId: rows[0].customer_id,
  }
}

const incrementCredits = async (trx: OptTransaction, id: number, amount: number): Promise<number> => {
  const _db = trx ? trx : db

  const rows = await _db('users')
    .where('id', id)
    .increment('credits', amount)
    .returning('credits')

  return rows[0].credits
}

export {
  findById,
  create,
  update,
  incrementCredits,
}
