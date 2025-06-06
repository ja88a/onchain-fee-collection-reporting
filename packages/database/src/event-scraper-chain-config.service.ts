import {
  EEventScrapingStatus,
  FeeCollectorChainConfig,
} from '@jabba01/lfcr-common/dist/data'
import { logger as wLogger } from '@jabba01/lfcr-common/dist/logger'
import { ChainKey, ChainType } from '@lifi/types'
import { BeAnObject } from '@typegoose/typegoose/lib/types'
import { Document, Types } from 'mongoose'
import { DbError } from './database.utils'
import { FeeCollectionOnchainConfigModel, FeeCollectionOnchainConfigDoc } from './models'

/**
 * Service for storing and retrieving onchain-related scraping information data about FeeCollector events
 */
export class StoreEventScrapingChainConfig {
  /** Private logger */
  private readonly logger = wLogger.child({
    label: StoreEventScrapingChainConfig.name,
  })

  /**
   * Create a new EventScrapingInfo document in the database
   * @param chainKey the unique LI.FI key of the blockchain hosting the FeeCollector contract
   * @param feeCollectorChainConfig initial configuration of the target blockchain and FeeCollector contract
   * @returns instance of the stored FeeCollector event scraping information
   */
  async createFeeCollectorEventScrapingConfig(
    chainKey: string,
    feeCollectorChainConfig: FeeCollectorChainConfig
  ): Promise<FeeCollectorChainConfig> {
    const config = Object.assign({ chainKey: chainKey }, feeCollectorChainConfig)
    this.logger.info(
      `Creating a new FeeCollector scraping config for chain '${chainKey}' in DB: ${JSON.stringify(config)}`
    )
    const doc = await FeeCollectionOnchainConfigModel.create(config).catch((err) => {
      throw new DbError(
        `Failed to create FeeCollector event scraping config for chain '${chainKey}'. \n${err}`
      )
    })
    return this.convertToEntity(doc)
  }

  /**
   * Get the FeeCollector events scraping information for a given chain
   * @param chainKey the unique LI.FI key of the blockchain hosting the FeeCollector contract
   * @returns instance of the stored FeeCollector event onchain scraping information
   */
  async getByChain(chainKey: string): Promise<FeeCollectorChainConfig | undefined> {
    const doc = await FeeCollectionOnchainConfigModel.findOne({ chainKey: chainKey }).exec()
    if (doc === null) {
      this.logger.warn(
        `No event scraping configuration available for chain '${chainKey}'`
      )
    }
    return doc ? this.convertToEntity(doc) : undefined
  }

  /**
   * Update the last scanned block number of a FeeCollector chain scraping configuration
   * @param id document ID of the feecollector chain configuration to update
   * @param lastScannedBlock the last scanned block number
   * @returns the updated FeeCollector event scraping information
   */
  async updateFeeCollectorLastScanInfo(
    config: FeeCollectorChainConfig,
    lastScannedBlock: number
  ): Promise<FeeCollectorChainConfig> {
    config.feeCollector.lastScanBlock = lastScannedBlock
    config.feeCollector.lastScanTime = Date.now()
    const doc = await FeeCollectionOnchainConfigModel
      .findByIdAndUpdate(
        config.docId,
        { feeCollector: config.feeCollector },
        { new: false }
      )
      .exec()
      .catch((err) => {
        throw new DbError(
          `Failed to update FeeCollector event scraping config '${config.docId}' with last scan info - block '${lastScannedBlock}'. \n${err}`
        )
      })
    if (doc === null) {
      throw new DbError(
        `No FeeCollector event scraping config '${config.docId}' found to report last scan info - block '${lastScannedBlock}'`
      )
    }
    return this.convertToEntity(doc)
  }

  /**
   * Convert a database document to a FeeCollectorChainConfig object.
   * @param doc the database document
   * @returns the FeeCollector Chain configuration
   */
  private convertToEntity(
    doc: Document<unknown, BeAnObject, FeeCollectionOnchainConfigDoc> &
      Omit<FeeCollectionOnchainConfigDoc & { _id: Types.ObjectId }, ''>
  ): FeeCollectorChainConfig {
    return {
      docId: doc.id,
      version: doc.version,
      chainKey: <ChainKey>doc.chainKey,
      status: <EEventScrapingStatus>doc.status,
      chain: {
        id: doc.chain.id,
        type: <ChainType>doc.chain.type,
        rpcUrl: doc.chain.rpcUrl,
        lastBlockTag: doc.chain.lastBlockTag,
      },
      feeCollector: {
        contract: doc.feeCollector.contract,
        blockStart: doc.feeCollector.blockStart,
        lastScanBlock: doc.feeCollector.lastScanBlock,
        lastScanTime: doc.feeCollector.lastScanTime,
      },
    }
  }
}
