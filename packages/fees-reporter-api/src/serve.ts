import { serve } from '@hono/node-server'
import { logger, MS_CONFIG } from '@jabba01/lfcr-common'
import { openAPISpecs } from 'hono-openapi'
import { showRoutes } from 'hono/dev'
import { createFactory } from 'hono/factory'
import { appConfig, getApp } from './app'
import { getOpenApiSpec } from './common/openapi'

const baseApp = getApp(createFactory())

const app = baseApp
  .get('/openapi', openAPISpecs(baseApp, getOpenApiSpec(appConfig)))
  .get('/health', (c) => c.json({ status: 'ok' }))

serve(
  {
    fetch: app.fetch,
    port: MS_CONFIG.API_PORT || 3000,
  },
  (addressInfo) => {
    logger.info(`Server started on port: http://localhost:${addressInfo.port}`)
    showRoutes(app)
  }
)
