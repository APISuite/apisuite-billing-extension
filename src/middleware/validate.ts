import {
  NextFunction,
  Request,
  Response,
} from 'express'
import { ValidationChain, validationResult } from 'express-validator'
import { UserInputError } from '../controllers'
import { HandlerResponse } from '../types'

export const validate = (validations: ValidationChain[]) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<HandlerResponse> => {
    await Promise.all(validations.map(validation => validation.run(req)))

    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      next(new UserInputError(errors.array()))
    }

    next()
  }
}
