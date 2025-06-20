import { BlockTag } from '@ethersproject/abstract-provider'
import {
  CHAIN_LATEST_BLOCK_TAG,
  CHAIN_QUERY_FAIL_RETRY_NB,
  CHAIN_SCAN_BLOCKS_BATCH_SIZE,
  feeCollectorChainConfigDefault,
} from '@jabba01/lfcr-common/dist/config'
import {
  EEventScrapingStatus,
  FeeCollectedEvent,
  FeeCollectionScrapingConfig,
} from '@jabba01/lfcr-common/dist/data'
import { logger as wLogger } from '@jabba01/lfcr-common/dist/logger'
import { FeeCollectedEventStore, FeeCollectionConfigStore } from '@jabba01/lfcr-database'
import { FeeCollector__factory } from '@jabba01/lfcr-lifi-contract-typings-feecollector/dist/FeeCollector'
import { ChainKey } from '@lifi/types'
import { BigNumber, ethers } from 'ethers'
import { ResultEventScrapingSession } from './dto/event-scraping-result.dto'
import { EventScrapingDatabaseError, EventScrapingError } from './utils'

/**
 * Service for scraping LI.FI FeeCollector contracts' events.
 *
 * Onchain events are scraped using the LI.FI contract ABI, from a given range of blocks,
 * then stored in a database for later processing.
 */
export class FeeCollectionEventScraper {
  /** Logger */
  private readonly logger = wLogger.child({
    label: FeeCollectionEventScraper.name,
  })

  /** DB service for the FeeCollection chain config storage */
  private readonly dbFeeCollectionConfig = new FeeCollectionConfigStore()

  /** DB service for the FeeCollection Events storage */
  private readonly dbFeeCollectionEvent = new FeeCollectedEventStore()

  /**
   * Retrieves the FeeCollector chain configuration from the database
   * If it doesn't exist, it will be created from the available default configurations
   * @param chainKey the unique LI.FI key of the target blockchain hosting the LI.FI FeeCollector contract
   * @returns the target FeeCollector chain configuration
   */
  async retrieveFeeCollectionConfig(
    chainKey: ChainKey
  ): Promise<FeeCollectionScrapingConfig> {
    const storedConfig = await this.dbFeeCollectionConfig.getByChain(chainKey)
    if (!storedConfig) {
      const feeCollectorChainConfig = feeCollectorChainConfigDefault.get(chainKey)
      if (!feeCollectorChainConfig) {
        throw new Error(
          `No configuration found for scraping FeeCollector events on chain '${chainKey}'`
        )
      }
      this.logger.debug(
        `Persisting FeeCollector scraping config for chain '${chainKey}'`
      )
      return await this.dbFeeCollectionConfig.createFeeCollectorEventScrapingConfig(
        chainKey,
        feeCollectorChainConfig
      )
    }
    this.logger.info(
      `FeeCollector scraping config for chain '${chainKey}': ${JSON.stringify(storedConfig)}`
    )
    return storedConfig
  }

  /**
   * Initiates the scraping of latest events emitted by the LI.FI FeeCollector contract
   *
   * @param chainKey Unique LI.FI key of the target blockchain hosting the LI.FI FeeCollector contract
   */
  async scrapFeeCollectorEvents(chainKey: ChainKey): Promise<ResultEventScrapingSession> {
    // Get the target FeeCollector chain configuration
    const chainConfig = await this.retrieveFeeCollectionConfig(chainKey).catch(
      (error) => {
        throw new Error(
          `Failed to retrieve the FeeCollector Scraping Config for chain '${chainKey}': ${error.message}`,
          { cause: error }
        )
      }
    )

    // Check that the FeeCollector chain scraping is enabled
    if (chainConfig.status === EEventScrapingStatus.INACTIVE) {
      const logMsg = `FeeCollector Events Scraping sessions HALTED on chain '${chainKey}'. Last scanned block: '${chainConfig.feeCollector.lastScanBlock}'`
      this.logger.warn(
        logMsg +
          ` on ${new Date(chainConfig.feeCollector.lastScanTime || 0).toISOString()}`
      )
      return {
        message: logMsg,
        eventsNew: 0,
        blocksScanned: 0,
      }
    }

    // Init the virtual onchain contract for the target chain
    const feeCollectorContract = this.initFeeCollectorContract(
      chainConfig.feeCollector.contract,
      chainConfig.chain.rpcUrl
    )

    // Get the chain last block number
    const { chainLastBlockNb, lastBlockTag } = await this.getChainLastBlock(
      chainConfig,
      feeCollectorContract
    )

    // Get the block number, last scanned one [and persisted in DB] or the one to start from per the target chain configuration
    const lastScannedBlockNb =
      chainConfig.feeCollector.lastScanBlock || chainConfig.feeCollector.blockStart - 1

    // Log the scraping session info
    this.logger.info(
      `Scraping FeeCollector.FeeCollected events on chain '${chainKey}'` +
        ` from block ${lastScannedBlockNb + 1 > chainLastBlockNb ? chainLastBlockNb : lastScannedBlockNb + 1} to last block ${chainLastBlockNb}` +
        ` (${lastBlockTag})`
    )

    // Scrape the fee collected events through batches of blocks scanning
    const countCollectedEvents = await this.extractAndStoreBlockEvents(
      lastScannedBlockNb,
      chainLastBlockNb,
      feeCollectorContract,
      chainConfig
    ).catch((error) => {
      throw new EventScrapingError(
        `Failed to extract and store events from chain '${chainKey}'\n${error.stack}`
      )
    })

    // Compute the scraping session result
    return {
      message: `${countCollectedEvents} new FeeCollected events scraped ${countCollectedEvents > 0 ? 'successfully ' : ''}from chain '${chainKey}' over ${chainLastBlockNb - lastScannedBlockNb} blocks scanned`,
      eventsNew: countCollectedEvents,
      blocksScanned: chainLastBlockNb - lastScannedBlockNb,
    }
  }

  /**
   * Retrieves the last block number of the chain, using the BlockTag provided in the chain configuration.
   *
   * Note: provider.getBlockNumber() returns latest block number (tag `latest`), not the last confirmed or safe block
   *
   * @param chainConfig the FeeCollector chain configuration
   * @param feeCollectorContract the FeeCollector contract instance
   * @returns the last block number and the BlockTag used to retrieve it
   */
  async getChainLastBlock(
    chainConfig: FeeCollectionScrapingConfig,
    feeCollectorContract: ethers.Contract,
    nbRetries?: number
  ): Promise<{ chainLastBlockNb: number; lastBlockTag: BlockTag }> {
    const lastBlockTag = chainConfig.chain.lastBlockTag || CHAIN_LATEST_BLOCK_TAG
    const chainLastBlockNb = await feeCollectorContract.provider
      .getBlock(lastBlockTag)
      .then((lastBlock) => {
        return lastBlock.number
      })
      .catch(async (error) => {
        const retriesLeft = (nbRetries ?? CHAIN_QUERY_FAIL_RETRY_NB) - 1
        if (retriesLeft > 0) {
          this.logger.warn(
            `Failed attempt to retrieve last block number for chain '${chainConfig.chainKey}' using the Block Tag '${lastBlockTag}' (Attempts left: ${retriesLeft}): ${error}`
          )
          const result = await this.getChainLastBlock(
            chainConfig,
            feeCollectorContract,
            retriesLeft
          )
          return result.chainLastBlockNb
        } else {
          throw new Error(
            `Failed to retrieve last block number of chain '${chainConfig.chainKey}' using the Block Tag '${lastBlockTag}'\n${error.stack}`
          )
        }
      })
    return { chainLastBlockNb, lastBlockTag }
  }

  /**
   * Scrapes FeeCollector.FeeCollected events from the blockchain blocks, starting from the last scanned block until last one.
   * Operates in batches of blocks, to reduce the number of calls to the RPC provider, the data post-processing & its DB storage.
   * @param lastScannedBlockNb The last block number that was scanned.
   * @param chainLastBlockNb The last block number of the chain.
   * @param chainKey The unique key of the chain.
   * @param feeCollectorContract The FeeCollector contract instance.
   * @param feeCollectorChainConfig The FeeCollector chain configuration.
   * @returns The number of FeeCollected events that were scraped.
   */
  private async extractAndStoreBlockEvents(
    lastScannedBlockNb: number,
    chainLastBlockNb: number,
    feeCollectorContract: ethers.Contract,
    feeCollectorChainConfig: FeeCollectionScrapingConfig
  ) {
    const chainKey = feeCollectorChainConfig.chainKey
    let countCollectedEvents = 0
    const batchSize = feeCollectorChainConfig.chain.blockBatchSize || CHAIN_SCAN_BLOCKS_BATCH_SIZE
    let blockStart = lastScannedBlockNb + 1
    while (blockStart <= chainLastBlockNb) {
      let blockEnd = blockStart + batchSize - 1
      if (blockEnd > chainLastBlockNb) {
        blockEnd = chainLastBlockNb
      }

      this.logger.info(
        `Scanning blocks of '${chainKey}' from ${blockStart} to ${blockEnd} (batch size: ${blockEnd - blockStart + 1})`
      )

      // Load the onchain events
      const feeCollectedEvents = await this.loadFeeCollectorEvents(
        feeCollectorContract,
        blockStart,
        blockEnd
      ).catch((error) => {
        throw new EventScrapingError(
          `Failed to load FeeCollected events from chain '${chainKey}' for blocks '${blockStart}' to '${blockEnd}'`,
          { cause: error }
        )
      })

      if (feeCollectedEvents.length > 0) {
        this.logger.info(
          `Found ${feeCollectedEvents.length} FeeCollected Event${feeCollectedEvents.length > 1 ? 's' : ''} (last block ${blockEnd})`
        )

        // Parse the fee collected events
        const feeCollectedEventsParsed = this.parseFeeCollectorEvents(
          chainKey,
          feeCollectorContract,
          feeCollectedEvents
        )

        // Persist the fee collected events
        await this.dbFeeCollectionEvent.storeFeeCollectedEvents(feeCollectedEventsParsed).catch((error) => {
          throw new EventScrapingDatabaseError(
            `Failed to store FeeCollected events in DB for chain '${chainKey}' out of blocks '${blockStart}' to '${blockEnd}'`,
            { cause: error }
          )
        })

        countCollectedEvents += feeCollectedEvents.length
      }

      // Persist the last scanned block number
      await this.dbFeeCollectionConfig.updateFeeCollectorLastScanInfo(
        feeCollectorChainConfig,
        blockEnd
      ).catch((error) => {
        throw new EventScrapingDatabaseError(
          `Failed to update the last scanned block number for chain '${chainKey}' in DB after scanning blocks '${blockStart}' to '${blockEnd}'`,
          { cause: error }
        )
      })

      // Update the start block number to scan the next batch of blocks
      blockStart = blockEnd + 1
    }
    return countCollectedEvents
  }

  /**
   * Initializes the FeeCollector contract instance for the given chain.
   * This method creates a virtual contract instance using the provided contract address and RPC provider URL.
   *
   * @param contractAddress The address of the FeeCollector contract.
   * @param providerRpcUrl The URL of the RPC provider.
   * @returns The virtual FeeCollector contract instance.
   */
  private initFeeCollectorContract(
    contractAddress: string,
    providerRpcUrl: string
  ): ethers.Contract {
    return new ethers.Contract(
      contractAddress,
      FeeCollector__factory.createInterface(),
      new ethers.providers.JsonRpcProvider(providerRpcUrl)
    )
  }

  /**
   * For a given block range all `FeesCollected` events are loaded from the FeeCollector contract.
   * @param feeCollector The FeeCollector onchain contract to load events from.
   * @param fromBlock The block number to start loading events from.
   * @param toBlock The block number to stop loading events at.
   * @returns The list of loaded events.
   */
  private async loadFeeCollectorEvents(
    feeCollector: ethers.Contract,
    fromBlock: BlockTag,
    toBlock: BlockTag,
    nbRetries?: number
  ): Promise<ethers.Event[]> {
    const filter = feeCollector.filters.FeesCollected()
    return await feeCollector.queryFilter(filter, fromBlock, toBlock).catch((error) => {
      const retriesLeft = (nbRetries ?? CHAIN_QUERY_FAIL_RETRY_NB) - 1
      if (retriesLeft > 0) {
        this.logger.warn(
          `Failed attempt to query FeeCollected events on blocks [${fromBlock}, ${toBlock}] (Attempts left: ${retriesLeft}): ${error}`
        )
        return this.loadFeeCollectorEvents(feeCollector, fromBlock, toBlock, retriesLeft)
      } else {
        throw new EventScrapingError(
          `Failed to query FeeCollected events in blocks [${fromBlock}, ${toBlock}] w/ filter '${JSON.stringify(filter)}' \n${error.stack ?? error}`,
          { cause: error }
        )
      }
    })
  }

  /**
   * Parses FeeCollector.FeeCollected events to an internal data structure.
   * @param chainKey the unique blockchain key from which the event comes from
   * @param feeCollector the FeeCollector virtual contract responsible of the events.
   * @param events a list of FeeCollected events emitted by the FeeCollector contract.
   * @returns
   */
  private parseFeeCollectorEvents(
    chainKey: ChainKey,
    feeCollector: ethers.Contract,
    events: ethers.Event[]
  ): FeeCollectedEvent[] {
    return events.map((event) => {
      const parsedEvent = feeCollector.interface.parseLog(event)

      return {
        chainKey: chainKey,
        txHash: event.transactionHash,
        blockTag: event.blockNumber,
        token: parsedEvent?.args[0],
        integrator: parsedEvent?.args[1],
        integratorFee: BigNumber.from(parsedEvent?.args[2]),
        lifiFee: BigNumber.from(parsedEvent?.args[3]),
      } satisfies FeeCollectedEvent
    })
  }
}
