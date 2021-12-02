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

export class NotFoundError extends Error {
  constructor(entity: string) {
    super(`${entity} not found`)
  }
}

export class ForbiddenError extends Error {
  constructor(message = 'forbidden') {
    super(message)
  }
}