import { Context, Env, ErrorHandler, Next } from 'hono'
import { Factory } from 'hono/factory'
import { ContentfulStatusCode } from 'hono/utils/http-status'
import { HttpStatusCode, LfcrError, logger as wLogger } from '@jabba01/lfcr-common'

const logger = wLogger.child({
  label: 'ApiErrorHandler',
})

const createErrorResponse = (err: unknown) => ({
  success: false,
  name: err instanceof Error ? err.name || 'UnknownError' : 'UnknownError',
  message: err instanceof Error ? err.message || 'Unexpected Error' : err,
})

function extractCode(err: Error) {
  if (err instanceof LfcrError) {
    return err.getHttpErrorStatus() as ContentfulStatusCode
  }
  if ('status' in err && typeof err.status === 'number') {
    return err.status as ContentfulStatusCode
  }
  return HttpStatusCode.INTERNAL_SERVER_ERROR as ContentfulStatusCode
}

export function createErrorHandler<E extends Env>(_factory: Factory<E>): ErrorHandler<E> {
  return (err, c) => {
    logger.error(
      `Internal Server Error \n${err instanceof LfcrError ? err : (err?.stack ?? err)}`
    )
    return c.json(createErrorResponse(err), extractCode(err))
  }
}

export const errorHandler = async (c: Context, next: Next) => {
  try {
    await next()
  } catch (err) {
    logger.error(
      `Internal Server Error \n${err instanceof LfcrError ? err : (err?.['stack'] ?? err)}`
    )
    c.status(extractCode(<Error>err))
    return c.json(createErrorResponse(err))
  }
}
