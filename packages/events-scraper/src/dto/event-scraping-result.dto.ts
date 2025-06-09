/**
 * Result of an events scraping session.
 */
export type ResultEventScrapingSession = {
  /** Number of scanned blocks */
  blocksScanned: number

  /** Number of new onchain events collected */
  eventsNew: number

  /** Sum-up message */
  message: string
}
