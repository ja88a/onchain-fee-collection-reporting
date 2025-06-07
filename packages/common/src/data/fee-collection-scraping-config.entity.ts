import { ChainKey, ChainType, ChainId } from '@lifi/types'

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

/** Configuration of onchain LiFi FeeCollector contracts */
export type FeeCollectionScrapingConfig = {
  /** the unique target blockchain key, based on LI.FI data types */
  readonly chainKey?: ChainKey

  /** status for scraping events on that chain **/
  status: EEventScrapingStatus

  /** Blockchain info */
  chain: {
    /** LI.FI blockchain ID */
    id: ChainId

    /** LI.FI blockchain type */
    type: ChainType

    /** URL of the default JSON RPC provider */
    rpcUrl: string

    /** The tag to use for retrieving a chain [safe | finalized] last block */
    lastBlockTag: number | string
  }

  /** FeeCollector onchain related info */
  feeCollector: {
    /** LI.FI FeeCollector contract address, an hexa string */
    contract: string

    /** The block number to consider for starting a new blockchain scan session of FeeCollector events */
    blockStart: number

    /** Last scanned block number during last scraping session of FeeCollected events */
    lastScanBlock?: number

    /** Last time a scraping session of FeeCollected events was performed */
    lastScanTime?: number
  }

  /** DB document identifier */
  docId?: string

  /** DB document schema version */
  version?: number
}
