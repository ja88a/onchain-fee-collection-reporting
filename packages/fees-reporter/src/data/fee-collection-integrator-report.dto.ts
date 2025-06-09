import {
  IsNotEmpty,
  IsHexadecimal,
  IsEthereumAddress,
  ValidateNested,
  IsString,
  IsNumberString,
} from 'class-validator'
import { Type } from 'class-transformer'

/**
 * Convert a plain JSON object to a proper IntegratorFeesCollectedReport instance
 *
 * This conversion is required only for the validation of the IntegratorFeesCollectedReport
 */
export const createIntegratorFeesCollectedReport = (
  report: IntegratorFeesCollectedReport
): IntegratorFeesCollectedReport => {
  const validReport = Object.assign(new IntegratorFeesCollectedReport(), report)

  const validIntegratorFeesCollected = Array.from(
    report.integratorFeesCollected.values()
  ).map((value) =>
    Object.assign(new ChainTokenAmount(), {
      chainKey: value.chainKey,
      token: value.token,
      amount: value.amount.toString(),
    })
  )
  validReport.integratorFeesCollected = validIntegratorFeesCollected

  // report.lifiFeesCollected = Object.assign(new Array<ChainTokenAmount>(), report.lifiFeesCollected)
  const validLifiFeesCollected = Array.from(report.lifiFeesCollected.values()).map(
    (value) =>
      Object.assign(new ChainTokenAmount(), {
        chainKey: value.chainKey,
        token: value.token,
        amount: value.amount.toString(),
      })
  )
  validReport.lifiFeesCollected = validLifiFeesCollected

  return validReport
}

/**
 * Report the collected fees by an integrator,
 * grouped by chain and their tokens.
 *
 * Corresponding LiFi shared fees are reported.
 */
export class IntegratorFeesCollectedReport {
  /** Address of the integrator */
  // @IsEthereumAddress()
  @IsNotEmpty()
  @IsHexadecimal()
  @IsEthereumAddress()
  integrator: string

  /** Fees collected by the integrator */
  // @IsArray()
  @ValidateNested()
  @Type(() => ChainTokenAmount)
  integratorFeesCollected: ChainTokenAmount[]

  /** Share of the fees collected by LiFi */
  // @IsArray()
  @ValidateNested()
  @Type(() => ChainTokenAmount)
  lifiFeesCollected: ChainTokenAmount[]
}

/**
 * Total amount of fees per the chain and token asset
 *
 * The token symbol and decimals are to be retrieved from the chain.
 */
export class ChainTokenAmount {
  /** Unique blockchain key, refer to LiFi data types */
  @IsString()
  @IsNotEmpty()
  chainKey: string

  /** The token address on the specified chain */
  @IsHexadecimal()
  @IsNotEmpty()
  token: string

  /** Total cumulated amount of the collected fees. A string representation of corresponding BigNumber available on chain */
  @IsNumberString()
  @IsNotEmpty()
  amount: string
}
