import { IntegratorFeesCollectedReport } from './data'
import { logger as wLogger } from '@jabba01/lfcr-common/dist/logger'
import { FeeCollectedEventStore } from '@jabba01/lfcr-database/dist/services'
import { ChainTokenFeesBN } from './data/fee-collection-chain.dto'
import { FeeCollectedEvent } from '@jabba01/lfcr-common/dist/data'
import { FeeCollectionReportDatabaseError } from './utils'

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
    const collectedFeesIntegrator = new Map<string, ChainTokenFeesBN>()
    const collectedFeesLifi = new Map<string, ChainTokenFeesBN>()

    for (let i = 0; i < integratorFeeCollectedEvents.length; i++) {
      const event = integratorFeeCollectedEvents[i]
      const entryKey = `${event.chainKey}-${event.token}`

      const integratorFeesForToken = collectedFeesIntegrator.get(entryKey)
      if (!integratorFeesForToken) {
        collectedFeesIntegrator.set(entryKey, {
          chainKey: event.chainKey,
          token: event.token,
          amount: event.integratorFee,
        })
      } else {
        integratorFeesForToken.amount.add(event.integratorFee)
      }

      const lifiFeesForToken = collectedFeesLifi.get(entryKey)
      if (!lifiFeesForToken) {
        collectedFeesLifi.set(entryKey, {
          chainKey: event.chainKey,
          token: event.token,
          amount: event.lifiFee,
        })
      } else {
        lifiFeesForToken.amount.add(event.lifiFee)
      }
    }

    return {
      integrator: integratorId,
      integratorFeesCollected: Array.from(collectedFeesIntegrator.values()).map(
        (value) => ({
          chainKey: value.chainKey,
          token: value.token,
          amount: value.amount.toString(),
        })
      ),
      lifiFeesCollected: Array.from(collectedFeesLifi.values()).map((value) => ({
        chainKey: value.chainKey,
        token: value.token,
        amount: value.amount.toString(),
      })),
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
