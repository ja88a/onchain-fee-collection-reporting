/**
 * Common set of settings relating to the Microservice configuration
 */
export const MS_CONFIG = {
  /**
   * Actual URI version number(s) this microservice's controller supports
   * It can consists in an array, e.g. `['1', '2']` or be `VERSION_NEUTRAL`.
   */
  VERSION_PUBLIC: '1',

  /**
   * The public port number the Nodejs app exposes, where the controller API is accessible from
   */
  API_PORT: parseInt(process.env.API_PORT) || 3000,
}

/**
 * Supported run modes
 */
export enum EConfigRunMode {
  PROD = 'production',
  DEV = 'dev',
}

/** NodeJS running execution mode.
 * @example 'production' */
export const NODE_ENV = process.env.NODE_ENV || EConfigRunMode.PROD

/** Toggle indicating is the Nodejs runtime environment is a production one.
 * @example true */
export const IS_NODE_PROD = NODE_ENV === EConfigRunMode.PROD
