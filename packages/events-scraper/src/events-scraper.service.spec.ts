import {
  CHAIN_LATEST_BLOCK_TAG,
  CHAIN_SCAN_BLOCKS_BATCH_SIZE,
} from '@jabba01/lfcr-common/dist/config'
import {
  EEventScrapingStatus,
  FeeCollectedEvent,
  FeeCollectionScrapingConfig,
} from '@jabba01/lfcr-common/dist/data'
import { ChainKey } from '@lifi/types'
import { BigNumber, ethers } from 'ethers'
import { MongoMemoryServer } from 'mongodb-memory-server'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { FeeCollectionEventScraper } from './events-scraper.service'
import { EventScrapingError } from './utils'

// Mock the database connector and dependencies
vi.mock('@jabba01/lfcr-database', () => {
  return {
    DatabaseConnector: {
      init: vi.fn().mockResolvedValue(undefined),
      close: vi.fn().mockResolvedValue(undefined),
    },
    FeeCollectionConfigStore: vi.fn().mockImplementation(() => ({
      getByChain: vi.fn(),
      createFeeCollectorEventScrapingConfig: vi.fn(),
      updateFeeCollectorLastScanInfo: vi.fn(),
    })),
    FeeCollectedEventStore: vi.fn().mockImplementation(() => ({
      storeFeeCollectedEvents: vi.fn(),
    })),
  }
})

// Mock the lifi contract typings
vi.mock('@jabba01/lfcr-lifi-contract-typings-feecollector/dist/FeeCollector', () => {
  return {
    FeeCollector__factory: {
      createInterface: vi.fn().mockReturnValue({}),
    },
  }
})

describe('FeeCollectionEventScraper', () => {
  let scraper: FeeCollectionEventScraper
  let mongoServer: MongoMemoryServer

  // Setup mocks for ethers.Contract
  let mockContract: any
  let mockProvider: any
  let mockInterface: any

  // Config values
  const mockChainKey = ChainKey.POL
  const mockLastBlockNumber = 12345678
  const mockLastScannedBlock = 12345000
  const mockStartBlock = 12345000 // Same as lastScannedBlock to test edge case
  const mockContractAddress = '0xbD6C7B0d2f68c2b7805d88388319cfB6EcB50eA9'
  const mockRpcUrl = 'https://polygon-rpc.com'

  // Mock events
  const mockEvents: ethers.Event[] = [
    {
      blockNumber: 12345001,
      blockHash: '0xabcdef',
      transactionIndex: 0,
      removed: false,
      address: mockContractAddress,
      data: '0x',
      topics: [],
      transactionHash: '0x123456',
      logIndex: 0,
      removeListener: vi.fn(),
      getBlock: vi.fn(),
      getTransaction: vi.fn(),
      getTransactionReceipt: vi.fn(),
    } as ethers.Event,
    {
      blockNumber: 12345001,
      blockHash: '0xabcdef',
      transactionIndex: 1,
      removed: false,
      address: mockContractAddress,
      data: '0x',
      topics: [],
      transactionHash: '0x789012',
      logIndex: 1,
      removeListener: vi.fn(),
      getBlock: vi.fn(),
      getTransaction: vi.fn(),
      getTransactionReceipt: vi.fn(),
    } as ethers.Event,
  ]

  // Mock parsed events
  const mockParsedEvents: FeeCollectedEvent[] = [
    {
      chainKey: mockChainKey,
      txHash: '0x123456',
      blockTag: 12345001,
      token: '0xTokenAddress1',
      integrator: '0xIntegratorAddress1',
      integratorFee: BigNumber.from('1000000'),
      lifiFee: BigNumber.from('500000'),
    },
    {
      chainKey: mockChainKey,
      txHash: '0x789012',
      blockTag: 12345001,
      token: '0xTokenAddress2',
      integrator: '0xIntegratorAddress2',
      integratorFee: BigNumber.from('2000000'),
      lifiFee: BigNumber.from('1000000'),
    },
  ]

  // Mock chain configuration
  const mockChainConfig: FeeCollectionScrapingConfig = {
    chainKey: mockChainKey,
    status: EEventScrapingStatus.ACTIVE,
    chain: {
      id: 137, // Polygon Mainnet
      type: 'EVM',
      rpcUrl: mockRpcUrl,
      lastBlockTag: CHAIN_LATEST_BLOCK_TAG,
      blockBatchSize: CHAIN_SCAN_BLOCKS_BATCH_SIZE,
    },
    feeCollector: {
      contract: mockContractAddress,
      blockStart: mockStartBlock,
      lastScanBlock: mockLastScannedBlock,
      lastScanTime: Date.now() - 3600000, // 1 hour ago
    },
    docId: 'evtScrap_feecollect_pol',
  }

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create()
  })

  afterAll(async () => {
    if (mongoServer) {
      await mongoServer.stop()
    }
  })

  beforeEach(() => {
    vi.clearAllMocks()

    // Setup mock ethers contract
    mockInterface = {
      parseLog: vi.fn().mockImplementation((event) => {
        const index = mockEvents.findIndex(
          (e) => e.transactionHash === event.transactionHash
        )
        return {
          args: [
            mockParsedEvents[index].token,
            mockParsedEvents[index].integrator,
            mockParsedEvents[index].integratorFee,
            mockParsedEvents[index].lifiFee,
          ],
        }
      }),
    }

    mockProvider = {
      getBlock: vi.fn().mockResolvedValue({
        number: mockLastBlockNumber,
        hash: '0xblock',
        parentHash: '0xparent',
        timestamp: Date.now(),
        nonce: '0x0',
        difficulty: 0,
        gasLimit: { _hex: '0x0', _isBigNumber: true },
        gasUsed: { _hex: '0x0', _isBigNumber: true },
        miner: '0x0',
        extraData: '0x0',
        transactions: [],
      }),
    }

    mockContract = {
      provider: mockProvider,
      interface: mockInterface,
      filters: {
        FeesCollected: vi.fn().mockReturnValue({}),
      },
      queryFilter: vi.fn(),
    }

    vi.spyOn(ethers, 'Contract').mockImplementation(() => mockContract)

    scraper = new FeeCollectionEventScraper()
  })

  describe('scrapFeeCollectorEvents', () => {
    it('should successfully scrape events from the blockchain', async () => {
      // Setup mocks for the happy path
      const dbFeeCollectionConfig = scraper['dbFeeCollectionConfig']
      const dbFeeCollectionEvent = scraper['dbFeeCollectionEvent']

      // Mock getByChain to return the mockChainConfig
      vi.spyOn(dbFeeCollectionConfig, 'getByChain').mockResolvedValue(mockChainConfig)

      // Mock queryFilter to return mockEvents for the batch
      mockContract.queryFilter.mockResolvedValue(mockEvents)

      // Mock updateFeeCollectorLastScanInfo to return updated config
      vi.spyOn(dbFeeCollectionConfig, 'updateFeeCollectorLastScanInfo').mockResolvedValue(
        {
          ...mockChainConfig,
          feeCollector: {
            ...mockChainConfig.feeCollector,
            lastScanBlock: mockLastBlockNumber,
            lastScanTime: expect.any(Number),
          },
        }
      )

      // Mock storeFeeCollectedEvents to return a resolved promise
      vi.spyOn(dbFeeCollectionEvent, 'storeFeeCollectedEvents').mockResolvedValue(
        undefined
      )

      // Execute the method
      const result = await scraper.scrapFeeCollectorEvents(mockChainKey)

      // Verify the result
      expect(result).toEqual({
        message: expect.stringContaining(
          `${mockEvents.length} new FeeCollected events scraped successfully`
        ),
        eventsNew: mockEvents.length,
        blocksScanned: mockLastBlockNumber - mockLastScannedBlock,
      })

      // Verify interactions
      expect(dbFeeCollectionConfig.getByChain).toHaveBeenCalledWith(mockChainKey)
      expect(mockContract.queryFilter).toHaveBeenCalled()
      expect(dbFeeCollectionEvent.storeFeeCollectedEvents).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            chainKey: mockChainKey,
            txHash: expect.any(String),
            blockTag: expect.any(Number),
          }),
        ])
      )
      expect(dbFeeCollectionConfig.updateFeeCollectorLastScanInfo).toHaveBeenCalledWith(
        mockChainConfig,
        expect.any(Number)
      )
    })

    it('should return empty result when scraping is disabled', async () => {
      // Setup inactive config
      const inactiveConfig = {
        ...mockChainConfig,
        status: EEventScrapingStatus.INACTIVE,
      }

      // Mock getByChain to return inactive config
      vi.spyOn(scraper['dbFeeCollectionConfig'], 'getByChain').mockResolvedValue(
        inactiveConfig
      )

      // Execute the method
      const result = await scraper.scrapFeeCollectorEvents(mockChainKey)

      // Verify the result
      expect(result).toEqual({
        message: expect.stringContaining('FeeCollector Events Scraping sessions HALTED'),
        eventsNew: 0,
        blocksScanned: 0,
      })

      // Verify no further interactions
      expect(mockContract.queryFilter).not.toHaveBeenCalled()
      expect(
        scraper['dbFeeCollectionEvent'].storeFeeCollectedEvents
      ).not.toHaveBeenCalled()
    })

    it('should handle case when no events are found', async () => {
      // Setup mocks
      vi.spyOn(scraper['dbFeeCollectionConfig'], 'getByChain').mockResolvedValue(
        mockChainConfig
      )
      mockContract.queryFilter.mockResolvedValue([]) // No events returned

      // Mock updateFeeCollectorLastScanInfo
      vi.spyOn(
        scraper['dbFeeCollectionConfig'],
        'updateFeeCollectorLastScanInfo'
      ).mockResolvedValue({
        ...mockChainConfig,
        feeCollector: {
          ...mockChainConfig.feeCollector,
          lastScanBlock: mockLastBlockNumber,
        },
      })

      // Execute the method
      const result = await scraper.scrapFeeCollectorEvents(mockChainKey)

      // Verify the result
      expect(result).toEqual({
        message: expect.stringContaining('0 new FeeCollected events scraped'),
        eventsNew: 0,
        blocksScanned: mockLastBlockNumber - mockLastScannedBlock,
      })

      // Verify storeFeeCollectedEvents was not called
      expect(
        scraper['dbFeeCollectionEvent'].storeFeeCollectedEvents
      ).not.toHaveBeenCalled()

      // Verify updateFeeCollectorLastScanInfo was still called
      expect(
        scraper['dbFeeCollectionConfig'].updateFeeCollectorLastScanInfo
      ).toHaveBeenCalled()
    })

    it('should create config if it does not exist', async () => {
      // Setup mocks
      vi.spyOn(scraper['dbFeeCollectionConfig'], 'getByChain').mockResolvedValue(
        undefined
      )
      vi.spyOn(
        scraper['dbFeeCollectionConfig'],
        'createFeeCollectorEventScrapingConfig'
      ).mockResolvedValue(mockChainConfig)
      mockContract.queryFilter.mockResolvedValue([])

      // Mock updateFeeCollectorLastScanInfo
      vi.spyOn(
        scraper['dbFeeCollectionConfig'],
        'updateFeeCollectorLastScanInfo'
      ).mockResolvedValue({
        ...mockChainConfig,
        feeCollector: {
          ...mockChainConfig.feeCollector,
          lastScanBlock: mockLastBlockNumber,
        },
      })

      // Execute the method
      const result = await scraper.scrapFeeCollectorEvents(mockChainKey)

      // Verify createFeeCollectorEventScrapingConfig was called
      expect(
        scraper['dbFeeCollectionConfig'].createFeeCollectorEventScrapingConfig
      ).toHaveBeenCalledWith(mockChainKey, expect.any(Object))

      // Verify the result
      expect(result).toEqual({
        message: expect.any(String),
        eventsNew: 0,
        blocksScanned: expect.any(Number),
      })
    })

    it('should throw error when retrieving chain config fails', async () => {
      // Setup mock to throw an error
      vi.spyOn(scraper['dbFeeCollectionConfig'], 'getByChain').mockRejectedValue(
        new Error('Database connection error')
      )

      // Execute and verify
      await expect(scraper.scrapFeeCollectorEvents(mockChainKey)).rejects.toThrow(
        expect.objectContaining({
          message: expect.stringContaining(
            'Failed to retrieve the FeeCollector Scraping Config'
          ),
        })
      )
    })

    it('should throw error when extractAndStoreBlockEvents fails', async () => {
      // Setup mocks
      vi.spyOn(scraper['dbFeeCollectionConfig'], 'getByChain').mockResolvedValue(
        mockChainConfig
      )

      // Mock queryFilter to throw error
      mockContract.queryFilter.mockRejectedValue(new Error('RPC error'))

      // Execute and verify
      await expect(scraper.scrapFeeCollectorEvents(mockChainKey)).rejects.toThrow(
        EventScrapingError
      )
      await expect(scraper.scrapFeeCollectorEvents(mockChainKey)).rejects.toThrow(
        expect.objectContaining({
          message: expect.stringContaining(
            'Failed to extract and store events from chain'
          ),
        })
      )
    })
  })

  describe('getChainLastBlock', () => {
    it('should return the last block number and tag', async () => {
      // Execute the method
      const result = await scraper.getChainLastBlock(mockChainConfig, mockContract)

      // Verify the result
      expect(result).toEqual({
        chainLastBlockNb: mockLastBlockNumber,
        lastBlockTag: mockChainConfig.chain.lastBlockTag,
      })

      // Verify provider.getBlock was called with the correct tag
      expect(mockProvider.getBlock).toHaveBeenCalledWith(
        mockChainConfig.chain.lastBlockTag
      )
    })

    it('should use default block tag if not provided in config', async () => {
      // Create config without lastBlockTag
      const configWithoutTag = {
        ...mockChainConfig,
        chain: {
          ...mockChainConfig.chain,
          lastBlockTag: undefined,
        },
      }

      // Execute the method
      const result = await scraper.getChainLastBlock(configWithoutTag, mockContract)

      // Verify the result
      expect(result).toEqual({
        chainLastBlockNb: mockLastBlockNumber,
        lastBlockTag: CHAIN_LATEST_BLOCK_TAG,
      })

      // Verify provider.getBlock was called with the default tag
      expect(mockProvider.getBlock).toHaveBeenCalledWith(CHAIN_LATEST_BLOCK_TAG)
    })

    it('should retry on failure and succeed on retry', async () => {
      // Setup mock to fail once then succeed
      mockProvider.getBlock
        .mockRejectedValueOnce(new Error('RPC timeout'))
        .mockResolvedValueOnce({
          number: mockLastBlockNumber,
          hash: '0xblock',
          parentHash: '0xparent',
          timestamp: Date.now(),
          nonce: '0x0',
          difficulty: 0,
          gasLimit: { _hex: '0x0', _isBigNumber: true },
          gasUsed: { _hex: '0x0', _isBigNumber: true },
          miner: '0x0',
          extraData: '0x0',
          transactions: [],
        })

      // Execute the method
      const result = await scraper.getChainLastBlock(mockChainConfig, mockContract)

      // Verify the result
      expect(result).toEqual({
        chainLastBlockNb: mockLastBlockNumber,
        lastBlockTag: mockChainConfig.chain.lastBlockTag,
      })

      // Verify getBlock was called twice
      expect(mockProvider.getBlock).toHaveBeenCalledTimes(2)
    })

    it('should throw error after all retries fail', async () => {
      // Setup mock to always fail
      mockProvider.getBlock.mockRejectedValue(new Error('RPC error'))

      // Execute and verify
      await expect(
        scraper.getChainLastBlock(mockChainConfig, mockContract, 2)
      ).rejects.toThrow(
        expect.objectContaining({
          message: expect.stringContaining('Failed to retrieve last block number'),
        })
      )

      // Verify getBlock was called the expected number of times (2 retries)
      expect(mockProvider.getBlock).toHaveBeenCalledTimes(2)
    })
  })

  describe('retrieveFeeCollectionConfig', () => {
    it('should retrieve config from database if it exists', async () => {
      // Setup mock
      vi.spyOn(scraper['dbFeeCollectionConfig'], 'getByChain').mockResolvedValue(
        mockChainConfig
      )

      // Execute the method
      const result = await scraper.retrieveFeeCollectionConfig(mockChainKey)

      // Verify the result
      expect(result).toEqual(mockChainConfig)

      // Verify getByChain was called
      expect(scraper['dbFeeCollectionConfig'].getByChain).toHaveBeenCalledWith(
        mockChainKey
      )

      // Verify createFeeCollectorEventScrapingConfig was not called
      expect(
        scraper['dbFeeCollectionConfig'].createFeeCollectorEventScrapingConfig
      ).not.toHaveBeenCalled()
    })

    it('should create config if it does not exist', async () => {
      // Setup mocks
      vi.spyOn(scraper['dbFeeCollectionConfig'], 'getByChain').mockResolvedValue(
        undefined
      )
      vi.spyOn(
        scraper['dbFeeCollectionConfig'],
        'createFeeCollectorEventScrapingConfig'
      ).mockResolvedValue(mockChainConfig)

      // Execute the method
      const result = await scraper.retrieveFeeCollectionConfig(mockChainKey)

      // Verify the result
      expect(result).toEqual(mockChainConfig)

      // Verify createFeeCollectorEventScrapingConfig was called
      expect(
        scraper['dbFeeCollectionConfig'].createFeeCollectorEventScrapingConfig
      ).toHaveBeenCalledWith(mockChainKey, expect.any(Object))
    })

    it('should throw error when no default config exists for chain', async () => {
      // Setup mocks
      vi.spyOn(scraper['dbFeeCollectionConfig'], 'getByChain').mockResolvedValue(
        undefined
      )

      // Use a chain key that doesn't have a default config
      const unknownChainKey = 'UNKNOWN' as ChainKey

      // Execute and verify
      await expect(scraper.retrieveFeeCollectionConfig(unknownChainKey)).rejects.toThrow(
        expect.objectContaining({
          message: expect.stringContaining(
            'No configuration found for scraping FeeCollector events'
          ),
        })
      )
    })
  })

  describe('loadFeeCollectorEvents', () => {
    it('should load events from contract', async () => {
      // Setup mock
      mockContract.queryFilter.mockResolvedValue(mockEvents)

      // Execute the method
      const result = await scraper['loadFeeCollectorEvents'](
        mockContract,
        mockLastScannedBlock + 1,
        mockLastBlockNumber
      )

      // Verify the result
      expect(result).toEqual(mockEvents)

      // Verify queryFilter was called with correct parameters
      expect(mockContract.queryFilter).toHaveBeenCalledWith(
        {},
        mockLastScannedBlock + 1,
        mockLastBlockNumber
      )
    })

    it('should retry on failure and succeed on retry', async () => {
      // Setup mock to fail once then succeed
      mockContract.queryFilter
        .mockRejectedValueOnce(new Error('RPC timeout'))
        .mockResolvedValueOnce(mockEvents)

      // Execute the method
      const result = await scraper['loadFeeCollectorEvents'](
        mockContract,
        mockLastScannedBlock + 1,
        mockLastBlockNumber
      )

      // Verify the result
      expect(result).toEqual(mockEvents)

      // Verify queryFilter was called twice
      expect(mockContract.queryFilter).toHaveBeenCalledTimes(2)
    })

    it('should throw error after all retries fail', async () => {
      // Setup mock to always fail
      mockContract.queryFilter.mockRejectedValue(new Error('RPC error'))

      // Execute and verify
      await expect(
        scraper['loadFeeCollectorEvents'](
          mockContract,
          mockLastScannedBlock + 1,
          mockLastBlockNumber,
          2
        )
      ).rejects.toThrow(
        expect.objectContaining({
          message: expect.stringContaining('Failed to query FeeCollected events'),
        })
      )

      // Verify queryFilter was called the expected number of times (2 retries)
      expect(mockContract.queryFilter).toHaveBeenCalledTimes(2)
    })
  })

  describe('parseFeeCollectorEvents', () => {
    it('should parse raw events to FeeCollectedEventParsed objects', () => {
      // Execute the method
      const result = scraper['parseFeeCollectorEvents'](
        mockChainKey,
        mockContract,
        mockEvents
      )

      // Verify the result
      expect(result).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            chainKey: mockChainKey,
            txHash: expect.any(String),
            blockTag: expect.any(Number),
            token: expect.any(String),
            integrator: expect.any(String),
            integratorFee: expect.any(BigNumber),
            lifiFee: expect.any(BigNumber),
          }),
        ])
      )

      // Verify interface.parseLog was called for each event
      expect(mockContract.interface.parseLog).toHaveBeenCalledTimes(mockEvents.length)
    })
  })

  describe('extractAndStoreBlockEvents', () => {
    it('should extract and store events in batches', async () => {
      // Setup mocks
      mockContract.queryFilter.mockResolvedValue(mockEvents)

      // Mock parseFeeCollectorEvents
      vi.spyOn(scraper as any, 'parseFeeCollectorEvents').mockReturnValue(
        mockParsedEvents
      )

      // Mock storeFeeCollectedEvents
      vi.spyOn(
        scraper['dbFeeCollectionEvent'],
        'storeFeeCollectedEvents'
      ).mockResolvedValue(undefined)

      // Mock updateFeeCollectorLastScanInfo
      vi.spyOn(
        scraper['dbFeeCollectionConfig'],
        'updateFeeCollectorLastScanInfo'
      ).mockResolvedValue(mockChainConfig)

      // Create large range to ensure batching
      const startBlock = mockLastBlockNumber - CHAIN_SCAN_BLOCKS_BATCH_SIZE * 2.5

      // Execute the method
      const result = await scraper['extractAndStoreBlockEvents'](
        startBlock,
        mockLastBlockNumber,
        mockContract,
        mockChainConfig
      )

      // Verify the result
      expect(result).toBeGreaterThan(0)

      // Verify queryFilter was called for each batch
      expect(mockContract.queryFilter).toHaveBeenCalledTimes(3) // 2.5 batches => 3 calls

      // Verify updateFeeCollectorLastScanInfo was called for each batch
      expect(
        scraper['dbFeeCollectionConfig'].updateFeeCollectorLastScanInfo
      ).toHaveBeenCalledTimes(3)
    })

    it('should handle empty blocks without events', async () => {
      // Setup mocks
      mockContract.queryFilter.mockResolvedValue([])

      // Mock updateFeeCollectorLastScanInfo
      vi.spyOn(
        scraper['dbFeeCollectionConfig'],
        'updateFeeCollectorLastScanInfo'
      ).mockResolvedValue(mockChainConfig)

      // Execute the method
      const result = await scraper['extractAndStoreBlockEvents'](
        mockLastScannedBlock,
        mockLastBlockNumber,
        mockContract,
        mockChainConfig
      )

      // Verify the result
      expect(result).toBe(0)

      // Verify storeFeeCollectedEvents was not called
      expect(
        scraper['dbFeeCollectionEvent'].storeFeeCollectedEvents
      ).not.toHaveBeenCalled()

      // Verify updateFeeCollectorLastScanInfo was still called
      expect(
        scraper['dbFeeCollectionConfig'].updateFeeCollectorLastScanInfo
      ).toHaveBeenCalled()
    })
  })

  describe('initFeeCollectorContract', () => {
    it('should initialize a contract with the correct parameters', () => {
      // Execute the method
      const result = scraper['initFeeCollectorContract'](mockContractAddress, mockRpcUrl)

      // Verify ethers.Contract was called with the correct parameters
      expect(ethers.Contract).toHaveBeenCalledWith(
        mockContractAddress,
        expect.any(Object),
        expect.any(Object)
      )

      // Verify the result
      expect(result).toBe(mockContract)
    })
  })
})
