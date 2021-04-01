import { DBPool, DBPoolClient } from './health'

class MockPoolClient implements DBPoolClient {
  async query() {
    return Promise.resolve(undefined)
  }

  release(): void {
    return
  }
}

export class MockPool implements DBPool {
  public async connect(): Promise<DBPoolClient> {
    return new MockPoolClient()
  }
}

export class MockBadPool implements DBPool {
  public async connect(): Promise<DBPoolClient> {
    return Promise.reject('failed to connect')
  }
}
