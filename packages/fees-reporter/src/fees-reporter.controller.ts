import { logger as wLogger } from '@jabba01/lfcr-common/dist/logger'
import { VALIDATE_OUTPUT_COLLECTED_FEES_REPORTS } from './config/service.config'
import { FeeCollectedEventDto, IntegratorFeesCollectedReport } from './data'
import { FeeCollectedReportService } from './fees-reporter.service'
import { FeeCollectionReportError, FeeCollectionReportInputError } from './utils'
import {
  createIntegratorFeesCollectedReport,
  validateIntegratorAccountAddress,
  validateReport,
} from './utils/fee-collected-validation'
import { FeeCollectedEventParsed } from '@jabba01/lfcr-common'

const logger = wLogger.child({
  label: 'FeeCollectedReportController',
})

/**
 * Reports all the fees collected by the specified integrator, along with the LiFi protocol share.
 *
 * The total amount of collected fees is grouped by tokens and corresponding chain where the FeeCollector contract(s) is deployed.
 *
 * @param integratorAccount Onchain account address of the integrator.
 * @returns A list of collected fee events associated to the integrator.
 */
export const reportFeesCollectedByIntegrator = async (
  integratorAccount: string
): Promise<IntegratorFeesCollectedReport> => {
  logger.info(`FeesCollected report requested for integrator '${integratorAccount}'`)

  // Validate the input parameters
  const validationErrors = validateIntegratorAccountAddress(integratorAccount)
  if (validationErrors.length > 0) {
    throw new FeeCollectionReportInputError(
      `Unsupported integrator ID '${integratorAccount}' requested \n${JSON.stringify(validationErrors)}`
    )
  }

  // Generate the report
  const feesReporterService = new FeeCollectedReportService()
  const report = await feesReporterService
    .reportFeesCollectedByIntegrator(integratorAccount)
    .catch((error) => {
      logger.error(
        `Failed to generate a collected fee report for integrator '${integratorAccount}'. \n${error.stack ?? error}`
      )
      throw new FeeCollectionReportError(
        `Failed to generate a collected fee report for integrator '${integratorAccount}'.`,
        500,
        { cause: error }
      )
    })

  if (VALIDATE_OUTPUT_COLLECTED_FEES_REPORTS) {
    // Validate the report output
    const reportInst = createIntegratorFeesCollectedReport(report)
    await validateReport(reportInst).then((validationErrors) => {
      if (validationErrors.length > 0) {
        logger.error(
          `Failed to generate a valid collected fees report for integrator '${integratorAccount}'. \nValidation Errors: ${JSON.stringify(validationErrors)}`
        )
        throw new FeeCollectionReportError(
          `Report Validation Error: Failed to generate a valid report on collected fees for integrator '${integratorAccount}'`
        )
      }
      return report
    })
  }

  return report
}

/**
 * Retrieves the fee collection events for a specific integrator.
 *
 * @param integratorAccount The onchain account address of the integrator.
 * @param limit Optional limit for the number of events to retrieve.
 * @param offset Optional offset for pagination, the page / data set offset number, per the set limit size.
 * @returns List of fee collection events associated with the integrator.
 */
export const getFeeCollectionEventsByIntegrator = async (
  integratorAccount: string,
  limit?: number,
  offset?: number,
): Promise<FeeCollectedEventDto[]> => {
  logger.info(
    `FeeCollection events requested for integrator '${integratorAccount}' - Limit '${limit}' and page offset '${offset}'`
  )

  // Validate the input parameters
  const validationErrors = validateIntegratorAccountAddress(integratorAccount)
  if (validationErrors.length > 0) {
    throw new FeeCollectionReportInputError(
      `Unsupported integrator ID '${integratorAccount}' requested \n${JSON.stringify(validationErrors)}`
    )
  }
  const limitNumber = limit ? Number(limit) : 50
  const offsetNumber = offset ? Number(offset) : 0

  // Get the fee collection events
  const feesReporterService = new FeeCollectedReportService()
  const feeCollectionEvents = await feesReporterService
    .getFeeCollectionEventsByIntegrator(integratorAccount, limitNumber, offsetNumber)
    .catch((error) => {
      logger.error(
        `Failed to get fee collection events for integrator '${integratorAccount}'. \n${error.stack ?? error}`
      )
      throw new FeeCollectionReportError(
        `Failed to get fee collection events for integrator '${integratorAccount}'.`,
        500,
        { cause: error }
      )
    })

  return convertFeeEventsToDto(feeCollectionEvents)
}

/**
 * Converts fee collection events from the parsed format to the DTO format.
 * @param feeCollectionEvents 
 * @returns 
 */
const convertFeeEventsToDto = (feeCollectionEvents: FeeCollectedEventParsed[]): FeeCollectedEventDto[] => {
  if (!feeCollectionEvents || feeCollectionEvents.length === 0) {
    return []
  }
  // Convert the fee collection events to DTO format
  return feeCollectionEvents.map(event => ({
    chainKey: <string>event.chainKey,
    txHash: event.txHash,
    blockTag: event.blockTag + '', // Ensure blockTag is a string
    token: event.token,
    integrator: event.integrator,
    integratorFee: event.integratorFee.toString(),
    lifiFee: event.lifiFee.toString(),
    docId: event.docId,
  }))
}
