import { logger as wLogger } from '@jabba01/lfcr-common/dist/logger'
import { ChainKey } from '@lifi/types'
import { ChildProcessByStdio, spawn } from 'child_process'
import os from 'os'
import path from 'path'
import Stream from 'stream'
import {
  EventScrapingSessionInitResult,
  ScrapingSessionInitStatus,
} from './events-scraping.data'
import { MSG_EVENTS_SCRAPING_FINISHED } from '@jabba01/lfcr-events-scraper/dist/main'

const logger = wLogger.child({
  label: 'EventsScrapingSpawner',
})

// Path to the main index file
const indexPath = path.resolve(
  __dirname,
  '../../node_modules/@jabba01/lfcr-events-scraper/dist/main.js' // @FIXME Path to `@jabba01/lfcr-events-scraper.Main` must be adjusted: relative to actual source file nesting level and the opted package JS bundling.
)

/** Pattern to match in the logs */
const syncedPattern = new RegExp(String.raw`\s${MSG_EVENTS_SCRAPING_FINISHED}.*\s`, "g");

// Get the number of logical CPU cores
// Use a maximum of 50% of the available CPU cores
const numCpus = os.cpus().length
const numWorkers = Math.max(1, Math.floor(numCpus * 0.5))
logger.info(
  `${numCpus} CPU cores available: max ${numWorkers} event scraping sessions can be ran in parallel`
)

const eventsScrapingProcesses = new Map<
  ChainKey,
  ChildProcessByStdio<null, Stream.Readable, Stream.Readable>
>()

/**
 * Stop one or all registered events scraping processes
 *
 * @param chainKey the chain key to which an active event scrapping process is associated. If not specified then all active / currently registered sessions will be stopped
 */
export const stopEventScrapingProcess = (chainKey?: ChainKey) => {
  if (!chainKey) {
    const chainKeys = Array.from(eventsScrapingProcesses.keys())
    if (chainKeys?.length > 0) {
      logger.warn(`Stopping all registered event scraping sessions on chains '${chainKeys}'`)
      chainKeys.forEach((key) => stopEventScrapingProcess(key))
    }
  }
  const eventsScrapingProcess = eventsScrapingProcesses?.get(chainKey)
  if (eventsScrapingProcess) {
    eventsScrapingProcess.kill()
    eventsScrapingProcess.removeAllListeners()
    eventsScrapingProcesses?.delete(chainKey)
    logger.info(`Stopped the Events Scraping session on chain '${chainKey}'`)
  }
}

/**
 * Spawn a new child process for launching an events scraping session on a given chain.
 *
 * @param chainKey The target blockchain key to be scanned for new events
 */
export const spawnEventScrapingProcess = (
  chainKey: ChainKey
): EventScrapingSessionInitResult => {
  // Validate the chain key
  if (!chainKey || !Object.values(ChainKey).includes(chainKey)) {
    const msg = `A valid target chain key must be specified to initiate corresponding events scraping session - Submitted: '${chainKey}'`
    logger.error(msg)
    return {
      status: ScrapingSessionInitStatus.ERROR_INVALID_CHAIN,
      message: msg,
      chainKey: chainKey,
    }
  }

  if (eventsScrapingProcesses.get(chainKey)) {
    const msg = `An Events Scraping session is already running on chain '${chainKey}' - Ignoring this new session request`
    logger.warn(msg)
    return {
      status: ScrapingSessionInitStatus.IN_PROGRESS,
      message: msg,
      chainKey: chainKey,
    }
  }

  // Check if the number of active scraping processes exceeds the limit
  if (eventsScrapingProcesses.size >= numWorkers) {
    const msg = `Maximum number of parallel events scraping processes (${numWorkers}) reached. Cannot spawn a new session for chain '${chainKey}'`
    logger.warn(msg)
    return {
      status: ScrapingSessionInitStatus.ERROR_MAX_NB_REACHED,
      message: msg,
      chainKey: chainKey,
    }
  }

  logger.info(`Spawning an Events Scraping session on chain '${chainKey}'`)

  // Start a new Events Scraping process
  const scrapingProcess = spawn('node', [indexPath], {
    stdio: ['inherit', 'pipe', 'pipe'],
    env: {
      ...process.env,
      EVENTS_SCRAPING_TARGET_CHAIN: chainKey,
    },
  })

  eventsScrapingProcesses.set(chainKey, scrapingProcess)

  // Listen to stdout
  scrapingProcess.stdout.on('data', (data) => {
    const output = data.toString()
    process.stdout.write(output) // Echo output to parent process

    // Check if the output contains the synced message
    if (syncedPattern.test(output)) {
      logger.info('Events Scraping session completed successfully. Exiting process...')
      // Small delay to ensure pending logs are processed
      setTimeout(() => {
        stopEventScrapingProcess(chainKey)
      }, 500)
    }
  })

  // Listen to stderr
  scrapingProcess.stderr.on('data', (data) => {
    logger.error(
      `Scraping process on chain '${chainKey}' emitted an error: \n${data.toString()}`
    ) // Echo error output
  })

  // Handle process close
  scrapingProcess.on('close', (code) => {
    if (code !== null && code !== 0) {
      logger.error(`Events Scraping Process closed with code '${code}'`)
    }
    stopEventScrapingProcess(chainKey)
  })

  // Handle process exit
  scrapingProcess.on('exit', (code) => {
    if (code !== null && code !== 0) {
      logger.error(`Events Scraping Process exited with code '${code}'`)
    }
    stopEventScrapingProcess(chainKey)
  })

  // Handle errors
  scrapingProcess.on('error', (err) => {
    logger.error(`Events Scraping session failed: ${err}`)
  })

  return {
    status: ScrapingSessionInitStatus.STARTED,
    message: `Events Scraping session started for chain '${chainKey}'`,
    chainKey: chainKey,
  }
}

// Handle SIGINT (Ctrl+C) to gracefully terminate
process.on('SIGINT', () => {
  stopEventScrapingProcess()
})

// Handle SIGTERM to gracefully terminate
process.on('SIGTERM', () => {
  stopEventScrapingProcess()
})

