import { ChainKey } from '@lifi/types'
import { Address } from 'viem'

/**
 * Data structure for a parsed FeeCollectedEvent emitted by FeeCollector contracts
 * on any of their hosting blockchain
 */
export type FeeCollectedEvent = {
  /** Unique blockchain key from which the event come from */
  chainKey: ChainKey

  /** Transaction hash in which context the event was emitted */
  txHash: `0x${string}`

  /** Block number (bigint), or chain specific tag, when the event was emitted */
  blockTag: string

  /** Address of the token that was collected */
  token: Address

  /** Address of the integrator that triggered the fee collection */
  integrator: Address

  /** the share collected for the integrator */
  integratorFee: bigint

  /** the share collected by LI.FI */
  lifiFee: bigint

  /** DB document identifier */
  docId?: string

  /** The schema version of the document */
  version?: number
}
