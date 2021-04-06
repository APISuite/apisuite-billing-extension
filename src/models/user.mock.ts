import { User, IUsersRepository, UserBase, UserUpdate } from './user'
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
      customerId: '',
    }
    return this.db[user.id]
  }

  async update(trx: OptTransaction, id: number, user: UserUpdate): Promise<User> {
    if (user.planId) this.db[id].planId = user.planId
    if (user.credits) this.db[id].credits = user.credits
    if (user.customerId) this.db[id].customerId = user.customerId
    return this.db[id]
  }
}
