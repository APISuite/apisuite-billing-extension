import { db, OptTransaction } from '../db'
import { Optional } from '../types'
import { setting as settingsRepo } from './index'
import { SettingKeys } from './setting'

const TABLE = 'users'

export interface User {
  id: number
  credits: number
  subscriptionId: number | null
  ppCustomerId: string | null
  ppMandateId: string | null
  ppSubscriptionId: string | null
  invoiceNotes: string | null
}

export type UserBase = Omit<User, 'ppCustomerId' | 'ppMandateId' | 'ppSubscriptionId'>
export type UserUpdate = Omit<Optional<User>, 'id'>

// take an object instead?s
const getOrBootstrapUser = async (trx: OptTransaction, userID: number): Promise<User> => {
  const _db = trx ? trx : db
  const user = await findById(trx, userID)
  if (user) return user

  const defaultCredits = Number(await settingsRepo.findByName(trx, SettingKeys.DefaultCredits))

  const rows = await _db
    .insert({
      id: userID,
      credits: defaultCredits,
      subscriptionId: null,
    })
    .into(TABLE)
    .onConflict('id')
    .ignore()
    .returning('*')

  return rows[0]
}

const findById = async(trx: OptTransaction, id: number): Promise<User | null> => {
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

const create = async (trx: OptTransaction, user: UserBase): Promise<User> => {
  const _db = trx ? trx : db

  const rows = await _db
    .insert(user)
    .into(TABLE)
    .returning('*')

  return rows[0]
}

const update = async (trx: OptTransaction, id: number, user: UserUpdate): Promise<User> => {
  const _db = trx ? trx : db

  const rows = await _db(TABLE)
    .update(user)
    .where('id', id)
    .returning('*')

  return rows[0]
}

const incrementCredits = async (trx: OptTransaction, id: number, amount: number): Promise<number> => {
  const _db = trx ? trx : db

  const rows = await _db(TABLE)
    .where('id', id)
    .increment('credits', amount)
    .returning('credits')

  return rows[0].credits
}

const findByPPSubscriptionId = async(trx: OptTransaction, subscriptionId: string): Promise<User | null> => {
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

const deleteUser = async (trx: OptTransaction, id: number): Promise<number> => {
  const _db = trx ? trx : db

  await _db(TABLE)
    .where('id', id)
    .del()

  return id
}

export {
  getOrBootstrapUser,
  findById,
  create,
  update,
  deleteUser,
  incrementCredits,
  findByPPSubscriptionId,
}
