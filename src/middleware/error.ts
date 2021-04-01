import {
  NextFunction,
  Request,
  Response,
} from 'express'
import log from '../log'
import { v4 } from 'uuid'

export const error = (err: Error, req: Request, res: Response, next: NextFunction) => {
  const errorId = v4()

  if (!testMode()) log.error({ err, error_id: errorId })

  res.status(500).send({
    error: `Oops! Something went wrong on our side. Error reference code: ${errorId}`
  })
}

const testMode = (): boolean => process.env.NODE_ENV === 'test'