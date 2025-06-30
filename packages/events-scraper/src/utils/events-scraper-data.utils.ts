import { ChainKey } from '@lifi/types'

/** Message indicating the completion of the events scraping session */
export const MSG_EVENTS_SCRAPING_FINISHED = 'Events scraping session finished'

export const EVENTS_SCRAPING_TARGET_CHAIN =
  (process.env.EVENTS_SCRAPING_TARGET_CHAIN as ChainKey) || ChainKey.POL
