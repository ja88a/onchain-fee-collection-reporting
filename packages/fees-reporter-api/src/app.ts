import { Env } from 'hono'
import { Factory } from 'hono/factory'
import { createApiConfig } from './common'
import { feeCollectedReportingApi } from './fee-collection'
import { createErrorHandler, httpHeaders, requestLogger } from './middlewares'

export function getApp<E extends Env>(factory: Factory<E>) {
  return factory
    .createApp()
    .onError(createErrorHandler(factory))
    .use(requestLogger)
    .use(httpHeaders)
    .route('/fee-collection', feeCollectedReportingApi.createApp(factory))
}

export const appConfig = createApiConfig({
  title: 'LI.FI Fee Collection Reporting API',
  description:
    'API for reporting on-chain fee collection events.\n\n' +
    'This API provides endpoints to retrieve fee collection events, reports by integrator, and initiate scraping sessions for fee collection events on various chains.',
})

export type IApp<E extends Env = Env> = ReturnType<typeof getApp<E>>
