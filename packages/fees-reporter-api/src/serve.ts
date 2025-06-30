import { serve } from '@hono/node-server'
import { LfcrError, logger, MS_CONFIG } from '@jabba01/lfcr-common'
import { DatabaseConnector } from '@jabba01/lfcr-database'
import { openAPISpecs } from 'hono-openapi'
import { showRoutes } from 'hono/dev'
import { createFactory } from 'hono/factory'
import { appConfig, getApp } from './app'
import { getOpenApiSpec } from './common/openapi'

const baseApp = getApp(createFactory())

const app = baseApp
  .get('/openapi', openAPISpecs(baseApp, getOpenApiSpec(appConfig)))
  .get('/health', (c) => c.json({ status: 'ok' }))

DatabaseConnector.init()
  .then(() => {
    serve(
      {
        fetch: app.fetch,
        port: MS_CONFIG.API_PORT || 3000,
      },
      (addressInfo) => {
        logger.info(`Server started -> http://localhost:${addressInfo.port}`)
        showRoutes(app)
      }
    )
  })
  .catch((error) => {
    logger.error(`Server stopped: ${error instanceof LfcrError ? error : error?.stack ?? error}`)
    process.exit(1)
  })


// Catch if the Promise is rejected
process.on('unhandledRejection', (error) => {
  throw error
})
// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error(`Uncaught Exception: ${error instanceof LfcrError ? error : error?.stack ?? error}`)
  process.exit(1)
})
