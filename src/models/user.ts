import { Pool } from 'pg'
import * as sql from './user.sql'

export interface User {
  id: number
  credits: number
  planId: number
}

export interface IUsersRepository {
  findById: (id: number) => Promise<User | null>
}

export class UsersRepository implements IUsersRepository {
  private readonly dbPool: Pool

  constructor(dbPool: Pool) {
    this.dbPool = dbPool
  }

  public findById = async(id: number): Promise<User | null> => {
    const { rows } = await this.dbPool.query({
      text: sql.selectById,
      values: [id],
    })

    if (rows.length) {
      return rows[0]
    }

    return null
  }
}