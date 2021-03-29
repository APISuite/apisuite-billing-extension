import { User, IUsersRepository } from './user'

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
}