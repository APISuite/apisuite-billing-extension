import { Request, Response, NextFunction, Handler } from 'express'

export const asyncWrap = (fn: Handler) =>
  (req: Request, res: Response, next: NextFunction): void => {
    Promise
      .resolve(fn(req, res, next))
      .catch(next)
  }