export class EventScrapingError extends Error {
  constructor(
    message: string,
    public code: number = 500,
    options?: ErrorOptions
  ) {
    super(message, options)
    this.name = 'EventScrapingError'
    this.code = code
  }
}

/**
 * Error thrown when an event scraping session fails due to a time out issue.
 */
export class EventScrapingTimeoutError extends EventScrapingError {
  constructor(message: string, code: number = 504, options?: ErrorOptions) {
    super(message, code, options)
    this.name = 'EventScrapingTimeoutError'
  }
}

/**
 * Error thrown when an event scraping session fails due to a database issue.
 */
export class EventScrapingDatabaseError extends EventScrapingError {
  constructor(message: string, code: number = 500, options?: ErrorOptions) {
    super(message, code, options)
    this.name = 'EventScrapingDatabaseError'
  }
}

/**
 * Error thrown when an event scraping session fails due to a configuration issue.
 */
export class EventScrapingInputError extends EventScrapingError {
  constructor(message: string, code: number = 400, options?: ErrorOptions) {
    super(message, code, options)
    this.name = 'EventScrapingInputError'
  }
}
