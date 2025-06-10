import { ChainKey } from '@lifi/types'

/**
 * Info about FeeCollected Events emitted by FeeCollector contracts on any of their hosting blockchain
 */
export type FeeCollectedEventDto = {
  /** Unique blockchain key from which the event come from */
  chainKey: string

  /** Transaction hash in which context the event was emitted */
  txHash: string

  /** Block number, or chain specific tag, when the event was emitted */
  blockTag: string

  /** Address of the token that was collected */
  token: string

  /** Address of the integrator that triggered the fee collection */
  integrator: string

  /** the share collected for the integrator. Token amount expressed as a big number string */
  integratorFee: string

  /** the share collected by LI.FI. Token amount expressed as a big number string */
  lifiFee: string

  /** DB document identifier */
  docId?: string
}
