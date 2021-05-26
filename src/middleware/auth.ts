import {
  Request,
  Response,
  NextFunction,
} from 'express'
import fetch from 'node-fetch'
import config from '../config'
import log from '../log'
import { AsyncHandlerResponse, HandlerResponse } from '../types'

const isAuthorizedRequest = (req: Request): boolean => {
  return !!(
    (req.headers.cookie && req.headers.cookie.length) ||
    (req.headers.authorization && req.headers.authorization.length)
  )
}

export const introspect = async (req: Request, res: Response, next: NextFunction): AsyncHandlerResponse => {
  res.locals.authenticatedUser = null

  if (isAuthorizedRequest(req)) {
    const url = config.get('apisuite.api') + config.get('apisuite.introspectEndpoint')
    const options = {
      method: 'GET',
      headers: {},
    }

    if (req.headers.authorization) {
      options.headers = { authorization: req.headers.authorization }
    }

    if (req.headers.cookie) {
      options.headers = { cookie: req.headers.cookie }
    }

    try {
      const response = await fetch(url, options)
      if (!response || response.status !== 200) {
        return res.status(401).json({ errors: ['invalid authentication cookie'] })
      }

      res.locals.authenticatedUser = await response.json()
    } catch (err) {
      log.error(err, '[introspect]')
      return res.status(500).json({ errors: ['could not introspect'] })
    }

    return next()
  }

  next()
}

export const authenticated = (req: Request, res: Response, next: NextFunction): HandlerResponse => {
  if (!res.locals.authenticatedUser) {
    return res.status(401).json({ errors: ['invalid authentication cookie'] })
  }

  next()
}

const isSelfCheck = (req: Request, res: Response) => Number(res.locals.authenticatedUser.id) === Number(req.params.id)
const isAdminCheck = (res: Response) => res.locals.authenticatedUser.role && res.locals.authenticatedUser.role.name === 'admin'

export const isSelf = (req: Request, res: Response, next: NextFunction): HandlerResponse => {
  if (isSelfCheck(req, res)) {
    return next()
  }

  return res.status(403).json({ errors: ['forbidden'] })
}

export const isAdmin = (req: Request, res: Response, next: NextFunction): HandlerResponse => {
  if (isAdminCheck(res)) {
    return next()
  }

  return res.status(403).json({ errors: ['forbidden'] })
}

export const isSelfOrAdmin = (req: Request, res: Response, next: NextFunction): HandlerResponse => {
  if (isSelfCheck(req, res) || isAdminCheck(res)) {
    return next()
  }

  return res.status(403).json({ errors: ['forbidden'] })
}