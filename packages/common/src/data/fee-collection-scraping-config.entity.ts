import { ChainKey } from '@lifi/types'
import { Address, BlockTag } from 'viem'

/** Supported statuses for the scraping of events on a blockchain */
export enum EScrapingConfigStatus {
  /** Running events scraping sessions is enabled */
  ENABLED = 'enabled',

  /** An events scraping session is in progress */
  IN_PROGRESS = 'in_progress',

  /** The chain config is disabled, no scraping session shall be initiated */
  DISABLED = 'disabled',
}

/** Supported statuses for the scraping of events on a blockchain */
export enum EEventScrapingState {
  /** Events scraping session is running / in progress */
  RUNNING = 'running',

  /** An events scraping session is stopping */
  STOPPING = 'stopping',

  /** Event scraping stopped / cleared */
  STOPPED = 'stopped',
}

/** Supported state transitions for an event scraping session */
export const EventScrapingStateNext = new Map([
  [
    EEventScrapingState.RUNNING,
    [
      EEventScrapingState.RUNNING,
      EEventScrapingState.STOPPED,
      EEventScrapingState.STOPPING,
    ],
  ],
  [
    EEventScrapingState.STOPPING,
    [EEventScrapingState.STOPPING, EEventScrapingState.STOPPED],
  ],
  [
    EEventScrapingState.STOPPED,
    [EEventScrapingState.STOPPED, EEventScrapingState.RUNNING],
  ],
])

/** Default block tags to use for retrieving blocks from a blockchain, by considering them as valid/confirmed enough. */
export enum EBlockTagLatest {
  /** Safe to use block, almost confirmed/finalized */
  SAFE = 'safe',

  /** Latest finalized block */
  FINALIZED = 'finalized',

  /** Latest minted block */
  LATEST = 'latest',
}

/** Default tag of blocks to be considered valid/confirmed */
export const BlockTagLatestDefault = EBlockTagLatest.FINALIZED

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

  /** Optional private API key for the RPC provider */
  rpcKey?: string

  /** the chain specific tag enabling to get its last block number.
   * The tag to use for retrieving a chain [safe | finalized] last block. */
  lastBlockTag: BlockTag

  /** The number of blocks to fetch in a single request for a batch of blocks to scan */
  blockBatchSize: number
}

/**
 * LiFi FeeCollector contract properties for its onchain scanning.
 */
export type FeeCollectorProperties = {
  /** the onchain address of the LI.FI FeeCollector contract */
  contract: Address

  /** the block number from which to start seeking for events */
  blockStart: bigint

  /** The last scanned block number processed when corresponding blockchain was/is scanned */
  lastScanBlock?: bigint

  /** Last time a scan of block events was performed, epoch in ms */
  lastScanTime?: number
}

/** Configuration of onchain LiFi FeeCollector contracts */
export type FeeCollectionScrapingConfig = {
  /** the unique target blockchain key, based on LI.FI data types, this scraping config relates to */
  readonly chainKey?: ChainKey

  /** status for scraping events on that chain **/
  status: EScrapingConfigStatus

  /** Related Blockchain properties */
  chain: ChainProperties

  /** FeeCollector onchain related info */
  feeCollector: FeeCollectorProperties

  /** DB document identifier */
  docId?: string

  /** DB document schema version */
  version?: number
}
