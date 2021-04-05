import { User, IUsersRepository, UserBase } from './user'

interface IUserHashMap {
  [key: number]: User
}

export class MockUsersRepository implements IUsersRepository {
  public db: IUserHashMap

  constructor() {
    this.db = {}
  }

  async findById(id: number): Promise<User | null> {
    return this.db[id] || null
  }

  async create(user: UserBase): Promise<User> {
    this.db[user.id] = {
      id: user.id,
      credits: user.credits,
      planId: user.planId,
    }
    return this.db[user.id]
  }
}