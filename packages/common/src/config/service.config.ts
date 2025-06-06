/**
 * Common set of settings relating to the Microservice configuration
 */
export const MS_CONFIG = {
  /**
   * The URI prefix behind which all HTTP API are exposed
   */
  URI_DOMAIN_API: process.env.MS_URI_DOMAIN_API || 'api',

  /**
   * Actual URI version number(s) this microservice's controller supports
   * It can consists in an array, e.g. `['1', '2']` or be `VERSION_NEUTRAL`.
   */
  VERSION_PUBLIC: '1',

  /**
   * The public port number this Nodejs app exposes, where the controller API is accessible from
   */
  PORT_EXPOSED: process.env.API_PORT || 3000,

  /**
   * Publish or not (`false`) the OpenAPI REST API specifications
   */
  OPENAPI_PUBLISH: process.env.OPENAPI_PUBLISH === 'true',
}

/**
 * Supported run modes
 */
export enum EConfigRunMode {
  PROD = 'production',
  DEV = 'dev',
  default = PROD,
}

/** NodeJS running execution mode.
 * @example 'production' */
export const NODE_ENV = process.env.NODE_ENV || EConfigRunMode.default

/** Toggle indicating is the Nodejs runtime environment is a production one.
 * @example true */
export const IS_NODE_PROD = NODE_ENV === EConfigRunMode.PROD

/**
 * The list of app specific process exit signals, used when shutting down the app
 */
export enum EProcessExitSignal {
  DONE = 'DONE',
  INIT_FAIL = 'INIT_FAIL',
  LEFTOVER = 'LEFTOVER',
  SIGRPC = 'SIGRPC',
}

/**
 * Max duration expressed in milliseconds to wait for shutting down the app
 */
export const EXIT_MAX_WAIT_MS: number = 10_000
