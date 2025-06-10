import { Env } from 'hono'
import { Factory } from 'hono/factory'
import { createApiConfig, createTag } from '../common'
import { getFeesCollectedByIntegrator } from './get-report-integrator'
import { postScrapFeesCollectedOnChain } from './post-scrap-feecollected-on-chain'
import { getFeesCollectedEventsByIntegrator } from './get-events-integrator'

const tag = createTag('Reporting')
export const feeCollectedReportingApi = {
  name: 'Fee Collection Reporting API',
  createApp: <E extends Env>(factory: Factory<E>) =>
    factory
      .createApp()
      .get('/report/:integrator', ...getFeesCollectedByIntegrator(factory, tag))
      .get('/events/:integrator', ...getFeesCollectedEventsByIntegrator(factory, tag))
      .post('/scrap/:chain', ...postScrapFeesCollectedOnChain(factory, tag)),
  config: createApiConfig({
    title: 'Collected Fees Reporting API',
    description:
      'Reporting of fees collected by onchain LI.FI FeeCollector contracts, per chain and integrators.',
  }),
}
