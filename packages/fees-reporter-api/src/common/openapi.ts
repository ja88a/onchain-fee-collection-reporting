import { OpenApiSpecsOptions } from 'hono-openapi'
import { resolver } from 'hono-openapi/zod'
import { z } from './zod'
import type { IApiConfig } from './app'
import { apiEnvs } from './api'

const ZodErrorSchema = z
  .object({
    status: z.literal(400),
    message: z.string(),
  })
  .openapi({
    ref: 'ZodError',
    description: 'Validation error',
  })

const ZodResponse = {
  description: 'Zod Validation Error',
  content: {
    'application/json': {
      schema: resolver(ZodErrorSchema),
    },
  },
} as const

export function getOpenApiSpec(config: IApiConfig): OpenApiSpecsOptions {
  return {
    documentation: {
      info: {
        title: config.title,
        version: '0.1.0',
        description: config.description,
      },
      servers: Object.values(apiEnvs)
        .filter((x) => !x.isDev)
        .map((x) => ({
          url: x.baseUrl,
          description: x.name,
        })),
    },
    defaultOptions: {
      GET: { responses: { 400: ZodResponse } },
      POST: { responses: { 400: ZodResponse } },
    },
  }
}
