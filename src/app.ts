import express, {
  Application,
  NextFunction,
  Request,
  Response
} from 'express'
import helmet from 'helmet'
import morgan from 'morgan'
import { v4 } from 'uuid'
import { Pool } from 'pg'
import log from './log'
import config from './config'
import * as models from './models'
import { UsersController } from './controllers'
import { version } from '../package.json'

export default class App {
  private readonly app: Application
  private readonly dbPool: Pool

  constructor() {
    this.dbPool = new Pool({
      max: 20,
      connectionString: config.get('dbURI'),
      idleTimeoutMillis: 30000,
      ssl: false,
    })

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
    this.app.use(helmet())
    this.app.use(express.json())

    morgan.token('body', (req: Request, res: Response) => JSON.stringify(req.body))
    this.app.use(morgan(':method :url :status - :body'))
  }

  private setupRoutes() {
    const ur = new models.UsersRepository(this.dbPool)
    const uh = new UsersController(ur)

    this.app.get('/users/:id', uh.getUserDetails)

    this.app.get('/health', async (req: Request, res: Response, next: NextFunction) => {
      try {
        await this.dbPool.connect()
      } catch (err) {
        return next(err)
      }
      return res.send({ message: 'ok' })
    })

    this.app.use('/', (req: Request, res: Response) => {
      res.send({ version })
    })

    this.app.use('*', (req: Request, res: Response) => {
      res.status(404).send({ error: 'route not found' })
    })

    this.app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
      const errorId = v4()
      log.error({ err, error_id: errorId })
      res.status(500).send({
        error: `Oops! Something went wrong on our side. Error reference code: ${errorId}`
      })
    })
  }
}
