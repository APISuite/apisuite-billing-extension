import { Plan, IPlansRepository } from './plan'
import { OptTransaction } from '../db'

interface IPlanHashMap {
  [key: number]: Plan
}

export class MockPlansRepository implements IPlansRepository {
  public db: IPlanHashMap

  constructor() {
    this.db = {}
  }

  async findById(trx: OptTransaction, id: number): Promise<Plan | null> {
    return this.db[id] || null
  }
}
