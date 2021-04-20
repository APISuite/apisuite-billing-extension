import { db, OptTransaction } from '../db'
import { Optional } from '../types'
import { setting as settingsRepo } from './index'
import { SettingKeys } from './setting'
import { Plan } from './plan'

export interface User {
  id: number
  credits: number
  planId: number | null
  customerId: string | null
  mandateId: string | null
  subscriptionId: string | null
}

export type UserBase = Omit<User, 'customerId' | 'mandateId' | 'subscriptionId'>
export type UserUpdate = Omit<Optional<User>, 'id'>

const getOrBootstrapUser = async (trx: OptTransaction, userID: number): Promise<User> => {
  const user = await findById(trx, userID)
  if (user) return user

  const defaultCredits = Number(await settingsRepo.findByName(trx, SettingKeys.DefaultCredits))

  return create(trx, {
    id: userID,
    credits: defaultCredits,
    planId: null,
  })
}

const findById = async(trx: OptTransaction, id: number): Promise<User | null> => {
  const _db = trx ? trx : db

  const rows = await _db
    .select('*')
    .from('users')
    .where('id', id)

  if (rows.length) {
    return rows[0]
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

  return rows[0]
}

const update = async (trx: OptTransaction, id: number, user: UserUpdate): Promise<User> => {
  const _db = trx ? trx : db

  const rows = await _db('users')
    .update(user)
    .where('id', id)
    .returning('*')

  return rows[0]
}

const incrementCredits = async (trx: OptTransaction, id: number, amount: number): Promise<number> => {
  const _db = trx ? trx : db

  const rows = await _db('users')
    .where('id', id)
    .increment('credits', amount)
    .returning('credits')

  return rows[0].credits
}

const getUserPlan = async (trx: OptTransaction, id: number): Promise<Plan> => {
  const _db = trx ? trx : db

  const rows = await _db
    .select('plans.*')
    .from('users')
    .join('plans', 'users.plan_id', 'plans.id')
    .where('users.id', id)

  return rows[0]
}

const findBySubscriptionId = async(trx: OptTransaction, subscriptionId: string): Promise<User | null> => {
  const _db = trx ? trx : db

  const rows = await _db
    .select('*')
    .from('users')
    .where('subscription_id', subscriptionId)

  if (rows.length) {
    return rows[0]
  }

  return null
}

export {
  getOrBootstrapUser,
  findById,
  create,
  update,
  incrementCredits,
  getUserPlan,
  findBySubscriptionId,
}
