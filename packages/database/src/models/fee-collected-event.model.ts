import {
  getModelForClass,
  modelOptions,
  mongoose,
  prop,
  Severity,
} from '@typegoose/typegoose'
import { TimeStamps } from '@typegoose/typegoose/lib/defaultClasses'
import { DbError } from '../database.utils'

export const VersionDefaultFeesCollectedEvent = 1

/**
 * Data structure for a parsed FeeCollectedEvent emitted by FeeCollector contracts
 * on any of their hosting blockchain
 */
@modelOptions({
  schemaOptions: { collection: 'FeeCollectionEvent', versionKey: 'schemaVersion' },
  options: { disableCaching: false, allowMixed: Severity.ALLOW },
})
export class FeeCollectionEventDoc extends TimeStamps {
  /** The schema version of the document */
  @prop({ default: VersionDefaultFeesCollectedEvent })
  public schemaVersion?: number

  /** The blockchain unique key where the event was emitted */
  @prop({ required: true, index: true })
  public chainKey!: string

  /** Transaction Hash, an hex string, in which context the event was emitted */
  @prop({ required: true }) // @REVIEW How come block events' txHash is not unique? see at setting 'unique: true' in DB doc model
  public txHash!: string

  /** The block tag when the event was triggered
   *
   * Depending on the blockchain, it can consist in a block number or a block hash */
  @prop({ required: true })
  public blockTag!: string

  /** Onchain address of the collected token, an hex string */
  @prop()
  public token!: string

  /** Onchain address of the integrator account at the origin of fees collection */
  @prop({ index: true })
  public integrator!: string

  /** The share collected for the integrator,
   * stored in the form of a BigNumber Base10 string
   */
  @prop()
  public integratorFee!: string

  /** The share collected for the LI.FI protocol,
   * stored in the form of a BigNumber Base10 string
   */
  @prop()
  public lifiFee!: string
}

/**
 * Get the doc model of the LI.FI fee collection events
 */
export const getFeeCollectionEventModel = (): mongoose.Model<FeeCollectionEventDoc> => {
  // Only get the model when the connection is established
  if (mongoose.connection.readyState !== 1) {
    throw new DbError('getFeeCollectionEventModel - MongoDB connection not ready')
  }
  return getModelForClass(FeeCollectionEventDoc)
}
