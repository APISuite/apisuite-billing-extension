import { db, OptTransaction } from '../db'

export interface Plan {
  id: number
  name: string
  price: number
  credits: number
  periodicity: number
}

export interface IPlansRepository {
  findById: (trx: OptTransaction, id: number) => Promise<Plan | null>
}

export class PlansRepository implements IPlansRepository {
  public findById = async(trx: OptTransaction, id: number): Promise<Plan | null> => {
    const _db = trx ? trx : db

    const rows = await _db
      .select()
      .from('plans')
      .where('id', id)

    if (rows.length) {
      return {
        id: rows[0].id,
        name: rows[0].name,
        price: rows[0].price,
        credits: rows[0].credits,
        periodicity: rows[0].periodicity,
      }
    }

    return null
  }
}