import { DatabaseConnector } from '@jabba01/lfcr-database'
import { startScraping } from './events-scraper.controller'
import { ChainKey } from '@lifi/types'
import { logger } from '@jabba01/lfcr-common/dist/logger'

/** Message indicating the completion of the events scraping session */
export const MSG_EVENTS_SCRAPING_FINISHED = 'Events scraping session finished'

const EVENTS_SCRAPING_TARGET_CHAIN =
  (process.env.EVENTS_SCRAPING_TARGET_CHAIN as ChainKey) || ChainKey.POL

// Entry point for launching of a Fee Collector events scraping session / process

const startTime = new Date()
DatabaseConnector.init()
  .catch((error) => {
    logger.error(`Failed to initialize the database connection.\n${error.stack ?? error}`)
    process.exit(1)
  })
  .then(async () => {
    await startScraping(EVENTS_SCRAPING_TARGET_CHAIN)
      .then((res) => {
        logger.info(
          `FeeCollector Events scraping session outcome: ${JSON.stringify(res)}`
        )
      })
      .catch((error) => {
        logger.error(
          `Failed to complete the FeeCollector events scraping session.\n${error.stack ?? error}`
        )
        process.exit(1)
      })
  })
  .finally(() => {
    DatabaseConnector.close()
    const duration = new Date().getTime() - startTime.getTime()
    logger.warn(
      `${MSG_EVENTS_SCRAPING_FINISHED}. Duration: ${duration / 1000}s - Exiting`
    )
    process.exit()
  })
