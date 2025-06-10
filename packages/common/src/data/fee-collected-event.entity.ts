import { ChainKey } from '@lifi/types'
import { BigNumber } from 'ethers'

/**
 * Data structure for a parsed FeeCollectedEvent emitted by FeeCollector contracts
 * on any of their hosting blockchain
 */
export type FeeCollectedEventParsed = {
  /** Unique blockchain key from which the event come from */
  chainKey: ChainKey

  /** Transaction hash in which context the event was emitted */
  txHash: string

  /** Block number, or chain specific tag, when the event was emitted */
  blockTag: number | string

  /** Address of the token that was collected */
  token: string

  /** Address of the integrator that triggered the fee collection */
  integrator: string

  /** the share collected for the integrator */
  integratorFee: BigNumber

  /** the share collected by LI.FI */
  lifiFee: BigNumber

  /** DB document identifier */
  docId?: string
}
