import { ChainTokenAmount, IntegratorFeesCollectedReport } from './data'
import { logger as wLogger } from '@jabba01/lfcr-common/dist/logger'
import { FeeCollectedEventStore } from '@jabba01/lfcr-database/dist/services'
import { FeeCollectedEvent } from '@jabba01/lfcr-common/dist/data'
import { FeeCollectionReportDatabaseError } from './utils'
import { Address } from 'viem'

/**
 * Collected Fees reporting service
 */
export class FeeCollectedReportService {
  /** Logger */
  private readonly logger = wLogger.child({
    label: FeeCollectedReportService.name,
  })

  private readonly feeCollectedEventPersistence = new FeeCollectedEventStore()

  /**
   * Retrieve the FeeCollected events for a given integrator
   * from the persistence layer and summarize them in a report.
   *
   * @param integratorId
   * @returns A report of the collected fees by the integrator
   */
  async reportFeesCollectedByIntegrator(
    integratorId: string
  ): Promise<IntegratorFeesCollectedReport> {
    const integratorFeeCollectedEvents = await this.feeCollectedEventPersistence
      .retrieveFeeCollectedEventsByIntegrator(integratorId)
      .catch((error) => {
        throw new FeeCollectionReportDatabaseError(
          `Failed to retrieve FeeCollected events for integrator '${integratorId}'.`,
          { cause: error }
        )
      })

    // Sum up the collected fees for each chain token
    const chainTokensAmounts = new Map<string, Map<string, ChainTokenAmount>>()
    integratorFeeCollectedEvents.forEach((event) => {
      const entryKey = `${event.chainKey}-${event.token}`
      if (!chainTokensAmounts.has(entryKey)) {
        chainTokensAmounts.set(entryKey, new Map<string, ChainTokenAmount>())
      }
      const tokenMap = chainTokensAmounts.get(entryKey)!
      if (!tokenMap.has(event.token)) {
        tokenMap.set(event.token, {
          chainKey: event.chainKey,
          token: event.token,
          totalIntegrator: event.integratorFee,
          totalLifi: event.lifiFee,
        })
      } else {
        const existingEntry = tokenMap.get(event.token)!
        existingEntry.totalIntegrator += event.integratorFee
        existingEntry.totalLifi += event.lifiFee
      }
    })

    return {
      integrator: <Address>integratorId,
      feesCollected: Array.from(chainTokensAmounts.values()).flatMap((tokenMap) =>
        Array.from(tokenMap.values())
      ),
    }
  }

  /**
   * Retrieve the FeeCollected events for a given integrator
   * from the persistence layer.
   *
   * @param integratorAccount Onchain account address of the integrator.
   * @param limitNumber Maximum number of events to retrieve. If set to `0`, no limit is applied.
   * @param pageNumber Offset for pagination, the data set / page number.
   * @returns A list of collected fee events associated to the integrator.
   */
  async getFeeCollectionEventsByIntegrator(
    integratorAccount: string,
    limitNumber: number,
    pageNumber: number
  ): Promise<FeeCollectedEvent[]> {
    const docsOffset = pageNumber * limitNumber
    return await this.feeCollectedEventPersistence
      .retrieveFeeCollectedEventsByIntegrator(integratorAccount, limitNumber, docsOffset)
      .catch((error) => {
        throw new FeeCollectionReportDatabaseError(
          `Failed to retrieve FeeCollected events for integrator '${integratorAccount}'. Limit '${limitNumber}' Page '${pageNumber}'.`,
          { cause: error }
        )
      })
  }
}
