import { ErrorOptionsStatus, LfcrError } from "@jabba01/lfcr-common"

/**
 * Error thrown when a fee collection report scraping session fails.
 */
export class FeeCollectionReportError extends LfcrError {
  constructor(message: string, options?: ErrorOptionsStatus) {
    super(message, { ...options, status: options?.status ?? 500 })
    this.name = 'FeeCollectionReportError'
  }
}

/**
 * Error thrown when an event scraping session fails due to a time out issue.
 */
export class FeeCollectionReportTimeoutError extends FeeCollectionReportError {
  constructor(message: string, options?: ErrorOptionsStatus) {
    super(message, {...options, status: options?.status ?? 504})
    this.name = 'FeeCollectionReportTimeoutError'
  }
}

/**
 * Error thrown when an event scraping session fails due to a database issue.
 */
export class FeeCollectionReportDatabaseError extends FeeCollectionReportError {
  constructor(message: string, options?: ErrorOptionsStatus) {
    super(message, {...options, status: options?.status ?? 500})
    this.name = 'FeeCollectionReportDatabaseError'
  }
}

/**
 * Error thrown when an event scraping session fails due to a configuration issue.
 */
export class FeeCollectionReportInputError extends FeeCollectionReportError {
  constructor(message: string, options?: ErrorOptionsStatus) {
    super(message, {...options, status: options?.status ?? 400})
    this.name = 'FeeCollectionReportInputError'
  }
}
