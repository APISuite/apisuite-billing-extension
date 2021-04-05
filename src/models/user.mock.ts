import { User, IUsersRepository, UserBase } from './user'
import { OptTransaction } from '../db'

interface IUserHashMap {
  [key: number]: User
}

export class MockUsersRepository implements IUsersRepository {
  public db: IUserHashMap

  constructor() {
    this.db = {}
  }

  async findById(trx: OptTransaction, id: number): Promise<User | null> {
    return this.db[id] || null
  }

  async create(trx: OptTransaction, user: UserBase): Promise<User> {
    this.db[user.id] = {
      id: user.id,
      credits: user.credits,
      planId: user.planId,
    }
    return this.db[user.id]
  }
}
