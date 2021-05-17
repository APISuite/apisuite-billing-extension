import { db, OptTransaction, SortOrder } from '../db'
import { Optional } from '../types'
import log from '../log'
import { dbErrorParser } from './errors'

const TABLE = 'packages'

export interface Package {
  id: number
  name: string
  price: number
  credits: number
}

export const enum SortFields {
  NAME = 'name',
  PRICE = 'price',
  CREDITS = 'credits',
}

export interface PackageSortOptions {
  field: SortFields
  order: SortOrder,
}

export type PackageBase = Omit<Package, 'id'>
export type PackageUpdate = Omit<Optional<Package>, 'id'>

const findAll = async(trx: OptTransaction, sort: PackageSortOptions): Promise<Package[]> => {
  const _db = trx ? trx : db

  return _db
    .select()
    .from(TABLE)
    .orderBy(sort.field, sort.order)
}

const findById = async(trx: OptTransaction, id: number): Promise<Package | null> => {
  const _db = trx ? trx : db

  const rows = await _db
    .select()
    .from(TABLE)
    .where('id', id)

  if (rows.length) {
    return rows[0]
  }

  return null
}

const create = async (trx: OptTransaction, pkg: PackageBase): Promise<Package> => {
  const _db = trx ? trx : db

  const rows = await _db
    .insert(pkg)
    .into(TABLE)
    .returning('*')
    .catch((err) => {
      log.error(err)
      throw dbErrorParser(err)
    })

  return rows[0]
}

const update = async (trx: OptTransaction, id: number, pkg: PackageUpdate): Promise<Package> => {
  const _db = trx ? trx : db

  const rows = await _db(TABLE)
    .update(pkg)
    .where('id', id)
    .returning('*')
    .catch((err) => {
      log.error(err)
      throw dbErrorParser(err)
    })

  return rows[0]
}

const deletePackage = async (trx: OptTransaction, id: number): Promise<number> => {
  const _db = trx ? trx : db

  await _db(TABLE)
    .where('id', id)
    .del()

  return id
}

export {
  findAll,
  findById,
  create,
  update,
  deletePackage,
}