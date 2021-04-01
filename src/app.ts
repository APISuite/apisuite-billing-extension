import express, {
  Application,
  Request,
  Response,
} from 'express'
import helmet from 'helmet'
import morgan from 'morgan'
import promBundle from 'express-prom-bundle'
import { Pool } from 'pg'
import config from './config'
import * as models from './models'
import { UsersController } from './controllers'
import { version } from '../package.json'
import { introspect, error } from './middleware/'
import { BaseController } from './controllers/base'
import { HealthController } from './controllers/health'

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

  public getApp(): Application {
    return this.app
  }

  public terminate(): void {
    this.dbPool.end()
  }

  private setupMiddleware(): void {
    this.app.use(helmet())
    this.app.use(express.json())

    morgan.token('body', (req: Request) => JSON.stringify(req.body))
    this.app.use(morgan(':method :url :status - :body'))

    this.app.use(promBundle({ includeMethod: true }))

    this.app.use(introspect)
  }

  private setupSystemRoutes(): void {
    this.app.use('/', (req: Request, res: Response) => {
      res.json({ version })
    })

    this.app.use('*', (req: Request, res: Response) => {
      res.status(404).json({ error: 'route not found' })
    })
  }

  private setupRoutes(): void {
    const controllers = this.initControllers()
    controllers.forEach((c) => this.app.use(c.getRouter()))

    this.setupSystemRoutes()
    this.app.use(error)
  }

  private initControllers(): Array<BaseController> {
    const health = new HealthController(this.dbPool)

    const ur = new models.UsersRepository(this.dbPool)
    const users = new UsersController(ur)

    return [health, users]
  }
}
