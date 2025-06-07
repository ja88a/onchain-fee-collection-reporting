import { logger as wLogger } from '@jabba01/lfcr-common/dist/logger'
import { DatabaseConnector } from '@jabba01/lfcr-database'
import { startScraping } from '@jabba01/lfcr-events-scraper'
import { Callback, Context, Handler } from 'aws-lambda'

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
 * @param context Execution context of the function runtime environment
 * @param _callback Callback injected to this function to forward its response
 * @returns response status and body message
 */
export const scrapFeeCollectorEvents: Handler = async (
  event: any,
  context: Context,
  _callback: Callback
) => {
  const { chainKey } = event.pathParameters
  logger.debug(
    `Lambda function invoked for Scraping events from chain '${chainKey}' - Context: ${JSON.stringify(context)}`
  )

  // Initialize MongoDB connection with default config or from the set environment variables
  await DatabaseConnector.init().catch((error) => {
    logger.error(
      `Failed to initialize database connection - Request ID: '${context.awsRequestId}'.\n${error.stack ?? error}`
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
  return await startScraping(chainKey)
    .catch((error) => {
      logger.error(
        `Failed to scrap events from chain '${chainKey}' - Request ID: '${context.awsRequestId}'.\n${error.stack ?? error}`
      )
      return {
        statusCode: error.statusCode || 500,
        body: JSON.stringify({
          message: `Failed to scrap FeeCollector events from chain '${chainKey}'`,
          error: error.message || 'Unknown error',
        }),
      }
    })
    .finally(() => {
      // Close the database connection after processing
      DatabaseConnector.close().catch((error) => {
        logger.error(
          `Failed to close database connection - Request ID: '${context.awsRequestId}'.\n${error.stack ?? error}`
        )
      })
    })
}
