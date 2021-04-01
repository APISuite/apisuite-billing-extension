import { NextFunction, Request, Response, Router } from 'express'
import { BaseController } from './base'

export interface DBPoolClient {
  query(sql: string): Promise<any>
  release(): void
}

export interface DBPool {
  connect(): Promise<DBPoolClient>
}

export class HealthController implements BaseController {
  private readonly path = '/health'
  private pool: DBPool

  constructor(pool: DBPool) {
    this.pool = pool
  }

  public getRouter(): Router {
    const router = Router()
    router.get(`${this.path}/`, this.getHealth)
    return router
  }

  public getHealth = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const client = await this.pool.connect()
      await client.query('SELECT NOW();')
      client.release()
    } catch (err) {
      return next(err)
    }

    return res.send({
      status: 'ok',
      time: new Date().toISOString(),
    })
  }
}
