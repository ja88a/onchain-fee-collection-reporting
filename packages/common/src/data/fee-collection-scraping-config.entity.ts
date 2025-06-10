import { ChainKey } from '@lifi/types'

/** Supported statuses for the scraping of events on a blockchain */
export const enum EEventScrapingStatus {
  /** Running events scraping sessions is enabled */
  ACTIVE = 'active',
  /** The chain config is disabled, no scraping session shall be initiated */
  INACTIVE = 'inactive',
}

/** Default block tags to use for retrieving the last available block on a blockchain */
export const enum EBlockTagLatest {
  /** Safe to use block, almost confirmed/finalized */
  SAFE = 'safe',
  /** Latest finalized block */
  FINALIZED = 'finalized',
  /** Latest minted block */
  LATEST = 'latest',
  /** Default tag to retrieve last block */
  default = FINALIZED,
}

/**
 * Configuration settings for the target blockchain to scan
 */
export type ChainProperties = {
  /** Target blockchain ID, based on LI.FI data types */
  id: number

  /** Chain type, e.g. `EVM`, based on LI.FI data types */
  type: string

  /** URL of the JSON RPC provider */
  rpcUrl: string

  /** the chain specific tag enabling to get its last block number.
   * The tag to use for retrieving a chain [safe | finalized] last block. */
  lastBlockTag: string | number
}

/**
 * LiFi FeeCollector contract properties for its onchain scanning.
 */
export type FeeCollectorProperties = {
  /** the onchain address of the LI.FI FeeCollector contract */
  contract: string

  /** the block number from which to start seeking for FeeCollected events */
  blockStart: number

  /** the number of last scanned block while seeking for onchain events */
  lastScanBlock?: number

  /** Last time a scan of block events was performed, epoch in ms */
  lastScanTime?: number
}

/** Configuration of onchain LiFi FeeCollector contracts */
export type FeeCollectionScrapingConfig = {
  /** the unique target blockchain key, based on LI.FI data types */
  readonly chainKey?: ChainKey

  /** status for scraping events on that chain **/
  status: EEventScrapingStatus

  /** Blockchain info */
  chain: ChainProperties

  /** FeeCollector onchain related info */
  feeCollector: FeeCollectorProperties

  /** DB document identifier */
  docId?: string

  /** DB document schema version */
  version?: number
}
