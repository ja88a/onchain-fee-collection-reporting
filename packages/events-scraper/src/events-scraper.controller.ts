import { logger as wLogger } from '@jabba01/lfcr-common/dist/logger'
import { ChainKey } from '@lifi/types'
import { FeeCollectionEventScraper } from './events-scraper.service'
import { ResultEventScrapingSession } from './dto'
import { EventScrapingError, EventScrapingInvalidInputError } from './utils'

/** Private logger */
const logger = wLogger.child({
  label: 'EventsScraperMain',
})

/**
 * Initiates the FeeCollectorEventsScraper service and starts a blockchain scanning session.
 * @param chainKey the key of the blockchain to scan
 * @param requestId the request ID
 * @returns an http-based response status and body message
 */
export const startScraping = async (chain: string): Promise<ResultEventScrapingSession> => {
  // Validate the input chain key
  if (!Object.values(ChainKey).includes(<ChainKey>chain)) {
    throw new EventScrapingInvalidInputError(
      `Invalid chain key '${chain}' submitted - Events Scraping session aborted`
    )
  }

  // Build the execution context
  const appService = new FeeCollectionEventScraper()
  const chainKey = <ChainKey>chain

  // Scrap latest FeeCollector events for the specified chain
  const res = await appService.scrapFeeCollectorEvents(chainKey).catch((error: any) => {
    const msgGenericMsg = `Failed to scrap FeeCollector events from chain '${chainKey}'`
    logger.error(
      `${msgGenericMsg} - Events Scraping ABORTED. \n${error.stack ?? error}`
    )
    throw new EventScrapingError(msgGenericMsg, error)
  })

  return res
}

