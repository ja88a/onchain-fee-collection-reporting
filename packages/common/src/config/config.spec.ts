import { EConfigRunMode, MS_CONFIG } from './service.config'

describe('App Config', () => {
  it('Service API Version', () => {
    expect(MS_CONFIG.VERSION_PUBLIC).toBeDefined()

    if (process.env.NODE_ENV == EConfigRunMode.PROD) {
      expect(MS_CONFIG.VERSION_PUBLIC).toBe('1')
    }
  })
})
