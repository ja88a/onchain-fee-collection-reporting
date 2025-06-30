import { FeeCollectedEvent } from '@jabba01/lfcr-common/dist/data'
import { logger as wLogger } from '@jabba01/lfcr-common/dist/logger'
import { ChainKey } from '@lifi/types'
import { Address, parseUnits } from 'viem'
import { DbError } from '../database.utils'
import { FeeCollectionEventDoc, VersionDefaultFeesCollectedEvent, getFeeCollectionEventModel } from '../models'

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
      throw new DbError(
        `Error met while inserting ${feeCollectedEvents?.length} FeesCollected events in DB`,
        { cause: err }
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
    blockTag: feeCollectedEvent.blockTag?.toString(),
    token: feeCollectedEvent.token,
    integrator: feeCollectedEvent.integrator,
    integratorFee: feeCollectedEvent.integratorFee?.toString(),
    lifiFee: feeCollectedEvent.lifiFee?.toString(),
    schemaVersion: feeCollectedEvent.version ?? VersionDefaultFeesCollectedEvent,
  }
}

/** Mapping utility method: Convert a stored doc into an external data model instance */
const convertToEntity = (doc: FeeCollectionEventDoc): FeeCollectedEvent => {
  return {
    docId: (doc as any).id,
    version: doc.schemaVersion,
    chainKey: <ChainKey>doc.chainKey,
    txHash: <`0x${string}`>doc.txHash,
    blockTag: doc.blockTag,
    token: <Address>doc.token,
    integrator: <Address>doc.integrator,
    integratorFee: doc.integratorFee ? parseUnits(doc.integratorFee, 0) : null,
    lifiFee: doc.lifiFee ? parseUnits(doc.lifiFee, 0) : null,
  }
}
