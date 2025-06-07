import { DatabaseConnector } from '@jabba01/lfcr-database'
import { startScraping } from './events-scraper.controller'
import { ChainKey } from '@lifi/types'
import { logger } from '@jabba01/lfcr-common/dist/logger'

// Local dev entry point emulating the launch of the `FeeCollectionEventScraper` function
const startTime = new Date()
DatabaseConnector.init()
  .catch((error) => {
    logger.error(
      `Failed to initialize database connection in DEV_MODE.\n${error.stack ?? error}`
    )
    process.exit(1)
  })
  .then(async () => {
    await startScraping(ChainKey.POL)
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
    const duration = new Date().getTime() - startTime.getTime()
    logger.info(`Process duration: ${duration / 1000}s`)
    process.exit()
  })
