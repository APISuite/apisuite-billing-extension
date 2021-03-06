import { db, OptTransaction } from '../db'

export interface Setting {
  name: string
  value: string | null
}

export enum SettingKeys {
  DefaultCredits = "default_credits"
}

const findByName = async (trx: OptTransaction, name: string): Promise<string | null> => {
  const _db = trx ? trx : db

  const rows = await _db
    .select()
    .from('settings')
    .where('name', name)

  if (rows.length) {
    return rows[0].value
  }

  return null
}

const upsert = async (trx: OptTransaction, setting: Setting): Promise<Setting> => {
  const _db = trx ? trx : db

  const rows = await _db
    .insert({
      name: setting.name,
      value: setting.value,
    })
    .into('settings')
    .onConflict('name')
    .merge()
    .returning('*')

  return {
    name: rows[0].name,
    value: rows[0].value,
  }
}

export {
  findByName,
  upsert,
}