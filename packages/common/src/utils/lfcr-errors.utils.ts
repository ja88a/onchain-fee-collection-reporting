export type ErrorOptionsStatus = ErrorOptions & {
  status?: number
}

export class LfcrError extends Error {
  public readonly status: number

  constructor(message: string, options?: ErrorOptionsStatus) {
    super(message, options)
    this.name = 'LfcrError'
    this.status = options?.status ?? 500
  }
}