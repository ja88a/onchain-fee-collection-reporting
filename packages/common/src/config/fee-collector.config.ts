import { ChainKey, ChainType, ChainId } from '@lifi/types'
import {
  BlockTagLatestDefault,
  EBlockTagLatest,
  EEventScrapingStatus,
  FeeCollectionScrapingConfig,
} from '../data/fee-collection-scraping-config.entity'

/** Latest current version number of the FeeCollector Chain config schema */
export const VERSION_FEE_COLLECTOR_CHAIN_CONFIG_LATEST = 1

/** Default max number of blocks used to define a range, a batch size, when iteratively scanning a chain */
export const CHAIN_SCAN_BLOCKS_BATCH_SIZE = process.env.CHAIN_SCAN_BLOCKS_BATCH_SIZE
  ? parseInt(process.env.CHAIN_SCAN_BLOCKS_BATCH_SIZE)
  : 2000

/** Default block tags to use for retrieving the latest available block on a blockchain */
export const CHAIN_LATEST_BLOCK_TAG = process.env.CHAIN_LATEST_BLOCK_TAG || 'finalized'

/** Default number of chain query attempts when previous has failed. Number of attempts before throwing an error. */
export const CHAIN_QUERY_FAIL_RETRY_NB = process.env.CHAIN_QUERY_FAIL_RETRY_NB
  ? parseInt(process.env.CHAIN_QUERY_FAIL_RETRY_NB)
  : 2

/** Default RPC URL for the Polygon Mainnet */
const CHAIN_POLYGON_RPC_URL =
  process.env.CHAIN_POLYGON_RPC_URL || 'https://polygon-rpc.com'

/** Default FeeCollector contract address for the Polygon Mainnet */
const CHAIN_POLYGON_FEE_COLLECTOR_CONTRACT =
  process.env.CHAIN_POLYGON_FEE_COLLECTOR_CONTRACT ||
  '0xbD6C7B0d2f68c2b7805d88388319cfB6EcB50eA9'

/** Default block number from which the FeeCollector contract starts collecting fees on Polygon Mainnet */
const CHAIN_POLYGON_FEE_COLLECTOR_BLOCK_START = process.env
  .CHAIN_POLYGON_FEE_COLLECTOR_BLOCK_START
  ? parseInt(process.env.CHAIN_POLYGON_FEE_COLLECTOR_BLOCK_START)
  : 70_000_000

/** Default RPC URL for the Optimism Mainnet */
const CHAIN_OPTIMISM_RPC_URL =
  process.env.CHAIN_OPTIMISM_RPC_URL || 'https://mainnet.optimism.io'

/** Default FeeCollector contract address for the Optimism Mainnet */
const CHAIN_OPTIMISM_FEE_COLLECTOR_CONTRACT =
  process.env.CHAIN_OPTIMISM_FEE_COLLECTOR_CONTRACT || CHAIN_POLYGON_FEE_COLLECTOR_CONTRACT

/** Default block number from which the FeeCollector contract starts collecting fees on Optimism Mainnet */
const CHAIN_OPTIMISM_FEE_COLLECTOR_BLOCK_START = process.env
  .CHAIN_OPTIMISM_FEE_COLLECTOR_BLOCK_START
  ? parseInt(process.env.CHAIN_OPTIMISM_FEE_COLLECTOR_BLOCK_START)
  : 130_000_000

/** Default RPC URL for the Binance Smart Chain Mainnet */
const CHAIN_BINANCE_RPC_URL =
  process.env.CHAIN_BINANCE_RPC_URL || 'https://bsc-dataseed.binance.org/'

/** Default FeeCollector contract address for the Binance Smart Chain Mainnet */
const CHAIN_BINANCE_FEE_COLLECTOR_CONTRACT =
  process.env.CHAIN_BINANCE_FEE_COLLECTOR_CONTRACT || CHAIN_POLYGON_FEE_COLLECTOR_CONTRACT

/** Default block number from which the FeeCollector contract starts collecting fees on Binance Smart Chain Mainnet */
const CHAIN_BINANCE_FEE_COLLECTOR_BLOCK_START = process.env
  .CHAIN_BINANCE_FEE_COLLECTOR_BLOCK_START
  ? parseInt(process.env.CHAIN_BINANCE_FEE_COLLECTOR_BLOCK_START)
  : 50_000_000

/** Map of FeeCollector scraping config for the supported blockchains */
export const feeCollectorChainConfigDefault: Map<string, FeeCollectionScrapingConfig> =
  new Map([
    [
      // Polygon - Mainnet
      ChainKey.POL,
      {
        version: VERSION_FEE_COLLECTOR_CHAIN_CONFIG_LATEST,
        status: EEventScrapingStatus.ACTIVE,
        chain: {
          id: ChainId.POL,
          type: ChainType.EVM,
          rpcUrl: CHAIN_POLYGON_RPC_URL,
          lastBlockTag: EBlockTagLatest.FINALIZED,
          blockBatchSize: CHAIN_SCAN_BLOCKS_BATCH_SIZE,
        },
        feeCollector: {
          contract: CHAIN_POLYGON_FEE_COLLECTOR_CONTRACT,
          blockStart: CHAIN_POLYGON_FEE_COLLECTOR_BLOCK_START,
        },
      } satisfies FeeCollectionScrapingConfig,
    ],[
      // Optimism - Mainnet
      ChainKey.OPT,
      {
        version: VERSION_FEE_COLLECTOR_CHAIN_CONFIG_LATEST,
        status: EEventScrapingStatus.ACTIVE,
        chain: {
          id: ChainId.OPT,
          type: ChainType.EVM,
          rpcUrl: CHAIN_OPTIMISM_RPC_URL,
          lastBlockTag: BlockTagLatestDefault,
          blockBatchSize: CHAIN_SCAN_BLOCKS_BATCH_SIZE,
        },
        feeCollector: {
          contract: CHAIN_OPTIMISM_FEE_COLLECTOR_CONTRACT,
          blockStart: CHAIN_OPTIMISM_FEE_COLLECTOR_BLOCK_START,
        },
      } satisfies FeeCollectionScrapingConfig,
    ],[
      // Binance Smart Chain - Mainnet
      ChainKey.BSC,
      {
        version: VERSION_FEE_COLLECTOR_CHAIN_CONFIG_LATEST,
        status: EEventScrapingStatus.ACTIVE,
        chain: {
          id: ChainId.BSC,
          type: ChainType.EVM,
          rpcUrl: CHAIN_BINANCE_RPC_URL,
          lastBlockTag: BlockTagLatestDefault,
          blockBatchSize: CHAIN_SCAN_BLOCKS_BATCH_SIZE,
        },
        feeCollector: {
          contract: CHAIN_BINANCE_FEE_COLLECTOR_CONTRACT,
          blockStart: CHAIN_BINANCE_FEE_COLLECTOR_BLOCK_START,
        },
      } satisfies FeeCollectionScrapingConfig,
    ],
  ])
