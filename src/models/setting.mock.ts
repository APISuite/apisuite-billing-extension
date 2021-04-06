import { OptTransaction } from '../db'
import { ISettingsRepository, Setting } from './setting'

interface ISettingHashMap {
  [key: string]: Setting
}

export class MockSettingsRepository implements ISettingsRepository {
  public db: ISettingHashMap

  constructor() {
    this.db = {}
  }

  async findByName(trx: OptTransaction, name: string): Promise<string | null> {
    return this.db[name] ? this.db[name].value : null
  }

  async upsert(trx: OptTransaction, setting: Setting): Promise<Setting> {
    if (!this.db[setting.name]) {
      this.db[setting.name] = setting
    }
    this.db[setting.name].value = setting.value
    return this.db[setting.name]
  }
}
