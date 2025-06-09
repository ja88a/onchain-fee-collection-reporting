import { Context, Env, ErrorHandler, Next } from 'hono'
import { Factory } from 'hono/factory'
import { ContentfulStatusCode } from 'hono/utils/http-status'
import { logger as wLogger } from '@jabba01/lfcr-common'

const logger = wLogger.child({
  label: 'ErrorHandler',
})

const createErrorResponse = (err: unknown) => ({
  success: false,
  name: err instanceof Error ? err.name || 'UnknownError' : 'UnknownError',
  message: err instanceof Error ? err.message || 'Unexpected Error' : err,
})

function extractCode(err: Error) {
  if ('code' in err && typeof err.code === 'number') {
    return err.code as ContentfulStatusCode
  }
  return 500
}

export function createErrorHandler<E extends Env>(_factory: Factory<E>): ErrorHandler<E> {
  return (err, c) => {
    logger.error(`Internal Server Error \n${err?.stack ?? err}`)
    return c.json(createErrorResponse(err), extractCode(err))
  }
}

export const errorHandler = async (c: Context, next: Next) => {
  try {
    await next()
  } catch (err) {
    logger.error(`Internal Server Error \n${err?.['stack'] ?? err}`)
    c.status(extractCode(<Error>err))
    c.json(createErrorResponse(err))
  }
}
