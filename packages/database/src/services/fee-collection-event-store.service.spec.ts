import { FeeCollectedEvent } from '@jabba01/lfcr-common/dist/data'
import { ChainKey } from '@lifi/types'
import { BigNumber } from 'ethers/lib/ethers'
import { FeeCollectedEventStore } from './fee-collection-event-store.service'
import { describe, it, expect, beforeEach, vi } from 'vitest'

// Mock Mongoose
vi.mock('mongoose', () => {
  return {
    connection: {
      readyState: 1,
    },
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
    skip: vi.fn(() => queryMock),
    limit: vi.fn(() => queryMock),
    sort: vi.fn(() => returnValue),
  }
  return queryMock
}

// Mock the models
vi.mock('../models', () => {
  const modelMock = {
    create: vi.fn(),
    insertMany: vi.fn(),
    find: vi.fn(),
  }

  return {
    getFeeCollectionEventModel: () => modelMock,
  }
})

// Import mocked modules after mocking
import { getFeeCollectionEventModel } from '../models'
import { parseUnits } from 'viem'

describe('FeeCollectedEventStore', () => {
  let service: FeeCollectedEventStore
  let mockEvent: FeeCollectedEvent
  let mockEvents: FeeCollectedEvent[]
  let mockModel: any

  // Setup before each test
  beforeEach(() => {
    // Reset all mocks
    vi.resetAllMocks()

    // Get reference to mockModel
    mockModel = getFeeCollectionEventModel()

    // Initialize service
    service = new FeeCollectedEventStore()

    // Create mock events for testing
    mockEvent = {
      chainKey: ChainKey.POL,
      txHash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
      blockTag: '40000000',
      token: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      integrator: '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
      integratorFee: parseUnits('1000000000000000000', 0), // 1 ETH
      lifiFee: parseUnits('100000000000000000', 0), // 0.1 ETH
    }

    // Create multiple mock events with different txHashes
    mockEvents = [
      { ...mockEvent },
      {
        ...mockEvent,
        txHash: '0x2234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
        blockTag: '40000100',
      },
      {
        ...mockEvent,
        txHash: '0x3234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
        blockTag: '40000200',
      },
    ]
  })

  describe('createFeeCollectedEvent', () => {
    it('should create a new fee collected event successfully', async () => {
      // Arrange
      const mockDoc = {
        chainKey: mockEvent.chainKey,
        txHash: mockEvent.txHash,
        blockTag: mockEvent.blockTag,
        token: mockEvent.token,
        integrator: mockEvent.integrator,
        integratorFee: mockEvent.integratorFee.toString(),
        lifiFee: mockEvent.lifiFee.toString(),
      }

      mockModel.create.mockResolvedValueOnce(mockDoc)

      // Act
      const result = await service.createFeeCollectedEvent(mockEvent)

      // Assert
      expect(mockModel.create).toHaveBeenCalledTimes(1)
      expect(result).toBeDefined()
      expect(result.chainKey).toBe(mockEvent.chainKey)
      expect(result.txHash).toBe(mockEvent.txHash)
      expect(result.blockTag).toBe(mockEvent.blockTag)
      expect(result.token).toBe(mockEvent.token)
      expect(result.integrator).toBe(mockEvent.integrator)
      expect(result.integratorFee).toBe(mockEvent.integratorFee.toString())
      expect(result.lifiFee).toBe(mockEvent.lifiFee.toString())
    })

    it('should throw error if creation fails', async () => {
      // Arrange
      mockModel.create.mockRejectedValueOnce(new Error('Database error'))

      // Act & Assert
      await expect(service.createFeeCollectedEvent(mockEvent)).rejects.toThrow()
    })
  })

  describe('storeFeeCollectedEvents', () => {
    it('should store multiple fee collected events successfully', async () => {
      // Arrange
      const mockDocs = [
        {
          chainKey: mockEvents[0].chainKey,
          txHash: mockEvents[0].txHash,
          blockTag: mockEvents[0].blockTag,
          token: mockEvents[0].token,
          integrator: mockEvents[0].integrator,
          integratorFee: mockEvents[0].integratorFee.toString(),
          lifiFee: mockEvents[0].lifiFee.toString(),
        },
        {
          chainKey: mockEvents[1].chainKey,
          txHash: mockEvents[1].txHash,
          blockTag: mockEvents[1].blockTag,
          token: mockEvents[1].token,
          integrator: mockEvents[1].integrator,
          integratorFee: mockEvents[1].integratorFee.toString(),
          lifiFee: mockEvents[1].lifiFee.toString(),
        },
        {
          chainKey: mockEvents[2].chainKey,
          txHash: mockEvents[2].txHash,
          blockTag: mockEvents[2].blockTag,
          token: mockEvents[2].token,
          integrator: mockEvents[2].integrator,
          integratorFee: mockEvents[2].integratorFee.toString(),
          lifiFee: mockEvents[2].lifiFee.toString(),
        },
      ]

      mockModel.insertMany.mockResolvedValueOnce(mockDocs)

      // Act
      const result = await service.storeFeeCollectedEvents(mockEvents)

      // Assert
      expect(mockModel.insertMany).toHaveBeenCalledTimes(1)
      expect(mockModel.insertMany).toHaveBeenCalledWith(expect.any(Array), {
        ordered: false,
      })
      expect(result).toBeDefined()
      expect(Array.isArray(result)).toBe(true)
      expect(result).toHaveLength(3)

      // Check first event
      expect(result?.[0].chainKey).toBe(mockEvents[0].chainKey)
      expect(result?.[0].txHash).toBe(mockEvents[0].txHash)
    })

    it('should handle duplicate events gracefully', async () => {
      // Arrange
      mockModel.insertMany.mockRejectedValueOnce(new Error('Duplicate key error'))

      // Act
      const result = await service.storeFeeCollectedEvents(mockEvents)

      // Assert - Should handle duplicates without error
      expect(result).toBeUndefined() // The catch block returns undefined
    })
  })

  describe('retrieveFeeCollectedEventsByIntegrator', () => {
    it('should retrieve all events for an integrator without pagination', async () => {
      // Arrange
      const mockEntities = mockEvents.map((event) => ({
        id: 'mock-id-' + event.txHash.substring(0, 6),
        chainKey: event.chainKey,
        txHash: event.txHash,
        blockTag: event.blockTag,
        token: event.token,
        integrator: event.integrator,
        integratorFee: event.integratorFee.toString(),
        lifiFee: event.lifiFee.toString(),
      }))

      // Setup the chainable mock for the case without pagination
      mockModel.find.mockReturnValueOnce(createQueryMock(mockEntities))

      // Act
      const result = await service.retrieveFeeCollectedEventsByIntegrator(
        mockEvent.integrator
      )

      // Assert
      expect(mockModel.find).toHaveBeenCalledTimes(1)
      expect(mockModel.find).toHaveBeenCalledWith({ integrator: mockEvent.integrator })
      expect(result).toBeDefined()
      expect(Array.isArray(result)).toBe(true)
      expect(result.length).toBe(3)

      // Check that all properties are converted correctly
      expect(result[0].chainKey).toBe(mockEvents[0].chainKey)
      expect(result[0].txHash).toBe(mockEvents[0].txHash)
      expect(result[0].integratorFee.toString()).toBe(
        mockEvents[0].integratorFee.toString()
      )
    })

    it('should retrieve events with pagination', async () => {
      // Arrange
      const mockEntities = mockEvents.slice(0, 2).map((event) => ({
        id: 'mock-id-' + event.txHash.substring(0, 6),
        chainKey: event.chainKey,
        txHash: event.txHash,
        blockTag: event.blockTag,
        token: event.token,
        integrator: event.integrator,
        integratorFee: event.integratorFee.toString(),
        lifiFee: event.lifiFee.toString(),
      }))

      // Setup the chainable mock for the case with pagination
      mockModel.find.mockReturnValueOnce(createQueryMock(mockEntities))

      // Act
      const result = await service.retrieveFeeCollectedEventsByIntegrator(
        mockEvent.integrator,
        2,
        0
      )

      // Assert
      expect(mockModel.find).toHaveBeenCalledTimes(1)
      expect(mockModel.find).toHaveBeenCalledWith({ integrator: mockEvent.integrator })
      expect(result).toBeDefined()
      expect(Array.isArray(result)).toBe(true)
      expect(result.length).toBe(2)

      // Verify that chainable methods were called with correct parameters
      const queryMock = mockModel.find.mock.results[0].value
      expect(queryMock.skip).toHaveBeenCalledWith(0)
      expect(queryMock.limit).toHaveBeenCalledWith(2)
      expect(queryMock.sort).toHaveBeenCalledWith({ blockTag: 'desc' })
    })

    it('should retrieve events with offset', async () => {
      // Arrange
      const mockEntities = mockEvents.slice(1, 3).map((event) => ({
        id: 'mock-id-' + event.txHash.substring(0, 6),
        chainKey: event.chainKey,
        txHash: event.txHash,
        blockTag: event.blockTag,
        token: event.token,
        integrator: event.integrator,
        integratorFee: event.integratorFee.toString(),
        lifiFee: event.lifiFee.toString(),
      }))

      // Setup the chainable mock for the case with pagination and offset
      mockModel.find.mockReturnValueOnce(createQueryMock(mockEntities))

      // Act
      const result = await service.retrieveFeeCollectedEventsByIntegrator(
        mockEvent.integrator,
        2,
        1
      )

      // Assert
      expect(mockModel.find).toHaveBeenCalledTimes(1)
      expect(mockModel.find).toHaveBeenCalledWith({ integrator: mockEvent.integrator })
      expect(result).toBeDefined()
      expect(Array.isArray(result)).toBe(true)
      expect(result.length).toBe(2)

      // Verify that chainable methods were called with correct parameters
      const queryMock = mockModel.find.mock.results[0].value
      expect(queryMock.skip).toHaveBeenCalledWith(1)
      expect(queryMock.limit).toHaveBeenCalledWith(2)
      expect(queryMock.sort).toHaveBeenCalledWith({ blockTag: 'desc' })
    })

    it('should return empty array for non-existent integrator', async () => {
      // Arrange
      mockModel.find.mockReturnValueOnce(createQueryMock([]))

      // Act
      const result = await service.retrieveFeeCollectedEventsByIntegrator(
        '0xcccccccccccccccccccccccccccccccccccccccc'
      )

      // Assert
      expect(mockModel.find).toHaveBeenCalledTimes(1)
      expect(mockModel.find).toHaveBeenCalledWith({
        integrator: '0xcccccccccccccccccccccccccccccccccccccccc',
      })
      expect(result).toBeDefined()
      expect(Array.isArray(result)).toBe(true)
      expect(result.length).toBe(0)
    })

    it('should handle database errors gracefully', async () => {
      // Arrange
      mockModel.find.mockImplementationOnce(() => {
        throw new Error('Database error')
      })

      // Act & Assert
      await expect(
        service.retrieveFeeCollectedEventsByIntegrator(mockEvent.integrator)
      ).rejects.toThrow('Database error')
      expect(mockModel.find).toHaveBeenCalledTimes(1)
    })
  })

  describe('convertToDoc and convertToEntity', () => {
    it('should correctly convert entity to document and back', async () => {
      // Arrange
      const mockDoc = {
        id: 'mock-id-123',
        chainKey: mockEvent.chainKey,
        txHash: mockEvent.txHash,
        blockTag: mockEvent.blockTag,
        token: mockEvent.token,
        integrator: mockEvent.integrator,
        integratorFee: mockEvent.integratorFee.toString(),
        lifiFee: mockEvent.lifiFee.toString(),
      }

      // Mock for creating the event
      mockModel.create.mockResolvedValueOnce(mockDoc)

      // Mock for retrieving the event
      mockModel.find.mockReturnValueOnce(createQueryMock([mockDoc]))

      // Act - createFeeCollectedEvent uses convertToDoc internally
      const createdDoc = await service.createFeeCollectedEvent(mockEvent)

      // Act - retrieveFeeCollectedEventsByIntegrator uses convertToEntity internally
      const events = await service.retrieveFeeCollectedEventsByIntegrator(
        mockEvent.integrator
      )
      const retrievedEntity = events[0]

      // Assert document conversion
      expect(createdDoc.integratorFee).toBe(mockEvent.integratorFee.toString())
      expect(createdDoc.lifiFee).toBe(mockEvent.lifiFee.toString())

      // Assert entity conversion
      expect(retrievedEntity.integratorFee.toString()).toBe(
        mockEvent.integratorFee.toString()
      )
      expect(retrievedEntity.lifiFee.toString()).toBe(mockEvent.lifiFee.toString())
      expect(retrievedEntity.docId).toBeDefined()

      // Verify mock calls
      expect(mockModel.create).toHaveBeenCalledTimes(1)
      expect(mockModel.find).toHaveBeenCalledTimes(1)
    })
  })
})
