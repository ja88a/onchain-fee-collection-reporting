import { ChainKey } from '@lifi/types'
import { ResultEventScrapingSession } from './dto'
import { FeeCollectionEventScraper } from './events-scraper.service'
import { EventScrapingError, EventScrapingInputError } from './utils'
import { setInterval } from 'timers/promises'
import { EEventScrapingState, logger as wLogger } from '@jabba01/lfcr-common'

let scrapingService: FeeCollectionEventScraper

const logger = wLogger.child({ label: 'EventsScraperController' })

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
  if (!Object.values(ChainKey).includes(chain)) {
    throw new EventScrapingInputError(
      `Invalid chain key '${chain}' submitted - Events Scraping session aborted`
    )
  }

  scrapingService = scrapingService ?? new FeeCollectionEventScraper()

  // Scrap latest FeeCollector events for the specified chain
  return await scrapingService.startScrapingSession(chain).catch((error) => {
    throw new EventScrapingError(
      `Failed scraping of FeesCollected events on chain '${chain}': ${error.cause?.message ?? error.message}`,
      { cause: error }
    )
  })
}

export const stopScraping = async (signal: string, chain?: ChainKey): Promise<void> => {
  scrapingService?.stopScrapingSession(signal, chain)
  await waitForSessionEnd(chain)
  if (!chain) {
    scrapingService = null
  }
}

const waitForSessionEnd = async (chain?: ChainKey) => {
  for await (const startTime of setInterval(300, Date.now())) {
    const now = Date.now()
    const sessionsState = scrapingService?.getOngoingChainScrapingSessions()
    if (chain) {
      const session = sessionsState?.get(chain)
      if (!session || session === EEventScrapingState.STOPPED) {
        break
      }
    } else if (
      Array.from(sessionsState?.values()).filter((s) => s !== EEventScrapingState.STOPPED)
        ?.length === 0
    ) {
      break
    }
    if (now - startTime > 10_000) {
      const notStoppedSessions = []
      sessionsState.forEach((state, chainKey) => {
        if (state !== EEventScrapingState.STOPPED) {
          notStoppedSessions.push(`${chainKey}: ${state}`)
        }
      })
      logger.warn(
        `These scraping sessions didn't end after 10 seconds: ${JSON.stringify(notStoppedSessions)}`
      )
      break
    }
  }
}
