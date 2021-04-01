import { Router } from 'express'

export interface BaseController {
  getRouter(): Router
}