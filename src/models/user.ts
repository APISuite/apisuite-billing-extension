import { db, OptTransaction } from '../db'
import { Optional } from '../types'

export interface User {
  id: number
  credits: number
  planId: number
  customerId: string
}

export type UserBase = Omit<User, 'customerId'>
export type UserUpdate = Omit<Optional<User>, 'id'>

export interface IUsersRepository {
  findById: (trx: OptTransaction, id: number) => Promise<User | null>
  create: (trx: OptTransaction, user: UserBase) => Promise<User>
  update: (trx: OptTransaction, id: number, user: UserUpdate) => Promise<User>
}

export class UsersRepository implements IUsersRepository {
  public findById = async(trx: OptTransaction, id: number): Promise<User | null> => {
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

  public create = async (trx: OptTransaction, user: UserBase): Promise<User> => {
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

  public update = async (trx: OptTransaction, id: number, user: UserUpdate): Promise<User> => {
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
}
