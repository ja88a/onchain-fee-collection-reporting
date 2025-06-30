import { ErrorOptionsCustom, HttpStatusCode, LfcrError } from "@jabba01/lfcr-common"

export class EventScrapingError extends LfcrError {
  constructor(message: string, options?: ErrorOptionsCustom) {
    super(message, { ...options, status: options?.status ?? HttpStatusCode.INTERNAL_SERVER_ERROR })
    this.name = EventScrapingError.name
  }
}

/**
 * Error thrown when an event scraping session fails due to a time out issue.
 */
export class EventScrapingTimeoutError extends EventScrapingError {
  constructor(message: string, options?: ErrorOptionsCustom) {
    super(message, { ...options, status: options?.status ?? HttpStatusCode.GATEWAY_TIMEOUT })
    this.name = EventScrapingTimeoutError.name
  }
}

/**
 * Error thrown when an event scraping session fails due to a database issue.
 */
export class EventScrapingDatabaseError extends EventScrapingError {
  constructor(message: string, options?: ErrorOptionsCustom) {
    super(message, { ...options, status: options?.status ?? HttpStatusCode.INTERNAL_SERVER_ERROR })
    this.name = EventScrapingDatabaseError.name
  }
}

/**
 * Error thrown when an event scraping session fails due to a configuration issue.
 */
export class EventScrapingInputError extends EventScrapingError {
  constructor(message: string, options?: ErrorOptionsCustom) {
    super(message, { ...options, status: options?.status ?? HttpStatusCode.BAD_REQUEST })
    this.name = EventScrapingInputError.name
  }
}

/**
 * Error thrown when an event scraping session fails due to a configuration issue.
 */
export class EventScrapingStatusError extends EventScrapingError {
  constructor(message: string, options?: ErrorOptionsCustom) {
    super(message, { ...options, status: options?.status ?? HttpStatusCode.INTERNAL_SERVER_ERROR })
    this.name = EventScrapingStatusError.name
  }
}

/**
 * Error thrown when an event scraping session fails due to a chain-specific issue.
 */
export class EventScrapingChainError extends EventScrapingError {
  constructor(message: string, options?: ErrorOptionsCustom) {
    super(message, { ...options, status: options?.status ?? HttpStatusCode.INTERNAL_SERVER_ERROR })
    this.name = EventScrapingChainError.name
  }
}
