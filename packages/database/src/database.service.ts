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
  port: parseInt(process.env.MONGODB_PORT || '27017'),
  database: process.env.MONGODB_DATABASE || 'fee-collection-reporting',
  username: process.env.MONGODB_USERNAME,
  password: process.env.MONGODB_PASSWORD,
  options: {
    connectTimeoutMS: 30000, // 30 seconds
    socketTimeoutMS: 60000, // 60 seconds
    serverSelectionTimeoutMS: 30000, // 30 seconds
    heartbeatFrequencyMS: 10000, // 10 seconds
    maxPoolSize: 10,
    minPoolSize: 2,
    maxIdleTimeMS: 30000,
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
        throw new DbError(`Failed to initialize database.\n${error.stack ?? error}`)
      })
      .then(() => {
        // Verify connection is ready by checking mongoose.connection.readyState
        if (mongoose.connection.readyState !== 1) {
          throw new DbError(
            `MongoDB connection for mongoose not ready after initialization. State: '${mongoose.connection.readyState}'`
          )
        }
        logger.info(`MongoDB connection ready`)
      })
  }

  /**
   * Close the database connection
   */
  static async close(): Promise<void> {
    await disconnectFromMongoDB().catch((error) => {
      throw new DbError(`Failed to close database connection.\n${error.stack ?? error}`)
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
      logger.info(
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
          throw new DbError(`Failed to connect to MongoDB: ${error}`)
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
    logger.warn('MongoDB disconnected')
  })

  db.on('reconnected', () => {
    logger.info('MongoDB reconnected')
  })

  // Setup robust connection recovery
  db.on('disconnected', async () => {
    logger.warn('MongoDB disconnected, attempting to reconnect...')
    try {
      // Mongoose will try to reconnect automatically, but we add additional logic
      if (!mongoose.connection.readyState) {
        logger.info('Manually triggering reconnection attempt...')
        await mongoose.connect(connectionString, config.options)
      }
    } catch (error) {
      logger.error(`Failed to reconnect to MongoDB: ${error}`)
    }
  })

  // Handle application termination
  process.on('SIGINT', async () => {
    await db.close()
    logger.info('MongoDB connection closed due to application termination')
    process.exit(0)
  })

  return db
}

/**
 * Disconnect from MongoDB
 */
export async function disconnectFromMongoDB(): Promise<void> {
  await mongoose.disconnect().catch((error) => {
    throw new DbError(`Error disconnecting from MongoDB: ${error.stack ?? error}`)
  })
  logger.info('MongoDB disconnected successfully')
}

/**
 * Checks if MongoDB connection is healthy by running a simple ping command
 * @param config MongoDB connection configuration
 * @returns Promise that resolves to true if MongoDB is healthy, false otherwise
 */
export async function isMongoDBHealthy(
  config: MongoDBConfig = DEFAULT_MONGODB_CONFIG
): Promise<boolean> {
  try {
    if (mongoose.connection.readyState === 1) {
      // Already connected
      await mongoose.connection.db.command({ ping: 1 })
      return true
    }

    // Not connected, try to connect temporarily to check health
    const connectionString = buildMongoDBConnectionString(config)
    const client = mongoose.createConnection(connectionString, {
      ...config.options,
      serverSelectionTimeoutMS: 5000, // Short timeout just for health check
    })

    try {
      const admin = client.db.admin()
      await admin.ping()
      return true
    } finally {
      await client.close(true)
    }
  } catch (error) {
    throw new DbError(`MongoDB health check failed: ${error}`)
  }
}

/**
 * Waits for MongoDB to be healthy before proceeding
 * @param config MongoDB connection configuration
 * @param maxAttempts Maximum number of attempts to check health
 * @param intervalMs Interval between attempts in milliseconds
 * @returns Promise that resolves when MongoDB is healthy, rejects if max attempts reached
 */
export async function waitForMongoDBHealth(
  config: MongoDBConfig = DEFAULT_MONGODB_CONFIG,
  maxAttempts = 10,
  intervalMs = 2000
): Promise<void> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    logger.info(`MongoDB health check attempt ${attempt}/${maxAttempts}`)

    const isHealthy = await isMongoDBHealthy(config)
    if (isHealthy) {
      logger.info('MongoDB is healthy')
      return
    }

    if (attempt < maxAttempts) {
      logger.warn(`MongoDB not healthy, retrying in ${intervalMs / 1000} seconds...`)
      await new Promise((resolve) => setTimeout(resolve, intervalMs))
    }
  }

  throw new DbError(`MongoDB not healthy after ${maxAttempts} attempts`)
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
