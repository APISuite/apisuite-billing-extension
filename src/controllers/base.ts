import { Router } from 'express'

export interface BaseController {
  getRouter(): Router
}

export class UserInputError extends Error {
  errors: any[]
  constructor(errors: any[]) {
    super('UserInputError')
    this.errors = errors
  }
}