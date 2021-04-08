import { OptTransaction } from '../db'
import { ITransactionsRepository, Transaction, TransactionBase } from './transaction'

export class MockTransactionsRepository implements ITransactionsRepository {
  async create(trx: OptTransaction, transaction: TransactionBase): Promise<Transaction> {
    return {
      credits: transaction.credits,
      paymentId: transaction.paymentId,
      userId: transaction.userId,
      updatedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    }
  }

  async setVerified(trx: OptTransaction, paymentId: string): Promise<Transaction> {
    return {
      paymentId,
      credits: 100,
      userId: 12345,
      updatedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    }
  }



}
