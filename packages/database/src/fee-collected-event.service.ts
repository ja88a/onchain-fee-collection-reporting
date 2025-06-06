import { FeeCollectionEventDoc, FeeCollectionEventModel } from './models'
import { FeeCollectedEventParsed } from '@jabba01/lfcr-common/dist/data'
import { logger as wLogger } from '@jabba01/lfcr-common/dist/logger'
import { BigNumber } from 'ethers/lib/ethers'

/**
 * Service for storing and retrieving FeeCollected events emitted by the FeeCollector contract to/from the database
 */
export class StoreFeeCollectedEvent {
  private readonly logger = wLogger.child({
    label: StoreFeeCollectedEvent.name,
  })

  /**
   * Create a new FeeCollectedEvent document in the database
   *
   * @param chainKey the unique LI.FI key of the blockchain hosting the FeeCollector contract
   * @param feeCollectedEvent a FeeCollector.FeeCollected event to persist
   * @returns instance of the stored FeeCollected event
   */
  async createFeeCollectedEvent(feeCollectedEvent: FeeCollectedEventParsed) {
    const doc = this.convertToDoc(feeCollectedEvent)
    return await FeeCollectionEventModel.create(doc)
  }

  /**
   * Store a set of FeeCollectedEvent documents in the database for a given blockchain
   * @param chainKey the unique LI.FI key of the blockchain hosting the FeeCollector contract
   * @param feeCollectedEvents a list of FeeCollector.FeeCollected contract events to persist
   * @returns instances of the stored FeeCollected events
   */
  async storeFeeCollectedEvents(feeCollectedEvents: FeeCollectedEventParsed[]) {
    const dbEntries = feeCollectedEvents.map((feeCollectedEvent) => {
      return this.convertToDoc(feeCollectedEvent)
    })
    return await FeeCollectionEventModel
      .insertMany(dbEntries, { ordered: false })
      .catch((err) => {
        this.logger.warn(`Attempted to insert already stored events. \n${err}`)
      })
  }

  /**
   * Retrieve the FeeCollected events for a given integrator
   * @param integratorId Unique ID, hex address, of the integrator
   * @returns the list of FeeCollected events stored in the database for the given integrator
   */
  async retrieveFeeCollectedEventsByIntegrator(
    integratorId: string
  ): Promise<FeeCollectedEventParsed[]> {
    const feeCollectedEvents = await FeeCollectionEventModel.find({
      integrator: integratorId,
    })
    return feeCollectedEvents.map((feeCollectedEvent) => {
      return this.convertToEntity(feeCollectedEvent)
    })
  }

  /** Mapping utilty method: Convert an external data model to a doc entry */
  private convertToDoc(feeCollectedEvent: FeeCollectedEventParsed): FeeCollectionEventDoc {
    return {
      chainKey: feeCollectedEvent.chainKey,
      txHash: feeCollectedEvent.txHash,
      blockTag: feeCollectedEvent.blockTag,
      token: feeCollectedEvent.token,
      integrator: feeCollectedEvent.integrator,
      integratorFee: feeCollectedEvent.integratorFee.toHexString(),
      lifiFee: feeCollectedEvent.lifiFee.toHexString(),
    }
  }

  /** Mapping utilty method: Convert a stored doc into an external data model instance */
  private convertToEntity(doc): FeeCollectedEventParsed {
    return {
      docId: doc.id,
      chainKey: doc.chainKey,
      txHash: doc.txHash,
      blockTag: doc.blockTag,
      token: doc.token,
      integrator: doc.integrator,
      integratorFee: BigNumber.from(doc.integratorFee),
      lifiFee: BigNumber.from(doc.lifiFee),
    }
  }
}
