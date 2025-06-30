import {
  CHAIN_LATEST_BLOCK_TAG,
  CHAIN_QUERY_FAIL_RETRY_NB,
  CHAIN_SCAN_BLOCKS_BATCH_SIZE,
  doWithLock,
  EEventScrapingState,
  EScrapingConfigStatus,
  EventScrapingStateNext,
  FeeCollectedEvent,
  FeeCollectionScrapingConfig,
  feeCollectorChainConfigDefault,
  logger as wLogger,
} from '@jabba01/lfcr-common'
import { FeeCollectedEventStore, FeeCollectionConfigStore } from '@jabba01/lfcr-database'
import { ChainKey } from '@lifi/types'
import { Address, BlockTag, PublicClient } from 'viem'
import { ResultEventScrapingSession } from './dto/event-scraping-result.dto'
import {
  abiEventFeesCollected,
  createChainClientPublic,
  EventScrapingChainError,
  EventScrapingDatabaseError,
  EventScrapingError,
  EventScrapingInputError,
  EventScrapingStatusError,
  getChainLastBlockNumber,
} from './utils'

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

  /** The public client instance for interacting with the target blockchain */
  private client = new Map<ChainKey, PublicClient>()

  /** DB service for the FeeCollection chain config storage */
  private readonly dbFeeCollectionConfig = new FeeCollectionConfigStore()

  /** DB service for the FeeCollection Events storage */
  private readonly dbFeeCollectionEvent = new FeeCollectedEventStore()

  /**
   * Flag to control the scraping loop execution.
   * Set to false to stop the scraping process.
   */
  private scrapingProcessState = new Map<ChainKey, EEventScrapingState>()

  /**
   * Change the local state of one or all events scraping processes.
   *
   * @param event the event that triggered the stop signal, e.g. 'SIGINT', 'SIGTERM'
   * @param newState the new state to set for the scraping session
   * @param chainKey the unique LI.FI key of the target blockchain hosting the LI.FI FeeCollector contract. If not provided, all scraping processes will be stopped.
   */
  private changeScrapingProcessState(
    event: string,
    newState: EEventScrapingState,
    chainKey?: ChainKey
  ): void {
    // Validate the input chain key
    if (chainKey && !Object.values(ChainKey).includes(chainKey)) {
      throw new EventScrapingInputError(
        `Invalid chain key '${chainKey}' submitted - Change state call of Events Scraping session ignored`
      )
    }
    // Validate the new state
    if (!Object.values(EEventScrapingState).includes(newState)) {
      throw new EventScrapingInputError(
        `Invalid new state '${newState}' submitted for '${chainKey}' - Change state call of Events Scraping session ignored`
      )
    }

    if (chainKey) {
      // If the chainKey is provided, change the state for that specific chain
      const currentState =
        this.scrapingProcessState.get(chainKey) || EEventScrapingState.STOPPED
      if (EventScrapingStateNext.get(currentState)?.includes(newState))
        this.scrapingProcessState.set(chainKey, newState)
      else {
        this.logger.warn(
          `Unsupported state transition for the scraping session on chain '${chainKey}': ${currentState} -> ${newState}`
        )
      }
    } else {
      // If no chainKey is provided, change the state for all chains
      this.scrapingProcessState.forEach((_, key) => {
        const currentState = this.scrapingProcessState.get(key)
        if (EventScrapingStateNext.get(currentState)?.includes(newState))
          this.scrapingProcessState.set(key, newState)
        else {
          this.logger.warn(
            `Unsupported state transition for scraping on chain '${key}': ${currentState} -> ${newState}`
          )
        }
      })
    }
    this.logger.debug(
      `Scraping process${chainKey ? ` for chain '${chainKey}'` : 'es'} State changed to '${newState}' on event '${event}'`
    )
  }

  /**
   * Stops the ongoing scraping session for a specific chain or all chains.
   * If the session is already stopped, it does nothing.
   *
   * @param event the event that triggered the stop signal, e.g. 'SIGINT', 'SIGTERM'
   * @param chainKey the unique LI.FI key of the target blockchain hosting the LI.FI FeeCollector contract. If not provided, all scraping processes will be stopped.
   */
  stopScrapingSession(event: string, chainKey?: ChainKey): void {
    const currentState = chainKey
      ? this.scrapingProcessState.get(chainKey)
      : EEventScrapingState.RUNNING
    this.logger.debug(
      `Stopping scraping session${chainKey ? ` for chain '${chainKey}' (${currentState})` : 'es'} on event '${event}'`
    )
    if (currentState === EEventScrapingState.RUNNING) {
      this.changeScrapingProcessState(event, EEventScrapingState.STOPPING, chainKey)
    }
  }

  /**
   * Retrieves the current state of local scraping processes, for all chains.
   *
   * @returns a Map of ChainKey to EEventScrapingState representing the ongoing scraping sessions
   */
  getOngoingChainScrapingSessions(): Map<ChainKey, EEventScrapingState> {
    return this.scrapingProcessState
  }

  /**
   * Retrieves the FeeCollector chain configuration from the database
   * If it doesn't exist, it will be created from the available default configurations
   * @param chainKey the unique LI.FI key of the target blockchain hosting the LI.FI FeeCollector contract
   * @returns the target FeeCollector chain configuration
   */
  async retrieveChainScrapingConfig(
    chainKey: ChainKey
  ): Promise<FeeCollectionScrapingConfig> {
    const storedConfig = await this.dbFeeCollectionConfig
      .getByChain(chainKey)
      .catch((error) => {
        throw new EventScrapingDatabaseError(
          `Failed to retrieve the FeeCollector Scraping Config for chain '${chainKey}'.`,
          { cause: error }
        )
      })
    // If the configuration does not exist, create it with the default values
    if (!storedConfig || !storedConfig.chain) {
      const feeCollectorChainConfig = feeCollectorChainConfigDefault.get(chainKey)
      if (!feeCollectorChainConfig) {
        throw new EventScrapingInputError(
          `No configuration found for scraping FeeCollector events on chain '${chainKey}'`
        )
      }
      this.logger.debug(`Persisting FeeCollector scraping config for chain '${chainKey}'`)
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
   * Creates or retrieves a public client for the given chain key.
   *
   * @param chainKey Unique LI.FI key of the target blockchain hosting the LI.FI FeeCollector contract
   * @returns A PublicClient instance for the specified chain
   */
  private async getClient(chainKey: ChainKey): Promise<PublicClient> {
    if (!this.client.has(chainKey)) {
      this.logger.debug(`Creating new public Client for chain '${chainKey}'`)
      const chainConfig = await this.retrieveChainScrapingConfig(chainKey)
      const client = createChainClientPublic(
        chainConfig.chain.id,
        chainConfig.chain.rpcUrl
      )
      this.client.set(chainKey, client as PublicClient)
    }
    return this.client.get(chainKey)
  }

  /**
   * Attempt to set the shared scraping session state as in-progress for the given chain.
   *
   * If the session is already in progress or disabled, it returns a result dataset instead.
   *
   * @param chainKey Unique LI.FI key of the target blockchain hosting the LI.FI FeeCollector contract
   * @returns The updated FeeCollectionScrapingConfig and a ResultEventScrapingSession with a message if the scraping session could not be initiated
   */
  private async setScrapingSessionStart(chainKey: ChainKey): Promise<{
    config: FeeCollectionScrapingConfig
    session: ResultEventScrapingSession
  }> {
    return await doWithLock('FeeCollectorScrapingSession_' + chainKey, async () => {
      const chainConfig = await this.retrieveChainScrapingConfig(chainKey).catch(
        (error) => {
          throw new EventScrapingDatabaseError(
            `Failed to retrieve the FeeCollector Scraping Config for chain '${chainKey}'.`,
            { cause: error }
          )
        }
      )
      // Check that running a FeeCollector chain scraping session is enabled
      if (chainConfig.status !== EScrapingConfigStatus.ENABLED) {
        if (chainConfig.status === EScrapingConfigStatus.DISABLED) {
          const logMsg = `FeeCollector Events Scraping sessions DISABLED on chain '${chainConfig.chainKey}'. Last scanned block: '${chainConfig.feeCollector.lastScanBlock}'`
          this.logger.warn(
            `${logMsg} at ${new Date(chainConfig.feeCollector.lastScanTime ?? 0).toISOString()}`
          )
          return {
            config: chainConfig,
            session: {
              message: logMsg,
              eventsNew: 0,
              blocksScanned: 0,
            },
          }
        }
        if (chainConfig.status === EScrapingConfigStatus.IN_PROGRESS) {
          const logMsg = `A FeeCollector Events Scraping session is already in progress on chain '${chainConfig.chainKey}'. Last scanned block: '${chainConfig.feeCollector.lastScanBlock}'`
          this.logger.warn(logMsg)
          return {
            config: chainConfig,
            session: {
              message: logMsg,
              eventsNew: 0,
              blocksScanned: 0,
            },
          }
        }
        throw new EventScrapingStatusError(
          `Invalid FeeCollector chain configuration status '${chainConfig.status}' for chain '${chainConfig.chainKey}'`
        )
      }

      // Set the shared scraping session status as in-progress
      return await this.dbFeeCollectionConfig
        .setScrapingSessionStatus(chainConfig.chainKey, EScrapingConfigStatus.IN_PROGRESS)
        .catch((error) => {
          throw new EventScrapingStatusError(
            `Failed to set the Shared FeeCollector Scraping config Status to '${EScrapingConfigStatus.IN_PROGRESS}' for chain '${chainConfig.chainKey}'`,
            { cause: error }
          )
        })
        .then((config) => {
          this.logger.info(
            `Shared FeeCollector Events Scraping session status is set to '${config.status}' for chain '${config.chainKey}'`
          )
          return {
            config,
            session: null,
          }
        })
    })
  }

  /**
   *
   * @param chainKey
   * @returns
   */
  async startScrapingSession(chainKey: ChainKey): Promise<ResultEventScrapingSession> {
    const sessionStartRes = await this.setScrapingSessionStart(chainKey).catch(
      (error) => {
        throw new EventScrapingError(
          `Failed to initiate the FeeCollector Scraping session for chain '${chainKey}'`,
          { cause: error }
        )
      }
    )
    if (sessionStartRes.session?.message) {
      // The session couldn't be initiated
      return sessionStartRes.session
    }
    // Update the scraping process state to RUNNING
    this.changeScrapingProcessState('SCRAPING_RUN', EEventScrapingState.RUNNING, chainKey)

    // Get the target FeeCollector chain configuration
    const chainConfig = sessionStartRes.config

    return await this.scrapFeeCollectorEvents(chainConfig)
      .catch((error) => {
        this.logger.error(
          `Failed to run the FeeCollector Scraping session for chain '${chainConfig.chainKey}'`,
          { cause: error }
        )
        throw new EventScrapingError(
          `Failed to run the FeeCollector Scraping session for chain '${chainConfig.chainKey}'`,
          { cause: error }
        )
      })
      .finally(async () => {
        this.changeScrapingProcessState(
          'SCRAPING_DONE',
          EEventScrapingState.STOPPED,
          chainKey
        )

        // Set the scraping session as completed
        await this.dbFeeCollectionConfig
          .setScrapingSessionStatus(chainConfig.chainKey, EScrapingConfigStatus.ENABLED)
          .catch((error) => {
            this.logger.error(
              `Failed to set the FeeCollector Scraping config Status to '${EScrapingConfigStatus.ENABLED}' for chain '${chainConfig.chainKey}'`,
              { cause: error }
            )
          })
      })
  }

  /**
   * Initiates the scraping of latest events emitted by the LI.FI FeeCollector contract
   *
   * @param chainKey Unique LI.FI key of the target blockchain hosting the LI.FI FeeCollector contract
   */
  private async scrapFeeCollectorEvents(
    chainConfig: FeeCollectionScrapingConfig
  ): Promise<ResultEventScrapingSession> {
    // Get the chain last block number
    const { chainLastBlockNb, lastBlockTag } = await this.getChainLastBlock(
      chainConfig,
      CHAIN_QUERY_FAIL_RETRY_NB
    )

    // Get the block number, last scanned one (as persisted in DB) or the one to start from per the target chain configuration
    const lastScannedBlockNb =
      chainConfig.feeCollector.lastScanBlock ?? chainConfig.feeCollector.blockStart - 1n

    // Log the scraping session info
    this.logger.warn(
      `Start scraping FeeCollector.FeesCollected events on chain '${chainConfig.chainKey}'` +
        ` from block '${lastScannedBlockNb + 1n > chainLastBlockNb ? chainLastBlockNb : lastScannedBlockNb + 1n}' to last block '${chainLastBlockNb}'` +
        ` (${lastBlockTag})`
    )

    // Scrap (ETL) the fee collected events through batches of blocks scanning
    const countCollectedEvents = await this.extractAndStoreBlockEvents(
      chainConfig,
      chainLastBlockNb
    ).catch((error) => {
      throw new EventScrapingError(
        `Failed to Extract and Store events out of chain '${chainConfig.chainKey}'.`,
        { cause: error }
      )
    })

    // Compute the scraping session result
    return {
      message: `${countCollectedEvents} new FeeCollected events scraped ${countCollectedEvents > 0 ? 'successfully ' : ''}from chain '${chainConfig.chainKey}' over ${chainLastBlockNb - lastScannedBlockNb} blocks scanned`,
      eventsNew: countCollectedEvents,
      blocksScanned: parseInt((chainLastBlockNb - lastScannedBlockNb).toString()),
    }
  }

  /**
   * Retrieves the last block number of the chain, using the BlockTag provided in the chain configuration.
   *
   * @param chainConfig the FeeCollector chain configuration
   * @param nbRetries optional number of retries for the chain query
   * @returns the chain's last block number and the BlockTag used to retrieve it
   */
  async getChainLastBlock(
    chainConfig: FeeCollectionScrapingConfig,
    nbRetries?: number
  ): Promise<{ chainLastBlockNb: bigint; lastBlockTag: BlockTag }> {
    if (!chainConfig?.chain) {
      throw new EventScrapingInputError(
        `Invalid chain configuration submitted: '${JSON.stringify(chainConfig?.chain)}'`
      )
    }
    const lastBlockTag = chainConfig.chain.lastBlockTag || CHAIN_LATEST_BLOCK_TAG

    const chainLastBlockNb = await getChainLastBlockNumber(
      await this.getClient(chainConfig.chainKey),
      lastBlockTag
    ).catch(async (error) => {
      const retriesLeft = (nbRetries || CHAIN_QUERY_FAIL_RETRY_NB) - 1
      if (retriesLeft > 0) {
        this.logger.warn(
          `Failed to query last block number on chain '${chainConfig.chainKey}' with tag '${lastBlockTag}' (Attempts left: ${retriesLeft}). \nCause: ${error}`
        )
        return await this.getChainLastBlock(chainConfig, retriesLeft).then((result) => {
          return result.chainLastBlockNb
        })
      } else {
        throw new EventScrapingChainError(
          `Failed to query last block number on chain '${chainConfig.chainKey}' with tag '${lastBlockTag}'`,
          { cause: error }
        )
      }
    })
    if (chainLastBlockNb < chainConfig.feeCollector.blockStart) {
      throw new EventScrapingChainError(
        `Invalid last block number '${chainLastBlockNb}' retrieved for chain '${chainConfig.chainKey}' with tag '${lastBlockTag}'`
      )
    }
    this.logger.debug(
      `Last block number on chain '${chainConfig.chainKey}' with tag '${lastBlockTag}': ${chainLastBlockNb}`
    )
    return { chainLastBlockNb, lastBlockTag }
  }

  /**
   * Scrapes FeeCollector.FeeCollected events from the blockchain blocks, starting from the last scanned block until last one.
   * Operates in batches of blocks, to reduce the number of calls to the RPC provider, the data post-processing & its DB storage.
   * @param chainConfig The FeeCollector chain configuration.
   * @param blockLast The last block number of the chain.
   * @returns The number of FeeCollected events that were scraped.
   */
  private async extractAndStoreBlockEvents(
    chainConfig: FeeCollectionScrapingConfig,
    blockLast: bigint
  ) {
    // Get the block number, last scanned one (as persisted in DB) or the one to start from per the target chain configuration
    const lastScannedBlockNb =
      chainConfig.feeCollector.lastScanBlock || chainConfig.feeCollector.blockStart - 1n

    const chainKey = chainConfig.chainKey
    let countCollectedEvents = 0
    const batchSize = chainConfig.chain.blockBatchSize || CHAIN_SCAN_BLOCKS_BATCH_SIZE
    const blockStartIni = lastScannedBlockNb + 1n
    let blockStart = blockStartIni

    while (
      blockStart <= blockLast &&
      this.scrapingProcessState.get(chainKey) === EEventScrapingState.RUNNING
    ) {
      let blockEnd = blockStart + BigInt(batchSize) - 1n
      if (blockEnd > blockLast) {
        blockEnd = blockLast
      }

      if (this.logger.isInfoEnabled()) {
        this.logger.info(
          `Scanning blocks of '${chainKey}' from ${blockStart} to ${blockEnd} (batch size: ${blockEnd - blockStart + 1n}) - Progress: ${((blockEnd - blockStartIni + 1n) * 100n) / (blockLast - blockStartIni + 1n)}% (${blockLast - blockEnd} blocks left)`
        )
      }

      // Load the onchain events
      const feeCollectedEvents = await this.loadFeeCollectorEvents(
        chainKey,
        chainConfig.feeCollector.contract,
        blockStart,
        blockEnd
      ).catch((error) => {
        throw new EventScrapingChainError(
          `Failed to load FeeCollected events from chain '${chainKey}' for blocks '${blockStart}' to '${blockEnd}'`,
          { cause: error }
        )
      })

      if (feeCollectedEvents.length > 0) {
        this.logger.info(
          `Found ${feeCollectedEvents.length} FeeCollected Event${feeCollectedEvents.length > 1 ? 's' : ''} (last block ${blockEnd})`
        )

        // Persist the fee collected events
        await this.dbFeeCollectionEvent
          .storeFeeCollectedEvents(feeCollectedEvents)
          .catch((error) => {
            this.logger.error(
              `Failed to store FeeCollected events in DB for chain '${chainKey}' extracted from blocks '${blockStart}' to '${blockEnd}'.\n${error}`
            )
          })

        countCollectedEvents += feeCollectedEvents.length
      }

      // Persist the last scanned block number
      await this.dbFeeCollectionConfig
        .updateFeeCollectorLastScanInfo(chainConfig, blockEnd)
        .catch((error) => {
          throw new EventScrapingDatabaseError(
            `Failed to update the last scanned block number for chain '${chainKey}' in DB after scanning blocks '${blockStart}' to '${blockEnd}'`,
            { cause: error }
          )
        })

      // Update the start block number to scan the next batch of blocks
      blockStart = blockEnd + 1n
    }

    return countCollectedEvents
  }

  /**
   * For a given block range all `FeesCollected` events are loaded from the FeeCollector contract.
   * @param feeCollector The FeeCollector onchain contract to load events from.
   * @param fromBlock The block number to start loading events from.
   * @param toBlock The block number to stop loading events at.
   * @returns The list of loaded events.
   */
  private async loadFeeCollectorEvents(
    chainKey: ChainKey,
    contractAddress: Address,
    fromBlock: bigint,
    toBlock: bigint,
    nbRetries?: number
  ): Promise<FeeCollectedEvent[]> {
    const client = await this.getClient(chainKey)
    const loggedEvents = await client
      .getContractEvents({
        address: contractAddress,
        abi: abiEventFeesCollected,
        eventName: 'FeesCollected',
        fromBlock,
        toBlock,
        strict: false,
      })
      .catch(async (error) => {
        const retriesLeft = (nbRetries ?? CHAIN_QUERY_FAIL_RETRY_NB) - 1
        if (retriesLeft > 0) {
          this.logger.warn(
            `Failed attempt to query FeeCollected events on blocks [${fromBlock}, ${toBlock}] (Attempts left: ${retriesLeft}): ${error}`
          )
          return await this.loadFeeCollectorEvents(
            chainKey,
            contractAddress,
            fromBlock,
            toBlock,
            retriesLeft
          )
        } else {
          throw new EventScrapingChainError(
            `Failed to query FeeCollected events in blocks [${fromBlock}, ${toBlock}] for contract '${contractAddress}'`,
            { cause: error }
          )
        }
      })

    return loggedEvents.map((log) => {
      const { args, blockNumber, transactionHash } = log
      return {
        chainKey: chainKey,
        txHash: transactionHash,
        blockTag: blockNumber,
        token: args?._token,
        integrator: args?._integrator,
        integratorFee: args?._integratorFee,
        lifiFee: args?._lifiFee,
      } satisfies FeeCollectedEvent
    })
  }
}
