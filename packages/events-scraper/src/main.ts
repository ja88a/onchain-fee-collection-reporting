import { LfcrError } from '@jabba01/lfcr-common'
import { logger as wLogger } from '@jabba01/lfcr-common/dist/logger'
import { DatabaseConnector } from '@jabba01/lfcr-database'
import { startScraping, stopScraping } from './events-scraper.controller'
import {
  EVENTS_SCRAPING_TARGET_CHAIN,
  MSG_EVENTS_SCRAPING_FINISHED,
} from './utils/events-scraper-data.utils'

// Entry point for launching of a Fee Collector events scraping session / process
const logger = wLogger.child({
  label: 'EventsScraperMain',
})
let exitStatus: number
const startTime = new Date()

DatabaseConnector.init()
  .catch((error) => {
    logger.error(`Failed to initialize the database connection. \n${error}`)
    exitStatus = 1
  })
  .then(async () => {
    await startScraping(EVENTS_SCRAPING_TARGET_CHAIN)
      .then((res) => {
        logger.info(
          `FeeCollector Events scraping session outcome: ${JSON.stringify(res)}`
        )
        exitStatus = 0
      })
      .catch((error) => {
        logger.error(
          `Failed to complete the FeeCollector events scraping session. \n${error}`
        )
        exitStatus = 1
      })
  })
  .finally(async () => {
    await DatabaseConnector.close().catch((error) => {
      logger.error(`Failed to properly close the database connection. \n${error}`)
    })
    process.exit(exitStatus)
  })

const exitGracefully = async (signal: string, status: number) => {
  logger.info(`Received signal '${signal}'. Exiting`)

  await stopScraping(signal)
    .then(async () => {
      const duration = new Date().getTime() - startTime.getTime()
      logger.warn(`${MSG_EVENTS_SCRAPING_FINISHED}. Duration: ${duration / 1000}s`)
    })
    .catch((err) => {
      logger.error(
        `Failed to properly exit: ${err instanceof LfcrError ? err : (err.stack ?? err)}`
      )
    })
    .finally(async () => {
      await DatabaseConnector.close().catch((error) => {
        logger.error(`Failed to properly close the database connection. \n${error}`)
      })
      process.exit(status)
    })
}

// Handle application interruption & termination
process.on('SIGINT', async () => await exitGracefully('SIGINT', 0))
process.on('SIGTERM', async () => await exitGracefully('SIGTERM', 0))

// Catch unhandled Promise rejections
process.on('unhandledRejection', (error) => {
  throw error
})

// Handle uncaught exceptions
process.on('uncaughtException', async (error) => {
  logger.error(
    `Uncaught Exception: ${error instanceof LfcrError ? error : (error?.stack ?? error)}`
  )
  await exitGracefully('UNCAUGHT_ERROR', 1)
})
