import { LoggerOptions, createLogger, format, transports } from 'winston'
import { IS_NODE_PROD } from '../config/service.config'

/** Supported log levels */
const enum ELogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
  default = INFO,
}

/** Set of constants specific to the logger's configuration */
const TIMESTAMP_PATTERN = 'YYYY-MM-DD HH:mm:ss.SSS'

/** Minimum level of log entries to be output */
const logsMinLevel = process.env.LOG_LEVEL || ELogLevel.default

/**
 * Default configuration for the logger in Production mode
 */
const winstonConfigProd: LoggerOptions = {
  level: logsMinLevel,
  exitOnError: true, // Default is `true` for not interfering
  format: format.combine(
    format.timestamp({
      format: TIMESTAMP_PATTERN,
    }),
    format.splat(),
    format.errors({ stack: true }),
    format.json()
  ),
  defaultMeta: { service: 'lifi-fc-report' },
  transports: [
    // Console JSON output
    new transports.Console({
      handleExceptions: true,
      handleRejections: true,
    }),
  ],
}

/**
 * WinstonJS Logger integration in development mode
 *
 * Refer to [winstonjs/winston](https://github.com/winstonjs/winston)
 */
const winstonConfigDev: LoggerOptions = {
  level: logsMinLevel,
  exitOnError: true, // Default is `true` for not interfering
  format: format.combine(
    format.timestamp({
      format: TIMESTAMP_PATTERN,
    }),
    format.errors({ stack: true }),
    format.json()
  ),
  transports: [
    // Console output
    new transports.Console({
      format: format.combine(
        format.colorize(),
        format.printf(({ timestamp, level, message, label, ...rest }) => {
          return `${timestamp} ${level} [${label || 'lfcr-app'}]: ${message} ${
            Object.keys(rest).length ? JSON.stringify(rest) : ''
          }`
        })
      ),
      handleExceptions: true,
      handleRejections: true,
    }),
  ],
}

/**
 * Winston Logger instance, to be used as the default logger.
 *
 * If running in a container / an ECS or K8s environment, the `NODE_ENV` env variable
 * must be set to `production` to output logs in a one line JSON format.
 */
export const logger = createLogger(IS_NODE_PROD ? winstonConfigProd : winstonConfigDev)
