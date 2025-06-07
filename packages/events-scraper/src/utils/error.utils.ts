export class EventScrapingError extends Error {
  constructor(message: string, public httpStatus: number = 500, options?: ErrorOptions) {
    super(message, options)
    this.name = 'EventScrapingError'
    this.httpStatus = httpStatus
  }
}

/**
 * Error thrown when an event scraping session fails due to a time out issue.
 */
export class EventScrapingTimeoutError extends EventScrapingError {
  constructor(message: string, public httpStatus: number = 504, options?: ErrorOptions) {
    super(message, httpStatus, options)
    this.name = 'EventScrapingTimeoutError'
  }
}

/**
 * Error thrown when an event scraping session fails due to a network issue.
 */
export class EventScrapingNetworkError extends EventScrapingError {
  constructor(message: string, public httpStatus: number = 503, options?: ErrorOptions) {
    super(message, httpStatus, options)
    this.name = 'EventScrapingNetworkError'
  }
}

/**
 * Error thrown when an event scraping session fails due to a database issue.
 */
export class EventScrapingDatabaseError extends EventScrapingError {
  constructor(message: string, public httpStatus: number = 500, options?: ErrorOptions) {
    super(message, httpStatus, options)
    this.name = 'EventScrapingDatabaseError'
  }
}

/**
 * Error thrown when an event scraping session fails due to a configuration issue.
 */
export class EventScrapingInvalidInputError extends EventScrapingError {
  constructor(message: string, public httpStatus: number = 400, options?: ErrorOptions) {
    super(message, httpStatus, options)
    this.name = 'EventScrapingInvalidInputError'
  }
}