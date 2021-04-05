import { NextFunction, Request, Response, Router } from 'express'
import { AsyncHandlerResponse } from '../types'
import { BaseController } from './base'
import { db } from '../db'

export interface DBPoolClient {
  // eslint-disable-next-line  @typescript-eslint/no-explicit-any
  query(sql: string): Promise<any>
  release(): void
}

export interface DBPool {
  connect(): Promise<DBPoolClient>
}

export class HealthController implements BaseController {
  private readonly path = '/health'

  public getRouter(): Router {
    const router = Router()
    router.get(`${this.path}/`, this.getHealth)
    return router
  }

  public getHealth = async (req: Request, res: Response, next: NextFunction): AsyncHandlerResponse => {
    try {
      await db.raw('SELECT NOW();')
    } catch (err) {
      return next(err)
    }

    return res.status(200).json({
      status: 'ok',
      time: new Date().toISOString(),
    })
  }
}
