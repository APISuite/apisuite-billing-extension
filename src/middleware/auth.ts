import {
  Request,
  Response,
  NextFunction,
} from 'express'
import fetch from 'node-fetch'
import config from '../config'
import log from '../log'
import { AsyncHandlerResponse, HandlerResponse } from '../types'

export const introspect = async (req: Request, res: Response, next: NextFunction): AsyncHandlerResponse => {
  res.locals.authenticatedUser = null

  if (req.headers.cookie && req.headers.cookie.length) {
    const url = config.get('apisuite.api') + config.get('apisuite.introspectEndpoint')
    const options = {
      method: 'GET',
      headers: {
        cookie: req.headers.cookie,
      },
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

export const isSelf = (req: Request, res: Response, next: NextFunction): HandlerResponse => {
  if (Number(res.locals.authenticatedUser.id) !== Number(req.params.id)) {
    return res.status(403).json({ errors: ['forbidden'] })
  }

  next()
}

export const isAdmin = (req: Request, res: Response, next: NextFunction): HandlerResponse => {
  if (res.locals.authenticatedUser.role && res.locals.authenticatedUser.role.name === 'admin') {
    return next()
  }

  res.status(403).json({ errors: ['forbidden'] })
}
