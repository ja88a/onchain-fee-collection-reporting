export type IApiConfig = {
  title: string
  description: string
}

export function createApiConfig(config: IApiConfig) {
  return { ...config }
}
