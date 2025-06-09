import { Env } from 'hono'
import { Factory } from 'hono/factory'
import { createApiConfig, createTag } from '../common'
import { getFeesCollectedByIntegrator } from './get-feecollected-report-integrator'

const tag = createTag('Reporting')
export const feeCollectedReportingApi = {
  name: 'Fee Collection Reporting API',
  createApp: <E extends Env>(factory: Factory<E>) =>
    factory
      .createApp()
      .get('/integrators/:integratorId', ...getFeesCollectedByIntegrator(factory, tag)),
  config: createApiConfig({
    title: 'Collected Fees Reporting API',
    description:
      'Reporting of fees collected by the onchain LI.FI FeeCollector contracts, per chain and integrator(s).',
  }),
}
