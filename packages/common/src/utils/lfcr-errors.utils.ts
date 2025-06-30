import { HttpStatusCode } from './http-status-codes'

export type ErrorOptionsCustom = ErrorOptions & {
  status?: HttpStatusCode
}

/**
 * Custom error class for handling errors.
 *
 * This class extends the built-in Error class and includes a status code.
 */
export class LfcrError extends Error {
  public readonly status: HttpStatusCode

  constructor(message: string, options?: ErrorOptionsCustom) {
    super(message, options)
    this.name = LfcrError.name
    this.status = options?.status ?? HttpStatusCode.INTERNAL_SERVER_ERROR
  }

  getHttpErrorStatus(): HttpStatusCode {
    let rootStatus = this.status || HttpStatusCode.INTERNAL_SERVER_ERROR
    if (this.cause instanceof LfcrError) {
      rootStatus = this.cause.getHttpErrorStatus()
    }
    return rootStatus
  }

  /**
   * Returns a string representation of the error, including the name, status, stack trace, and cause if available.
   */
  toString(): string {
    const cause = this.cause
      ? `Cause: ${this.cause instanceof Error ? this.cause : JSON.stringify(this.cause)}`
      : null
    const stackMsg = this.stack ? this.stack : super.toString()
    return `${this.name}${this.status ? ' (' + this.getHttpErrorStatus() + ')' : ''} ${stackMsg} ${cause ? '\n' + cause : ''}`
  }
}
