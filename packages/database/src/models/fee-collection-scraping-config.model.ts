import { getModelForClass, mongoose } from '@typegoose/typegoose'
import { TimeStamps } from '@typegoose/typegoose/lib/defaultClasses'
import { modelOptions } from '@typegoose/typegoose/lib/modelOptions'
import { prop } from '@typegoose/typegoose/lib/prop'
import { BlockTag } from 'viem/_types/types/block'
import { DbError } from '../database.utils'

export const VersionDefaultScrapingConfig = 1

/**
 * Configuration settings for the target blockchain to scan
 */
class ChainPropertiesDoc {
  /** Target blockchain ID, based on LI.FI data types */
  @prop()
  public id!: number

  /** Chain type, e.g. `EVM`, based on LI.FI data types */
  @prop()
  public type!: string

  /** URL of the JSON RPC provider */
  @prop()
  public rpcUrl!: string

  /** Optional private API key for the RPC provider */
  @prop({ required: false})
  public rpcKey?: string

  /** the chain specific tag enabling to get its last block number */
  @prop()
  public lastBlockTag!: BlockTag

  /** The number of blocks to fetch in a single batch */
  @prop({ required: true })
  public blockBatchSize!: number
}

/**
 * LiFi FeeCollector contract properties for its onchain scanning.
 */
class FeeCollectorPropertiesDoc {
  /** the onchain address of the LI.FI FeeCollector contract */
  @prop({ required: true })
  public contract!: string

  /** the block number from which to start seeking for FeeCollected events */
  @prop({ required: true })
  public blockStart!: string

  /** the number of last scanned block while seeking for onchain events */
  @prop()
  public lastScanBlock?: string

  /** Last time a scan of block events was performed, epoch in ms */
  @prop()
  public lastScanTime?: number
}

/**
 * Schema of the FeeCollector's blockchain configuration document
 */
@modelOptions({
  schemaOptions: { collection: 'FeeCollectionOnchainConfig', versionKey: 'schemaVersion' },
  options: { disableCaching: false },
})
export class FeeCollectionScrapingConfigDoc extends TimeStamps {
  /** Model version number */
  @prop({ default: VersionDefaultScrapingConfig })
  public schemaVersion?: number

  /** the target blockchain key, based on LI.FI data types */
  @prop({ unique: true, index: true })
  public chainKey!: string

  /** the blockchain info */
  @prop({ required: true })
  public chain!: ChainPropertiesDoc

  /** the FeeCollector contract info */
  @prop({ required: true })
  public feeCollector!: FeeCollectorPropertiesDoc

  /** General status for scraping events on the chain */
  @prop()
  public status?: string
}

/** The configuration model for LI.FI fee collection's event scraping */
export const getFeeCollectionScrapingConfigModel = () => {
  // Only get the model when the connection is established
  if (mongoose.connection.readyState !== 1) {
    throw new DbError('MongoDB connection not ready')
  }
  return getModelForClass(FeeCollectionScrapingConfigDoc)
}
