import { BigNumber } from 'ethers'

/**
 * Total amount of fees per the chain and token asset
 *
 * Amount expressed as a BigNumber - intended for internal use in calculations.
 */
export class ChainTokenFeesBN {
  /** Unique chain key, refer to LiFi data types */
  chainKey: string

  /** The token address on the specified chain */
  token: string

  /** Total cumulated amount of the collected share of fees. A string representation of corresponding BigNumber available on chain  */
  amount: BigNumber
}
