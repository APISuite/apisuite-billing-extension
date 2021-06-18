import {
  NextFunction,
  Request,
  Response,
} from 'express'
import log from '../log'
import { v4 } from 'uuid'
import { HandlerResponse } from '../types'
import {
  UserInputError,
  PurchasePreconditionError,
  NotFoundError, ForbiddenError,
} from '../controllers'
import { DuplicateError } from '../models/errors'

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const error = (err: Error, req: Request, res: Response, next: NextFunction): HandlerResponse => {
  if (err instanceof UserInputError) {
    return res.status(400).json({ errors: err.errors })
  }

  if (err instanceof PurchasePreconditionError) {
    return res.status(400).json({ errors: [err.message] })
  }

  if (err instanceof ForbiddenError) {
    return res.status(403).json({ errors: [err.message] })
  }

  if (err instanceof NotFoundError) {
    return res.status(404).json({ errors: [err.message] })
  }

  if (err instanceof DuplicateError) {
    return res.status(409).json({ errors: [err.message] })
  }

  const errorId = v4()

  log.error({ err, error_id: errorId })

  res.status(500).json({
    errors: [`Oops! Something went wrong on our side. Error reference code: ${errorId}`],
  })
}
