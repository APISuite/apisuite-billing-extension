export class DatabaseError extends Error {}

export class DuplicateError extends DatabaseError {
  constructor(detail: string) {
    const { field, message } = DuplicateError.parseDetails(detail)
    super(`${field}: ${message}`)
    this.name = 'DuplicateError'
  }

  private static parseDetails = (detail: string) => {
    const parts = detail.split('=')
    const field = parts[0]
      .replace('Key (', '')
      .replace(')', '')
    const message = parts[1]
      .replace('(', '\'')
      .replace(')', '\'')

    return {
      field,
      message,
    }
  }
}

const enum PsqlErrors {
  UNIQUE_VIOLATION = '23505'
}

export interface PsqlError extends Error {
  code: string
  detail: string
}

export const dbErrorParser = (err: PsqlError): Error => {
  switch (err.code) {
    case PsqlErrors.UNIQUE_VIOLATION:
      return new DuplicateError(err.detail)
    default:
      return err
  }
}
