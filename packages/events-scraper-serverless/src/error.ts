import { Env, ErrorHandler } from 'hono'
import { ContentfulStatusCode } from 'hono/utils/http-status'
import { logger } from '@jabba01/lfcr-common/dist/logger'

export function createErrorHandler<E extends Env>(): ErrorHandler<E> {
  return (err, c) => {
    logger.error(`Error occurred: ${err}`)
    return c.json(
      {
        success: false,
        message: err.message || 'Unexpected Error',
        name: err.name || 'UnknownError',
      },
      extractCode(err)
    )
  }
}

function extractCode(err: Error) {
  if ('code' in err && typeof err.code === 'number') {
    return err.code as ContentfulStatusCode
  }
  return 500
}
