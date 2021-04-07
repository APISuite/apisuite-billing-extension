import { db, OptTransaction } from '../db'
import { Optional } from '../types'

export interface Plan {
  id: number
  name: string
  price: number
  credits: number
  periodicity: string | null
}

export type PlanBase = Omit<Plan, 'id'>
export type PlanUpdate = Omit<Optional<Plan>, 'id'>

export interface IPlansRepository {
  findById: (trx: OptTransaction, id: number) => Promise<Plan | null>
  create: (trx: OptTransaction, plan: PlanBase) => Promise<Plan>
  update: (trx: OptTransaction, id: number, plan: PlanUpdate) => Promise<Plan>
}

export class PlansRepository implements IPlansRepository {
  public findById = async(trx: OptTransaction, id: number): Promise<Plan | null> => {
    const _db = trx ? trx : db

    const rows = await _db
      .select()
      .from('plans')
      .where('id', id)

    if (rows.length) {
      return rows[0]
    }

    return null
  }

  public create = async (trx: OptTransaction, plan: PlanBase): Promise<Plan> => {
    const _db = trx ? trx : db

    const rows = await _db
      .insert({
        name: plan.name,
        price: plan.price,
        credits: plan.credits,
        periodicity: plan.periodicity,
      })
      .into('plans')
      .returning('*')

    return {
      id: rows[0].id,
      name: rows[0].name,
      price: rows[0].price,
      credits: rows[0].credits,
      periodicity: rows[0].periodicity,
    }
  }

  public update = async (trx: OptTransaction, id: number, plan: PlanUpdate): Promise<Plan> => {
    const _db = trx ? trx : db

    const rows = await _db('plans')
      .update(plan)
      .where('id', id)
      .returning('*')

    return rows[0]
  }
}