import { db, OptTransaction } from '../db'

export interface Transaction {
  paymentId: string
  userId: number
  credits: number
  createdAt: string
  updatedAt: string
}

export type TransactionBase = Omit<Transaction, 'createdAt' | 'updatedAt'>

export interface ITransactionsRepository {
  create: (trx: OptTransaction, transaction: TransactionBase) => Promise<Transaction>
  setVerified: (trx: OptTransaction, paymentId: string) => Promise<Transaction>
}

export class TransactionsRepository implements ITransactionsRepository {
  public create = async (trx: OptTransaction, transaction: TransactionBase): Promise<Transaction> => {
    const _db = trx ? trx : db

    const rows = await _db
      .insert({
        user_id: transaction.userId,
        payment_id: transaction.paymentId,
        credits: transaction.credits,
      })
      .into('transactions')
      .returning('*')

    return {
      paymentId: rows[0].payment_id,
      credits: rows[0].credits,
      userId: rows[0].user_id,
      createdAt: rows[0].created_at,
      updatedAt: rows[0].updated_at,
    }
  }

  public setVerified = async (trx: OptTransaction, paymentId: string): Promise<Transaction> => {
    const _db = trx ? trx : db

    const rows = await _db('transactions')
      .update({ verified: true })
      .where('payment_id', paymentId)
      .returning('*')

    return {
      paymentId: rows[0].payment_id,
      credits: rows[0].credits,
      userId: rows[0].user_id,
      createdAt: rows[0].created_at,
      updatedAt: rows[0].updated_at,
    }
  }
}
