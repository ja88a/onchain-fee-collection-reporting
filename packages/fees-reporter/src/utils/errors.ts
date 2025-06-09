export class FeeCollectionReportError extends Error {
  constructor(
    message: string,
    public code: number = 500,
    options?: ErrorOptions
  ) {
    super(message, options)
    this.name = 'FeeCollectionReportError'
    this.code = code
  }
}

/**
 * Error thrown when an event scraping session fails due to a time out issue.
 */
export class FeeCollectionReportTimeoutError extends FeeCollectionReportError {
  constructor(message: string, code: number = 504, options?: ErrorOptions) {
    super(message, code, options)
    this.name = 'FeeCollectionReportTimeoutError'
  }
}

/**
 * Error thrown when an event scraping session fails due to a database issue.
 */
export class FeeCollectionReportDatabaseError extends FeeCollectionReportError {
  constructor(message: string, code: number = 500, options?: ErrorOptions) {
    super(message, code, options)
    this.name = 'FeeCollectionReportDatabaseError'
  }
}

/**
 * Error thrown when an event scraping session fails due to a configuration issue.
 */
export class FeeCollectionReportInputError extends FeeCollectionReportError {
  constructor(message: string, code: number = 400, options?: ErrorOptions) {
    super(message, code, options)
    this.name = 'FeeCollectionReportInputError'
  }
}
