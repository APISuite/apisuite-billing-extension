import {
  NextFunction,
  Request,
  Response,
} from 'express'
import { HandlerResponse } from '../types'
import { validationResult } from 'express-validator'
import { UserInputError } from '../controllers'

export const validator = (req: Request, res: Response, next: NextFunction): HandlerResponse => {
  const errors = validationResult(req)

  if (!errors.isEmpty()) {
    next(new UserInputError(errors.array()))
  }

  next()
}
