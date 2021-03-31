import express, {
  Application,
  NextFunction,
  Request,
  Response
} from 'express'
import helmet from 'helmet'
import morgan from 'morgan'
import promBundle from 'express-prom-bundle'
import { v4 } from 'uuid'
import { Pool } from 'pg'
import log from './log'
import config from './config'
import * as models from './models'
import { UsersController } from './controllers'
import { version } from '../package.json'
import { introspect, authenticated } from './middleware/auth'

export default class App {
  private readonly app: Application
  private readonly dbPool: Pool
  private readonly usersController: UsersController

  constructor() {
    this.dbPool = new Pool({
      max: 20,
      connectionString: config.get('dbURI'),
      idleTimeoutMillis: 30000,
      ssl: false,
    })

    const ur = new models.UsersRepository(this.dbPool)
    this.usersController = new UsersController(ur)

    this.app = express()
    this.setupMiddleware()
    this.setupRoutes()
  }

  public getApp() {
    return this.app
  }

  public terminate() {
    this.dbPool.end()
  }

  private setupMiddleware() {
    this.app.use(helmet())
    this.app.use(express.json())

    morgan.token('body', (req: Request, res: Response) => JSON.stringify(req.body))
    this.app.use(morgan(':method :url :status - :body'))

    this.app.use(introspect)
  }

  private setupMetricsMiddleware() {
    const metricsMiddleware = promBundle({ includeMethod: true })
    this.app.use(metricsMiddleware)
  }

  private setupSystemRoutes() {
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

  private setupHealthCheckRoute() {
    this.app.get('/health', async (req: Request, res: Response, next: NextFunction) => {
      try {
        const client = await this.dbPool.connect()
        await client.query('SELECT NOW();')
        client.release()
      } catch (err) {
        return next(err)
      }

      return res.send({
        status: 'ok',
        time: new Date().toISOString(),
      })
    })
  }

  private setupRoutes() {
    this.setupHealthCheckRoute()
    this.setupMetricsMiddleware()
    this.app.get('/users/:id', authenticated, this.usersController.getUserDetails)
    this.setupSystemRoutes()
  }
}
