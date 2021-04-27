import {
  NextFunction,
  Request,
  Response,
} from 'express'
import log from '../log'
import { v4 } from 'uuid'
import { HandlerResponse } from '../types'
import {
  PurchasePreconditionError,
  UserInputError,
} from '../controllers'

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const error = (err: Error, req: Request, res: Response, next: NextFunction): HandlerResponse => {
  if (err instanceof UserInputError) {
    return res.status(400).json({ errors: err.errors })
  }

  if (err instanceof PurchasePreconditionError) {
    return res.status(400).json({ errors: [err.message] })
  }

  const errorId = v4()

  log.error({ err, error_id: errorId })

  res.status(500).json({
    errors: [`Oops! Something went wrong on our side. Error reference code: ${errorId}`],
  })
}
