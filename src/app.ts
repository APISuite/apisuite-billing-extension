import express, {
  Application,
  Request,
  Response,
} from 'express'
import helmet from 'helmet'
import morgan from 'morgan'
import promBundle from 'express-prom-bundle'
import * as models from './models'
import { version } from '../package.json'
import { introspect, error } from './middleware/'
import {
  UsersController,
  BaseController,
  HealthController,
  PaymentsController,
  WebhooksController,
} from './controllers'

export default class App {
  private readonly app: Application

  constructor() {
    this.app = express()
    this.setupMiddleware()
    this.setupRoutes()
  }

  public getApp(): Application {
    return this.app
  }

  private setupMiddleware(): void {
    this.app.use(helmet())
    this.app.use(express.json())
    this.app.use(express.urlencoded({ extended: true }))

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
    const health = new HealthController()

    const ur = new models.UsersRepository()
    const pr = new models.PlansRepository()

    const users = new UsersController(ur, pr)
    const payments = new PaymentsController(ur)
    const webhooks = new WebhooksController()

    return [health, users, payments, webhooks]
  }
}
