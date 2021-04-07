import { Plan, IPlansRepository, PlanBase, PlanUpdate } from './plan'
import { OptTransaction } from '../db'

interface IPlanHashMap {
  [key: number]: Plan
}

export class MockPlansRepository implements IPlansRepository {
  public db: IPlanHashMap

  constructor() {
    this.db = {}
  }

  async findAll(trx: OptTransaction): Promise<Plan[]> {
    return Object.values(this.db)
  }

  async findById(trx: OptTransaction, id: number): Promise<Plan | null> {
    return this.db[id] || null
  }

  async create(trx: OptTransaction, plan: PlanBase): Promise<Plan> {
    const id = new Date().getTime()
    this.db[id] = {
      id: id,
      name: plan.name,
      price: plan.price,
      credits: plan.credits,
      periodicity: plan.periodicity,
    }
    return this.db[id]
  }

  async update(trx: OptTransaction, id: number, plan: PlanUpdate): Promise<Plan> {
    if (plan.name) this.db[id].name = plan.name
    if (plan.price) this.db[id].price = plan.price
    if (plan.credits) this.db[id].credits = plan.credits
    if (plan.periodicity) this.db[id].periodicity = plan.periodicity
    return this.db[id]
  }

  async delete(trx: OptTransaction, id: number): Promise<number> {
    delete this.db[id]
    return id
  }
}
