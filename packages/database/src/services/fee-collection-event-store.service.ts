import { FeeCollectionEventDoc, getFeeCollectionEventModel } from '../models'
import { FeeCollectedEvent } from '@jabba01/lfcr-common/dist/data'
import { logger as wLogger } from '@jabba01/lfcr-common/dist/logger'
import { ChainKey } from '@lifi/types'
import { BigNumber } from 'ethers/lib/ethers'

/**
 * Service for storing and retrieving FeesCollected events, emitted by the FeeCollector contract, to/from the database
 */
export class FeeCollectedEventStore {
  private logger = wLogger.child({
    label: FeeCollectedEventStore.name,
  })

  /** Doc model for FeeCollectionEvent */
  private readonly FeeCollectionEventModel = getFeeCollectionEventModel()

  /**
   * Create a new FeeCollectedEvent document in the database
   *
   * @param chainKey the unique LI.FI key of the blockchain hosting the FeeCollector contract
   * @param feeCollectedEvent a FeeCollector.FeeCollected event to persist
   * @returns instance of the stored FeeCollected event
   */
  async createFeeCollectedEvent(feeCollectedEvent: FeeCollectedEvent) {
    const doc = convertToDoc(feeCollectedEvent)
    return await this.FeeCollectionEventModel.create(doc)
  }

  /**
   * Store a set of FeeCollectedEvent documents in the database for a given blockchain
   * @param chainKey the unique LI.FI key of the blockchain hosting the FeeCollector contract
   * @param feeCollectedEvents a list of FeeCollector.FeeCollected contract events to persist
   * @returns instances of the stored FeeCollected events
   */
  async storeFeeCollectedEvents(feeCollectedEvents: FeeCollectedEvent[]) {
    const dbEntries = feeCollectedEvents.map((feeCollectedEvent) =>
      convertToDoc(feeCollectedEvent)
    )
    return await this.FeeCollectionEventModel.insertMany(dbEntries, {
      ordered: false,
    }).catch((err) => {
      this.logger.error(
        `Error met while inserting ${feeCollectedEvents?.length} FeesCollected events in DB: '${err}'`
      )
    })
  }

  /**
   * Retrieve the FeeCollected events for a given integrator.
   *
   * Retrieval can be paginated by providing a limit and an offset.
   * If no limit is provided, or is not a positive number, all events for the integrator will be returned.
   *
   * Default sort order is descending by blockTag.
   *
   * @param integratorId Unique ID, hex address, of the integrator
   * @param limit the maximum number of events to retrieve, default is no limit
   * @param offset the number of events to skip before starting to collect the result set
   * @returns the list of FeeCollected events stored in the database for the given integrator
   */
  async retrieveFeeCollectedEventsByIntegrator(
    integratorId: string,
    limit?: number,
    offset?: number
  ): Promise<FeeCollectedEvent[]> {
    const feeCollectedEvents =
      limit > 0
        ? await this.FeeCollectionEventModel.find({
            integrator: integratorId,
          })
            .skip(offset || 0)
            .limit(limit)
            .sort({ blockTag: 'desc' })
        : await this.FeeCollectionEventModel.find({
            integrator: integratorId,
          }).sort({ blockTag: 'desc' })

    return feeCollectedEvents.map((feeCollectedEvent) =>
      convertToEntity(feeCollectedEvent)
    )
  }
}

/** Mapping utility method: Convert an external data model to a doc entry */
const convertToDoc = (feeCollectedEvent: FeeCollectedEvent): FeeCollectionEventDoc => {
  return {
    chainKey: feeCollectedEvent.chainKey,
    txHash: feeCollectedEvent.txHash,
    blockTag: feeCollectedEvent.blockTag,
    token: feeCollectedEvent.token,
    integrator: feeCollectedEvent.integrator,
    integratorFee: feeCollectedEvent.integratorFee.toString(),
    lifiFee: feeCollectedEvent.lifiFee.toString(),
    schemaVersion: feeCollectedEvent.version,
  }
}

/** Mapping utility method: Convert a stored doc into an external data model instance */
const convertToEntity = (doc: FeeCollectionEventDoc): FeeCollectedEvent => {
  return {
    docId: (doc as any).id,
    version: doc.schemaVersion,
    chainKey: <ChainKey>doc.chainKey,
    txHash: doc.txHash,
    blockTag: doc.blockTag,
    token: doc.token,
    integrator: doc.integrator,
    integratorFee: BigNumber.from(doc.integratorFee),
    lifiFee: BigNumber.from(doc.lifiFee),
  }
}
