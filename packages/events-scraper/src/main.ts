import { logger as wLogger } from '@jabba01/lfcr-common/dist/logger'
import { Callback, Context, Handler } from 'aws-lambda'

import { FeeCollectionEventScraper } from './events-scraper.service'
import { ChainKey } from '@lifi/types'

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
  const { chain } = event.pathParameters
  logger.debug(
    `Lambda function invoked for Scraping events from chain '${chain}' - Context: ${JSON.stringify(_context)}`
  )
  return await startScraping(chain, _context.awsRequestId)
}

// /** Local persistence of an already created application context - Required for the Lambda function's runtime context */
// let appContext: INestApplicationContext

// /**
//  * Avoid recreating an application context if a previously created one
//  * is still available in the context of the serverless function
//  */
// async function getAppContext(): Promise<INestApplicationContext> {
//   if (appContext == null) {
//     appContext = await NestFactory.createApplicationContext(EventsScraperModule, {
//       logger:
//         process.env.NODE_ENV === 'production'
//           ? ['fatal', 'error', 'warn']
//           : ['fatal', 'error', 'warn', 'log', 'debug'],
//     }).catch((err) => {
//       logger.error(`Application context has failed to init`, err)
//       return Promise.reject(err)
//     })
//   }
//   return appContext
// }

/**
 * Initiates the FeeCollectorEventsScraper service and starts a blockchain scanning session.
 * @param chainKey the key of the blockchain to scan
 * @param requestId the request ID
 * @returns an http-based response status and body message
 */
async function startScraping(chain: string, requestId: string) {
  // Validate the input chain key
  if (!Object.values(ChainKey).includes(<ChainKey>chain)) {
    logger.error(`Invalid chain key '${chain}' in request ${requestId}`)
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
  try {
    const res = await appService.scrapFeeCollectorEvents(chainKey)
    return {
      statusCode: 200,
      body: JSON.stringify(res),
    }
  } catch (error: any) {
    const msgGenericMsg = `Failed to scrap FeeCollection events from chain '${chainKey}'`
    logger.error(`${msgGenericMsg} - Events Scraping session '${requestId}' ABORTED\n`, error)
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: msgGenericMsg,
        // error: error.response ?? error.message
      }),
    }
  }
}

// Local dev entry point emulating the launch of the `FeeCollectionEventScraper` function.
// For automated local launch only - It has no effect in a serverless deployment context
if (process.env.DEV_MODE === '1') {
  const startTime = new Date()
  startScraping(ChainKey.POL, startTime.toISOString())
    .then((res) => {
      const duration = new Date().getTime() - startTime.getTime()
      logger.info(`Process duration: ${duration / 1000}s - Result: ${JSON.stringify(res)}`)
    })
    .finally(() => process.exit())
}
