import {
  NextFunction,
  Request,
  Response,
} from 'express'
import log from '../log'
import { v4 } from 'uuid'
import { HandlerResponse } from '../types'
import { UserInputError } from '../controllers'

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const error = (err: Error, req: Request, res: Response, next: NextFunction): HandlerResponse => {
  if (err instanceof UserInputError) {
    return res.status(400).json({ errors: err.errors })
  }

  const errorId = v4()

  log.error({ err, error_id: errorId })

  res.status(500).json({
    error: `Oops! Something went wrong on our side. Error reference code: ${errorId}`,
  })
}
