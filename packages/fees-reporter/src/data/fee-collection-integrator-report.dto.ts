import { ChainKey } from "@lifi/types"
import { Address } from "viem/_types"

/**
 * Total amount of fees per the chain and token asset
 *
 * The token symbol and decimals are to be retrieved from the chain.
 */
export class ChainTokenAmount {
  /** Unique blockchain key, refer to LiFi data types */
  chainKey: ChainKey

  /** The token address on the specified chain */
  token: Address

  /** Total cumulated amount of the token collected as fees by the integrator. */
  totalIntegrator: bigint

  /** Total cumulated amount of the token collected as fees by LI.FI. */
  totalLifi: bigint
}

/**
 * Report the collected fees by an integrator,
 * grouped by chain and their tokens.
 *
 * Corresponding LiFi shared fees are reported.
 */
export class IntegratorFeesCollectedReport {
  /** Address of the integrator */
  integrator: Address

  /** Fees collected by the integrator & LI.FI, per chain and per token */
  feesCollected: ChainTokenAmount[]
}
