import { logger as wLogger } from '@jabba01/lfcr-common/dist/logger'
import { DbError } from './database.utils'
import mongoose from 'mongoose'

/**
 * MongoDB connection configuration
 */
export type MongoDBConfig = {
  host: string
  port: number
  database: string
  username?: string
  password?: string
  options?: mongoose.ConnectOptions
}

/**
 * Default MongoDB configuration
 */
export const DEFAULT_MONGODB_CONFIG: MongoDBConfig = {
  host: process.env.MONGODB_HOST || 'localhost',
  port: parseInt(process.env.MONGODB_PORT) || 27017,
  database: process.env.MONGODB_DATABASE || 'fee-collection-reporting',
  username: process.env.MONGODB_USERNAME,
  password: process.env.MONGODB_PASSWORD,
  options: {
    connectTimeoutMS: 30_000,
    socketTimeoutMS: 60_000,
    serverSelectionTimeoutMS: 30_000,
    heartbeatFrequencyMS: 10_000,
    maxPoolSize: 10,
    minPoolSize: 1,
    maxIdleTimeMS: 30_000,
  },
}

const logger = wLogger.child({
  label: 'DatabaseConnector',
})

/**
 * Example MongoDB connection class
 */
export class DatabaseConnector {
  /**
   * Initialize the database connection
   * @param config MongoDB connection configuration
   */
  static async init(config?: MongoDBConfig): Promise<void> {
    await connectToMongoDB(config)
      .catch((error) => {
        throw new DbError(`Failed to initialize database connection.`, { cause: error })
      })
      .then(() => {
        // Verify connection is ready by checking mongoose.connection.readyState
        if (mongoose.connection.readyState !== 1) {
          setTimeout(() => {
            if (mongoose.connection.readyState !== 1) {
              throw new DbError(
                `MongoDB connection for mongoose not ready after initialization. State: '${mongoose.connection.readyState}'`
              )
            }
            logger.info(`MongoDB connection ready`)
          }, 500)
        }
      })
  }

  /**
   * Close the database connection
   */
  static async close(): Promise<void> {
    await disconnectFromMongoDB().catch((error) => {
      throw new DbError(`Failed to disconnect from the database.`, { cause: error })
    })
  }
}

/**
 * Connect to MongoDB using the provided configuration
 * @param config MongoDB connection configuration
 * @returns Mongoose connection instance
 */
export async function connectToMongoDB(
  config: MongoDBConfig = DEFAULT_MONGODB_CONFIG
): Promise<mongoose.Connection> {
  // Construct connection string
  const connectionString = buildMongoDBConnectionString(config)

  // Configure mongoose (optional settings)
  mongoose.set('strictQuery', true)

  // Add retry logic
  const MAX_RETRIES = 3
  let retries = MAX_RETRIES
  let connected = false
  let lastError: any

  while (retries > 0 && !connected) {
    try {
      logger.debug(
        `Connecting to MongoDB at ${config.host}:${config.port}/${config.database} (${MAX_RETRIES - retries + 1}/${MAX_RETRIES} attempts)`
      )

      // Connect to MongoDB
      await mongoose
        .connect(connectionString, {
          ...config.options,
          serverSelectionTimeoutMS: 20000, // Ensure this doesn't overlap with our retry logic
          bufferCommands: false, // Disable command buffering to fail fast
        })
        .catch((error) => {
          throw new DbError(`Failed to connect to MongoDB`, { cause: error })
        })

      connected = true

      logger.info(
        `Successfully connected to MongoDB at ${config.host}:${config.port}/${config.database}`
      )
    } catch (error) {
      lastError = error
      retries--

      if (retries > 0) {
        const delayMs = 2000 * (MAX_RETRIES - retries) // Incremental backoff
        logger.warn(
          `MongoDB connection failed. Retrying in ${delayMs / 1000} seconds... (${MAX_RETRIES - retries} retries left)`
        )
        await new Promise((resolve) => setTimeout(resolve, delayMs))
      }
    }
  }

  if (!connected) {
    throw new DbError(
      `Failed to connect to MongoDB after multiple attempts: ${lastError?.stack ?? lastError}`
    )
  }

  // Get the default connection
  const db = mongoose.connection

  // Setup connection event handlers
  db.on('error', (err) => {
    logger.error(`MongoDB connection error: ${err}`)
  })

  db.on('disconnected', () => {
    logger.info('MongoDB disconnected')
  })

  db.on('reconnected', () => {
    logger.info('MongoDB reconnected')
  })

  return db
}

/**
 * Force the closure of mongoose's MongoDB default connection
 */
export const closeDbConnection = async (): Promise<void> => {
  return await mongoose.connection
    ?.close(true)
    .catch((error) => {
      throw new DbError(`Error while closing MongoDB connection`, { cause: error })
    })
    .then(() => {
      logger.info('MongoDB default connection closed')
    })
}

/**
 * Disconnect from MongoDB
 */
export const disconnectFromMongoDB = async (): Promise<void> => {
  return await mongoose
    .disconnect()
    .catch((error) => {
      throw new DbError(`Error met while disconnecting from MongoDB`, { cause: error })
    })
    .then(() => {
      logger.warn('MongoDB disconnected successfully')
    })
}

/**
 * Builds a MongoDB connection string from configuration
 */
function buildMongoDBConnectionString(config: MongoDBConfig): string {
  let connectionString = 'mongodb://'
  if (config.username && config.password) {
    connectionString += `${encodeURIComponent(config.username)}:${encodeURIComponent(config.password)}@`
  }
  connectionString += `${config.host}:${config.port}/${config.database}`
  logger.debug(
    `MongoDB connection string '${connectionString}' from config:\n${JSON.stringify(config)}`
  )
  return connectionString
}
