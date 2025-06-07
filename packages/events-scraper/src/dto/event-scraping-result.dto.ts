/**
 * Result of an events scraping session.
 */
export type ResultEventScrapingSession = {
  /** Number of scanned blocks */
  blocksScanned: number

  /** Number of new onchain events collected */
  eventsNew: number

  /** User friendly sumup message */
  message: string
}
