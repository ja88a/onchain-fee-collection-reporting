import { FeeCollectedEvent } from '@jabba01/lfcr-common'
import { logger as wLogger } from '@jabba01/lfcr-common/dist/logger'
import {
  RESULT_EVENTS_PER_PAGE,
  RESULT_EVENTS_PER_PAGE_MAX,
} from './config/service.config'
import { FeeCollectedEventDto, IntegratorFeesCollectedReport } from './data'
import { FeeCollectedReportService } from './fees-reporter.service'
import { FeeCollectionReportError, FeeCollectionReportInputError } from './utils'
import { Address, isAddress } from 'viem'

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
  integratorAccount: Address
): Promise<IntegratorFeesCollectedReport> => {
  logger.info(`FeesCollected report requested for integrator '${integratorAccount}'`)

  // Validate the input parameters
  if (!isAddress(integratorAccount)) {
    throw new FeeCollectionReportInputError(
      `Unsupported integrator account '${integratorAccount}' requested. The account must be a valid hex address.`
    )
  }

  // Generate the report
  const feesReporterService = new FeeCollectedReportService()
  const report = await feesReporterService
    .reportFeesCollectedByIntegrator(integratorAccount)
    .catch((error) => {
      throw new FeeCollectionReportError(
        `Failed to generate a collected fee report for integrator '${integratorAccount}'.`,
        { cause: error }
      )
    })

  return report
}

/**
 * Retrieves the fee collection events for a specific integrator.
 *
 * @param integratorAccount The onchain account address of the integrator.
 * @param limit Optional limit for the number of events to be retrieved [within a page]. The maximum limit is 100, default is 50.
 * @param page Optional offset for pagination, the page number, considering the set limit size.
 * @returns List of fee collection events associated with the integrator.
 */
export const getFeeCollectionEventsByIntegrator = async (
  integratorAccount: Address,
  limit?: number,
  page?: number
): Promise<FeeCollectedEventDto[]> => {
  logger.info(
    `FeeCollection events requested for integrator '${integratorAccount}' - Limit '${limit}' and page offset '${page}'`
  )

  // Validate the input parameters
  if (!isAddress(integratorAccount)) {
    throw new FeeCollectionReportInputError(
      `Unsupported integrator account '${integratorAccount}' requested. The account must be a valid hex address.`
    )
  }

  const pageLimit = limit
    ? limit > RESULT_EVENTS_PER_PAGE_MAX
      ? RESULT_EVENTS_PER_PAGE_MAX
      : limit
    : RESULT_EVENTS_PER_PAGE

  const pageNumber = Number(page) ?? 0

  // Retrieve the stored fee collection events
  const feesReporterService = new FeeCollectedReportService()
  const feeCollectionEvents = await feesReporterService
    .getFeeCollectionEventsByIntegrator(integratorAccount, pageLimit, pageNumber)
    .catch((error) => {
      throw new FeeCollectionReportError(
        `Failed to get fee collection events for integrator '${integratorAccount}'.`,
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
const convertFeeEventsToDto = (
  feeCollectionEvents: FeeCollectedEvent[]
): FeeCollectedEventDto[] => {
  if (!(feeCollectionEvents?.length > 0)) {
    return []
  }
  // Convert the fee collection events to DTO format
  return feeCollectionEvents.map((event) => ({
    chainKey: event.chainKey,
    txHash: event.txHash,
    blockTag: event.blockTag,
    token: event.token,
    integrator: event.integrator,
    integratorFee: event.integratorFee,
    lifiFee: event.lifiFee,
    docId: event.docId,
  }))
}
