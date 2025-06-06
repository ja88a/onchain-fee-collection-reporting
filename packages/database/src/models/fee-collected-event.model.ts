import {
  getModelForClass,
  modelOptions,
  prop,
  ReturnModelType,
  Severity,
} from '@typegoose/typegoose'
import { TimeStamps } from '@typegoose/typegoose/lib/defaultClasses'

/**
 * Data structure for a parsed FeeCollectedEvent emitted by FeeCollector contracts
 * on any of their hosting blockchain
 */
@modelOptions({
  schemaOptions: { collection: 'FeeCollectionEvent' },
  options: { disableCaching: false, allowMixed: Severity.ALLOW },
})
export class FeeCollectionEventDoc extends TimeStamps {
  /** The blockchain unique key where the event was emitted */
  @prop({ required: true, index: true })
  public chainKey!: string

  /** Transaction Hash, an hex string, in which context the event was emitted */
  @prop({ required: true, unique: true })
  public txHash!: string

  /** The block tag when the event was triggered
   *
   * Depending on the blockchain, it can consist in a block number or a block hash,
   * hence the need for the model option `allowMixed: Severity.ALLOW` */
  @prop({ allowMixed: Severity.ALLOW })
  public blockTag!: number | string

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

/** Doc model of the LI.FI fee collection events */
export const FeeCollectionEventModel: ReturnModelType<typeof FeeCollectionEventDoc> =
  getModelForClass(FeeCollectionEventDoc)
