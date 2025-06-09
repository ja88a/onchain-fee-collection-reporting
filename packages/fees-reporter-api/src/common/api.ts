export type IApiEnv = {
  name: string
  baseUrl: string
  isDev: boolean
}

export const apiEnvs = {
  test: {
    name: 'Test',
    baseUrl: 'https://lfrc-api.srenault.com',
    isDev: false,
  },
  dev: {
    name: 'Dev',
    baseUrl: 'http://localhost:3000',
    isDev: true,
  },
} as const satisfies Record<string, IApiEnv>

export type IApiEnvName = keyof typeof apiEnvs

export function getApiEnv<T extends IApiEnvName>(type: T) {
  return apiEnvs[type]
}
