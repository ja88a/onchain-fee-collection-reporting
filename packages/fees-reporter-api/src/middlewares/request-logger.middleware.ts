import { Context, Next } from 'hono'
import { logger as wLogger } from '@jabba01/lfcr-common/dist/logger'
import { ContentfulStatusCode } from 'hono/utils/http-status'

const logger = wLogger.child({
  label: 'ApiRequest',
})

export const requestLogger = async (c: Context, next: Next) => {
  await next()
  const logMsg = `${c.req.method} ${c.req.url} - Response status: '${c.res.status}'`
  if ([200, 201].includes(<ContentfulStatusCode>c.res.status)) logger.info(logMsg)
  else logger.warn(logMsg)
}
