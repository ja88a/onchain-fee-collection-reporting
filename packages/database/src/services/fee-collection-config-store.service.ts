import {
  EScrapingConfigStatus,
  FeeCollectionScrapingConfig,
} from '@jabba01/lfcr-common/dist/data'
import { logger as wLogger } from '@jabba01/lfcr-common/dist/logger'
import { ChainKey, ChainType } from '@lifi/types'
import { BeAnObject } from '@typegoose/typegoose/lib/types'
import { Document, Types } from 'mongoose'
import { getAddress, parseUnits } from 'viem'
import { DbError } from '../database.utils'
import {
  getFeeCollectionScrapingConfigModel,
  FeeCollectionScrapingConfigDoc,
} from '../models'

/**
 * Service for storing and retrieving onchain-related scraping information data about FeeCollector events
 */
export class FeeCollectionConfigStore {
  /** Private logger */
  private readonly logger = wLogger.child({
    label: FeeCollectionConfigStore.name,
  })

  /** Mongoose model for FeeCollector event scraping configuration */
  private readonly scrapingConfigModel = getFeeCollectionScrapingConfigModel()

  /**
   * Create a new EventScrapingInfo document in the database
   * @param chainKey the unique LI.FI key of the blockchain hosting the FeeCollector contract
   * @param feeCollectorChainConfig initial configuration of the target blockchain and FeeCollector contract
   * @returns instance of the stored FeeCollector event scraping information
   */
  async createFeeCollectorEventScrapingConfig(
    chainKey: string,
    feeCollectorChainConfig: FeeCollectionScrapingConfig
  ): Promise<FeeCollectionScrapingConfig> {
    const config = { ...feeCollectorChainConfig, chainKey: chainKey }
    const doc = await this.scrapingConfigModel.create(config).catch((err) => {
      throw new DbError(
        `Failed to create Fee Collection Scraping config for chain '${chainKey}': ${JSON.stringify(config)}`,
        { cause: err }
      )
    })
    this.logger.info(
      `New Fee Collection Scraping config for chain '${chainKey}' created in DB: ${JSON.stringify(config)}`
    )
    return convertToEntity(doc)
  }

  /**
   * Get the FeeCollector events scraping information for a given chain
   * @param chainKey the unique LI.FI key of the blockchain hosting the FeeCollector contract
   * @returns instance of the stored FeeCollector event onchain scraping information
   */
  async getByChain(chainKey: string): Promise<FeeCollectionScrapingConfig> {
    const doc = await this.scrapingConfigModel
      .findOne({
        chainKey: chainKey,
      })
      .exec()
      .catch((err) => {
        throw new DbError(
          `Failed to retrieve FeeCollection event scraping config for chain '${chainKey}'`,
          { cause: err }
        )
      })

    if (!doc) {
      this.logger.warn(
        `No event scraping configuration available for chain '${chainKey}'`
      )
      return null
    }
    return convertToEntity(doc)
  }

  /**
   * Change the status of a chain scraping config in DB.
   *
   * @param chainKey target chain key
   * @param status the new status
   * @returns the updated chain scraping config
   */
  async setScrapingSessionStatus(
    chainKey: ChainKey,
    status: EScrapingConfigStatus
  ): Promise<FeeCollectionScrapingConfig> {
    const res = await this.scrapingConfigModel
      .findOneAndUpdate({ chainKey }, { status: status }, { new: false })
      .exec()
      .catch((err) => {
        throw new DbError(
          `Failed to update FeeCollection event scraping config for chain '${chainKey}' with status '${status}'`,
          { cause: err }
        )
      })

    return convertToEntity(res)
  }

  /**
   * Update the last scanned block number of a FeeCollector chain scraping configuration
   * @param id document ID of the feecollector chain configuration to update
   * @param lastScannedBlock the last scanned block number
   * @returns the updated FeeCollector event scraping information
   */
  async updateFeeCollectorLastScanInfo(
    config: FeeCollectionScrapingConfig,
    lastScannedBlock: bigint
  ): Promise<FeeCollectionScrapingConfig> {
    config.feeCollector.lastScanBlock = lastScannedBlock
    config.feeCollector.lastScanTime = Date.now()
    const doc = await this.scrapingConfigModel
      .findByIdAndUpdate(
        config.docId,
        { feeCollector: config.feeCollector },
        { new: false }
      )
      .exec()
      .catch((err) => {
        throw new DbError(
          `Failed to update FeeCollection event scraping config '${config.docId}' with last scan info - block '${lastScannedBlock}'.`,
          { cause: err }
        )
      })
    if (!doc) {
      throw new DbError(
        `No FeeCollection event scraping config '${config.docId}' found to report last scan info - block '${lastScannedBlock}'`
      )
    }
    return convertToEntity(doc)
  }
}

/**
 * Convert a database document to a FeeCollectorChainConfig object.
 * @param doc the database document
 * @returns the FeeCollector Chain configuration
 */
const convertToEntity = (
  doc: Document<unknown, BeAnObject, FeeCollectionScrapingConfigDoc> &
    Omit<FeeCollectionScrapingConfigDoc & { _id: Types.ObjectId }, ''>
): FeeCollectionScrapingConfig => {
  return {
    docId: doc.id,
    version: doc.schemaVersion,
    chainKey: <ChainKey>doc.chainKey,
    status: <EScrapingConfigStatus>doc.status,
    chain: {
      id: doc.chain.id,
      type: <ChainType>doc.chain.type,
      rpcUrl: doc.chain.rpcUrl,
      rpcKey: doc.chain.rpcKey,
      lastBlockTag: doc.chain.lastBlockTag,
      blockBatchSize: doc.chain.blockBatchSize,
    },
    feeCollector: {
      contract: getAddress(doc.feeCollector.contract),
      blockStart: doc.feeCollector.blockStart
        ? parseUnits(doc.feeCollector.blockStart, 0)
        : 0n,
      lastScanBlock: doc.feeCollector.lastScanBlock
        ? parseUnits(doc.feeCollector.lastScanBlock, 0)
        : null,
      lastScanTime: doc.feeCollector.lastScanTime,
    },
  }
}
