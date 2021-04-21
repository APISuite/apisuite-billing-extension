import { db, OptTransaction } from '../db'

const TABLE = 'transactions'

export enum TransactionType {
  TopUp = 1,
  Consent = 2,
  Subscription = 3,
}

export interface Transaction {
  paymentId: string
  userId: number
  credits: number
  verified: boolean
  type: TransactionType
  amount: string
  createdAt: string
  updatedAt: string
}

export type TransactionBase = Omit<Transaction, 'createdAt' | 'updatedAt'>

export const findAllByUser = async (trx: OptTransaction, userId: number): Promise<Transaction> => {
  const _db = trx ? trx : db

  const rows = await _db
    .select()
    .from(TABLE)
    .where('user_id', userId)

  return rows[0]
}

export const create = async (trx: OptTransaction, transaction: TransactionBase): Promise<Transaction> => {
  const _db = trx ? trx : db

  const rows = await _db
    .insert(transaction)
    .into(TABLE)
    .returning('*')

  return rows[0]
}

export const setVerified = async (trx: OptTransaction, paymentId: string): Promise<Transaction> => {
  const _db = trx ? trx : db

  const rows = await _db(TABLE)
    .update({ verified: true })
    .where('payment_id', paymentId)
    .returning('*')

  return rows[0]
}
