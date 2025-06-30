import { resolver } from 'hono-openapi/zod'
import z from 'zod'
import {
  EventScrapingSessionInitResult,
  ScrapingSessionInitStatus,
} from './events-scraping.data'
import { ChainKey } from '@lifi/types'

export const ScrapingSessionResultSchemaSpec = resolver(
  z
    .object({
      blocksScanned: z.number().openapi({
        description: 'Number of blocks scanned',
      }),
      eventsNew: z.number().openapi({
        description: 'Number of new onchain events collected',
      }),
      message: z.string().openapi({
        description: 'Textual sum-up of the scraping session',
      }),
    })
    .openapi({
      description: 'Result of an events scraping session',
    })
)

export const EventScrapingSessionInitResultSchemaSpec = resolver(
  z
    .object({
      status: z.nativeEnum(ScrapingSessionInitStatus).openapi({
        description: 'Status of the scraping session initiation',
      }),
      chainKey: z.nativeEnum(ChainKey).openapi({
        description: 'The chain key for which the scraping session was initiated',
      }),
      message: z.string().openapi({
        description:
          'Free text message providing information about the scraping session initiation',
      }),
    })
    .openapi({
      description: 'Result of an events scraping session initiation',
    })
)
