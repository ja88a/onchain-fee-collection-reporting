import {
  IsNotEmpty,
  IsHexadecimal,
  IsEthereumAddress,
  ValidateNested,
  IsString,
  IsNumberString,
  IsArray,
} from 'class-validator'
import { Type } from 'class-transformer'

/**
 * Report the collected fees by an integrator,
 * grouped by chain and their tokens.
 *
 * Corresponding LiFi shared fees are reported.
 */
export class IntegratorFeesCollectedReport {
  /** Address of the integrator */
  @IsNotEmpty()
  @IsHexadecimal()
  @IsEthereumAddress()
  integrator: string

  /** Fees collected by the integrator */
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ChainTokenAmount)
  integratorFeesCollected: ChainTokenAmount[]

  /** Share of the fees collected by LiFi */
  @IsArray()
  @ValidateNested({ each: true })
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
  @IsEthereumAddress()
  token: string

  /** Total cumulated amount of the collected fees. A string representation of corresponding BigNumber available on chain */
  @IsNumberString()
  @IsNotEmpty()
  amount: string
}
