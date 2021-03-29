import express from 'express'
import morgan from 'morgan'
import { Pool } from 'pg'
import log from './log'
import config from './config'
import * as models from './models'
import { UsersController } from './controllers'
import { version } from '../package.json'

export default class App {
  private readonly app: express.Application
  private readonly dbPool: Pool

  constructor() {
    log.info('connecting to PostgreSQL database')
    this.dbPool = new Pool({
      max: 20,
      connectionString: config.get('dbURI'),
      idleTimeoutMillis: 30000
    })
    log.info('connected to database')

    this.app = express()
    this.setupMiddleware()
    this.setupRoutes()
  }

  public getApp() {
    return this.app
  }

  public terminate() {
    log.info('closing PostgreSQL pool connection')
    this.dbPool.end()
  }

  private setupMiddleware() {
    this.app.use(express.json())

    morgan.token('body', (req: express.Request, res: express.Response) => JSON.stringify(req.body))
    this.app.use(morgan(':method :url :status - :body'))
  }

  private setupRoutes() {
    const ur = new models.UsersRepository(this.dbPool)
    const uh = new UsersController(ur)

    this.app.use('/users/:id', uh.getUserDetails)

    this.app.use('*', (req: express.Request, res: express.Response) => {
      res.status(404).send({ error: 'route not found' })
    })

    this.app.use('/', (req: express.Request, res: express.Response) => {
      res.send({ version })
    })
  }
}
