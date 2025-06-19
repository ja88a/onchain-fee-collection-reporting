import { ChainKey } from '@lifi/types'

/** Possible statuses of an event scraping session initiation */
export enum ScrapingSessionInitStatus {
  STARTED = 'started',
  IN_PROGRESS = 'in_progress',
  ERROR = 'error',
  ERROR_MAX_NB_REACHED = 'error_max_nb_reached',
  ERROR_INVALID_CHAIN = 'error_invalid_chain',
}

/** Result of an event scraping session initiation */
export type EventScrapingSessionInitResult = {
  /** Status of the scraping session initiation */
  status: ScrapingSessionInitStatus

  /** The chain key for which the scraping session was initiated */
  chainKey?: ChainKey

  /** Free text message providing information about the scraping session initiation */
  message: string
}
