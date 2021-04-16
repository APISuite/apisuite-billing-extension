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

export class SubscriptionPreconditionError extends Error {
  constructor(message: string) {
    super(message)
  }
}