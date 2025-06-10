import { logger as wLogger } from '@jabba01/lfcr-common/dist/logger'
import { ChainKey } from '@lifi/types'
import { FeeCollectionEventScraper } from './events-scraper.service'
import { ResultEventScrapingSession } from './dto'
import { EventScrapingError, EventScrapingInputError } from './utils'

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
export const startScraping = async (
  chain: ChainKey
): Promise<ResultEventScrapingSession> => {
  // Validate the input chain key
  if (!Object.values(ChainKey).includes(<ChainKey>chain)) {
    throw new EventScrapingInputError(
      `Invalid chain key '${chain}' submitted - Events Scraping session aborted`
    )
  }

  // Scrap latest FeeCollector events for the specified chain
  const service = new FeeCollectionEventScraper()
  return await service.scrapFeeCollectorEvents(chain).catch((error) => {
    const msgGenericMsg = `Failed scraping of FeeCollector events on chain '${chain}': ${error.cause?.message ?? error.message}`
    logger.error(`${msgGenericMsg} - Events Scraping ABORTED. \n${error.stack ?? error}`)
    throw new EventScrapingError(msgGenericMsg, 500, { cause: error })
  })
}
