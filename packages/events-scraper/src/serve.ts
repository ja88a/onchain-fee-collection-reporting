import { Hono } from 'hono'
import { handle } from 'hono/aws-lambda'
import { createErrorHandler } from './error'

const app = new Hono()

app
  .get('/chains/:chainKey', (c) => {
    const id = c.req.param('chainKey')
    return c.json(`Chain ID: ${id}`)
  })
  .get('/health', (c) => c.json({ status: 'ok' }))
  .onError(createErrorHandler())

app.use(async (c, next) => {
  const start = Date.now()
  await next()
  const end = Date.now()
  c.res.headers.set('X-Response-Time', `${end - start}`)
})

export const handler = handle(app)
