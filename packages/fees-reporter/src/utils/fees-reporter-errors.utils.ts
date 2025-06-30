import { ErrorOptionsCustom, LfcrError } from '@jabba01/lfcr-common'

/**
 * Error thrown when a fee collection report scraping session fails.
 */
export class FeeCollectionReportError extends LfcrError {
  constructor(message: string, options?: ErrorOptionsCustom) {
    super(message, { ...options, status: options?.status ?? 500 })
    this.name = 'FeeCollectionReportError'
  }
}

/**
 * Error thrown when an event scraping session fails due to a database issue.
 */
export class FeeCollectionReportDatabaseError extends FeeCollectionReportError {
  constructor(message: string, options?: ErrorOptionsCustom) {
    super(message, { ...options, status: options?.status ?? 500 })
    this.name = 'FeeCollectionReportDatabaseError'
  }
}

/**
 * Error thrown when an event scraping session fails due to a configuration issue.
 */
export class FeeCollectionReportInputError extends FeeCollectionReportError {
  constructor(message: string, options?: ErrorOptionsCustom) {
    super(message, { ...options, status: options?.status ?? 400 })
    this.name = 'FeeCollectionReportInputError'
  }
}
