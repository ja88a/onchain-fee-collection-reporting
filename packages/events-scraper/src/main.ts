import { logger as wLogger } from '@jabba01/lfcr-common/dist/logger'
import { DatabaseConnector } from '@jabba01/lfcr-database'
import { ChainKey } from '@lifi/types'
import { Callback, Context, Handler } from 'aws-lambda'
import { FeeCollectionEventScraper } from './events-scraper.service'

/** Private logger */
const logger = wLogger.child({
  label: 'EventsScraperMain',
})

/**
 * Serverless Function handler for the FeeCollectionEventScraper main
 * function / entry point to initiate an event scraping session of
 * onchain FeeCollected events against the specified blockchain.
 *
 * @param event The triggering HTTP event from an API Gateway
 * @param _context Execution context of the function runtime environment
 * @param _callback Callback injected to this function to forward its response
 * @returns response status and body message
 */
export const scrapFeeCollectorEvents: Handler = async (
  event: any,
  _context: Context,
  _callback: Callback
) => {
  const { chainKey } = event.pathParameters
  logger.debug(
    `Lambda function invoked for Scraping events from chain '${chainKey}' - Context: ${JSON.stringify(_context)}`
  )

  // Initialize MongoDB connection with default config or from the set environment variables
  await DatabaseConnector.init().catch((error) => {
    logger.error(
      `Failed to initialize database connection - Request ID: '${_context.awsRequestId}'.\n${error.stack ?? error}`
    )
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: 'Failed to initialize database connection',
        // error: error.message || 'Unknown error',
      }),
    }
  })

  // Extract and store the onchain fees collected events
  return await startScraping(chainKey, _context.awsRequestId)
    .catch((error) => {
      logger.error(
        `Failed to scrap events from chain '${chainKey}' - Request ID: '${_context.awsRequestId}'.\n${error.stack ?? error}`
      )
      return {
        statusCode: 500,
        body: JSON.stringify({
          message: `Failed to start scraping events from chain '${chainKey}'`,
          // error: error.message || 'Unknown error',
        }),
      }
    })
    .finally(() => {
      // Close the database connection after processing
      DatabaseConnector.close().catch((error) => {
        logger.error(
          `Failed to close database connection - Request ID: '${_context.awsRequestId}'.\n${error.stack ?? error}`
        )
      })
    })
}

/**
 * Initiates the FeeCollectorEventsScraper service and starts a blockchain scanning session.
 * @param chainKey the key of the blockchain to scan
 * @param requestId the request ID
 * @returns an http-based response status and body message
 */
async function startScraping(chain: string, requestId: string) {
  // Validate the input chain key
  if (!Object.values(ChainKey).includes(<ChainKey>chain)) {
    logger.error(`Invalid chain key '${chain}' in request '${requestId}' - Events Scraping session aborted`)
    return {
      statusCode: 400,
      body: JSON.stringify({
        message: `Unsupported chain '${chain}'`,
      }),
    }
  }

  // Build the execution context
  const appService = new FeeCollectionEventScraper()
  const chainKey = <ChainKey>chain

  // Scrap latest FeeCollection events for the specified chain
  const res = await appService.scrapFeeCollectorEvents(chainKey).catch((error: any) => {
    const msgGenericMsg = `Failed to scrap FeeCollector events from chain '${chainKey}'`
    logger.error(
      `${msgGenericMsg} - Events Scraping session '${requestId}' ABORTED\n${error.stack ?? error}`
    )
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: msgGenericMsg,
        // error: error.response ?? error.message
      }),
    }
  })

  return {
    statusCode: 200,
    body: JSON.stringify(res),
  }
}

// Local dev entry point emulating the launch of the `FeeCollectionEventScraper` function.
// For automated local launch only - It has no effect in a serverless deployment context
if (process.env.DEV_MODE === '1') {
  const startTime = new Date()
  DatabaseConnector.init()
    .then(async () => {
      await startScraping(ChainKey.POL, startTime.toISOString()).then((res) => {
        const duration = new Date().getTime() - startTime.getTime()
        logger.info(
          `Process duration: ${duration / 1000}s - Result: ${JSON.stringify(res)}`
        )
      })
    })
    .catch((error) => {
      logger.error(
        `Failed to initialize database connection in DEV_MODE.\n${error.stack ?? error}`
      )
      process.exit(1)
    })
    .finally(() => process.exit())
}
