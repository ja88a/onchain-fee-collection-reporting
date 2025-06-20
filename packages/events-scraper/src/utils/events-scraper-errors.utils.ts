import { ErrorOptionsStatus, LfcrError } from "@jabba01/lfcr-common"

export class EventScrapingError extends LfcrError {
  constructor(message: string, options?: ErrorOptionsStatus) {
    super(message, { ...options, status: options?.status ?? 500 })
    this.name = 'EventScrapingError'
  }
}

/**
 * Error thrown when an event scraping session fails due to a time out issue.
 */
export class EventScrapingTimeoutError extends EventScrapingError {
  constructor(message: string, options?: ErrorOptionsStatus) {
    super(message, { ...options, status: options?.status ?? 504 })
    this.name = 'EventScrapingTimeoutError'
  }
}

/**
 * Error thrown when an event scraping session fails due to a database issue.
 */
export class EventScrapingDatabaseError extends EventScrapingError {
  constructor(message: string, options?: ErrorOptionsStatus) {
    super(message, { ...options, status: options?.status ?? 500 })
    this.name = 'EventScrapingDatabaseError'
  }
}

/**
 * Error thrown when an event scraping session fails due to a configuration issue.
 */
export class EventScrapingInputError extends EventScrapingError {
  constructor(message: string, options?: ErrorOptionsStatus) {
    super(message, { ...options, status: options?.status ?? 400 })
    this.name = 'EventScrapingInputError'
  }
}
