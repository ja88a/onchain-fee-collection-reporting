import { ChainKey, ChainType } from '@lifi/types'
import { FeeCollectionConfigStore } from './fee-collection-config-store.service'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  EScrapingConfigStatus,
  FeeCollectionScrapingConfig,
} from '@jabba01/lfcr-common/dist/data'
import { DbError } from '../database.utils'

// Mock Mongoose
vi.mock('mongoose', () => {
  return {
    connection: {
      readyState: 1
    },
    Types: {
      ObjectId: class {
        toString() {
          return 'mock-object-id';
        }
      }
    }
  }
})

// Mock the logger to avoid console output during tests
vi.mock('@jabba01/lfcr-common/dist/logger', () => ({
  logger: {
    child: () => ({
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    }),
  },
}))

// Create a chainable query mock
const createQueryMock = (returnValue) => {
  const queryMock = {
    exec: vi.fn(() => Promise.resolve(returnValue))
  };
  return queryMock;
};

// Mock the models
vi.mock('../models', () => {
  const modelMock = {
    create: vi.fn(),
    findOne: vi.fn(),
    findByIdAndUpdate: vi.fn()
  };
  
  return {
    getFeeCollectionScrapingConfigModel: () => modelMock
  };
})

// Import mocked modules after mocking
import { getFeeCollectionScrapingConfigModel } from '../models'

describe('FeeCollectionConfigStore', () => {
  let service: FeeCollectionConfigStore
  let mockConfig: FeeCollectionScrapingConfig
  let mockModel: any

  // Setup before each test
  beforeEach(() => {
    // Reset all mocks
    vi.resetAllMocks()
    
    // Get reference to mockModel
    mockModel = getFeeCollectionScrapingConfigModel()
    
    // Initialize service
    service = new FeeCollectionConfigStore()

    // Create a mock config for testing
    mockConfig = {
      version: 1,
      chainKey: ChainKey.POL,
      status: EScrapingConfigStatus.ENABLED,
      chain: {
        id: 137,
        type: ChainType.EVM,
        rpcUrl: 'https://polygon-rpc.com',
        lastBlockTag: 'finalized',
        blockBatchSize: 1_000,
      },
      feeCollector: {
        contract: '0x1231231231231231231231231231231231231231',
        blockStart: 30_000_000n,
        lastScanBlock: 39_000_000n,
        lastScanTime: Date.now(),
      },
    }
  })

  describe('createFeeCollectorEventScrapingConfig', () => {
    it('should create a new scraping config successfully', async () => {
      // Arrange
      const mockDoc = {
        id: 'mock-id-123',
        ...mockConfig
      }
      
      mockModel.create.mockResolvedValueOnce(mockDoc)

      // Act
      const result = await service.createFeeCollectorEventScrapingConfig(
        ChainKey.POL,
        mockConfig
      )

      // Assert
      expect(mockModel.create).toHaveBeenCalledTimes(1)
      expect(result).toBeDefined()
      expect(result.chainKey).toBe(ChainKey.POL)
      expect(result.status).toBe(EScrapingConfigStatus.ENABLED)
      expect(result.chain.id).toBe(137)
      expect(result.docId).toBeDefined()
    })

    it('should throw DbError if creation fails', async () => {
      // Arrange
      mockModel.create.mockRejectedValueOnce(new Error('Database error'))

      // Act & Assert
      await expect(
        service.createFeeCollectorEventScrapingConfig(ChainKey.POL, mockConfig)
      ).rejects.toThrow(DbError)
      expect(mockModel.create).toHaveBeenCalledTimes(1)
    })
  })

  describe('getByChain', () => {
    it('should retrieve a config by chain key', async () => {
      // Arrange
      const mockDoc = {
        id: 'mock-id-123',
        ...mockConfig
      }
      
      mockModel.findOne.mockReturnValueOnce(createQueryMock(mockDoc))

      // Act
      const result = await service.getByChain(ChainKey.POL)

      // Assert
      expect(mockModel.findOne).toHaveBeenCalledTimes(1)
      expect(mockModel.findOne).toHaveBeenCalledWith({ chainKey: ChainKey.POL })
      expect(result).toBeDefined()
      expect(result?.chainKey).toBe(ChainKey.POL)
      expect(result?.chain.id).toBe(137)
    })

    it('should return undefined if config does not exist', async () => {
      // Arrange
      mockModel.findOne.mockReturnValueOnce(createQueryMock(null))

      // Act
      const result = await service.getByChain(ChainKey.ETH)

      // Assert
      expect(mockModel.findOne).toHaveBeenCalledTimes(1)
      expect(mockModel.findOne).toHaveBeenCalledWith({ chainKey: ChainKey.ETH })
      expect(result).toBeUndefined()
    })

    it('should handle database errors gracefully', async () => {
      // Arrange
      mockModel.findOne.mockReturnValueOnce({
        exec: vi.fn().mockRejectedValueOnce(new Error('Database error'))
      })

      // Act & Assert
      await expect(service.getByChain(ChainKey.POL)).rejects.toThrow('Database error')
      expect(mockModel.findOne).toHaveBeenCalledTimes(1)
    })
  })

  describe('updateFeeCollectorLastScanInfo', () => {
    it('should update the last scan info successfully', async () => {
      // Arrange
      const mockDoc = {
        id: 'mock-id-123',
        ...mockConfig
      }
      
      const configWithId = {
        ...mockConfig,
        docId: 'mock-id-123'
      }
      
      const newBlockNumber = 40_500_000n
      
      // Clone the config to avoid modifying the original
      const updatedConfig = JSON.parse(JSON.stringify(configWithId));
      
      // Mock the findByIdAndUpdate to return the original doc (since { new: false } is used)
      mockModel.findByIdAndUpdate.mockReturnValueOnce(createQueryMock(mockDoc))

      // Act
      const result = await service.updateFeeCollectorLastScanInfo(updatedConfig, newBlockNumber)

      // Assert
      expect(mockModel.findByIdAndUpdate).toHaveBeenCalledTimes(1)
      expect(mockModel.findByIdAndUpdate).toHaveBeenCalledWith(
        'mock-id-123',
        { feeCollector: expect.objectContaining({ lastScanBlock: newBlockNumber }) },
        { new: false }
      )
      expect(result).toBeDefined()
      // The original doc is returned since { new: false } is used in findByIdAndUpdate
      expect(result.feeCollector.lastScanBlock).toBe(mockConfig.feeCollector.lastScanBlock) 
      
      // Check that the input config was modified
      expect(updatedConfig.feeCollector.lastScanBlock).toBe(newBlockNumber)
    })

    it('should throw DbError if document is not found', async () => {
      // Arrange
      const configWithId = {
        ...mockConfig,
        docId: 'mock-id-123'
      }
      
      mockModel.findByIdAndUpdate.mockReturnValueOnce(createQueryMock(null))

      // Act & Assert
      await expect(
        service.updateFeeCollectorLastScanInfo(configWithId, 40_500_000n)
      ).rejects.toThrow(DbError)
      expect(mockModel.findByIdAndUpdate).toHaveBeenCalledTimes(1)
    })

    it('should throw DbError if update fails', async () => {
      // Arrange
      const configWithId = {
        ...mockConfig,
        docId: 'mock-id-123'
      }
      
      mockModel.findByIdAndUpdate.mockReturnValueOnce({
        exec: vi.fn().mockRejectedValueOnce(new Error('Database error'))
      })

      // Act & Assert
      await expect(
        service.updateFeeCollectorLastScanInfo(configWithId, 40_500_000n)
      ).rejects.toThrow(DbError)
      expect(mockModel.findByIdAndUpdate).toHaveBeenCalledTimes(1)
    })
  })

  describe('convertToEntity', () => {
    it('should correctly convert DB document to entity', async () => {
      // Arrange
      const mockDoc = {
        id: 'mock-id-123',
        ...mockConfig
      }
      
      mockModel.findOne.mockReturnValueOnce(createQueryMock(mockDoc))

      // Act - getByChain uses convertToEntity internally
      const result = await service.getByChain(ChainKey.POL)

      // Assert
      expect(result).toBeDefined()
      expect(result?.docId).toBe('mock-id-123')
      expect(result?.chainKey).toBe(ChainKey.POL)
      expect(result?.chain.type).toBe(ChainType.EVM)
      expect(result?.feeCollector.contract).toBe(mockConfig.feeCollector.contract)
      expect(mockModel.findOne).toHaveBeenCalledTimes(1)
    })
  })
})
