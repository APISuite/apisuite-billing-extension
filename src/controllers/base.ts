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

export class PurchasePreconditionError extends Error {
  constructor(message: string) {
    super(message)
  }
}