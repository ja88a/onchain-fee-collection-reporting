import { getModelForClass, mongoose } from '@typegoose/typegoose'
import { TimeStamps } from '@typegoose/typegoose/lib/defaultClasses'
import { Severity } from '@typegoose/typegoose/lib/internal/constants'
import { modelOptions } from '@typegoose/typegoose/lib/modelOptions'
import { prop } from '@typegoose/typegoose/lib/prop'
import { DbError } from '../database.utils'

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

  /** the chain specific tag enabling to get its last block number */
  @prop({ allowMixed: Severity.ALLOW })
  public lastBlockTag!: string | number
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
  public blockStart!: number

  /** the number of last scanned block while seeking for onchain events */
  @prop()
  public lastScanBlock?: number

  /** Last time a scan of block events was performed, epoch in ms */
  @prop()
  public lastScanTime?: number
}

/**
 * Schema of the FeeCollector's blockchain configuration document
 */
@modelOptions({
  schemaOptions: { collection: 'FeeCollectionOnchainConfig', versionKey: 'version' },
  options: { disableCaching: false, allowMixed: Severity.ALLOW },
})
export class FeeCollectionScrapingConfigDoc extends TimeStamps {
  /** Model version number */
  @prop({ required: true })
  public version?: number

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
