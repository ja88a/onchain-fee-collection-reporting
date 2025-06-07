/**
 * Utility for managing event scraping information in the database.
 */
export class EventScrapingUtils {
  private static idPrefixEventScrapingInfo = 'evtScrap'

  private static idPrefixContractFeeCollector = 'feecollect'

  /**
   * Compute the database entry ID of an FeeCollector event scraper config.
   * @param chainKey the unique key of the target blockchain
   * @returns the computed database entry ID
   */
  static computeIdEventScrapingFeeCollector(chainKey: string): string {
    return (
      this.idPrefixEventScrapingInfo +
      '_' +
      this.idPrefixContractFeeCollector +
      '_' +
      chainKey
    )
  }
}

/**
 * Utility for managing FeeCollectedEvent documents in the database.
 */
export class FeeCollectedEventUtils {
  private static idPrefixEvent = 'event'

  private static idPrefixEventFeeCollected = 'feecollected'

  /**
   * Compute the database entry ID of an emitted contract event.
   * @param chainKey the unique key of the target blockchain
   * @returns the computed database entry ID
   */
  static computeIdEventFeeCollected(chainKey: string, txHash: string): string {
    return (
      this.idPrefixEvent +
      '_' +
      this.idPrefixEventFeeCollected +
      '_' +
      chainKey +
      '_' +
      txHash
    )
  }
}

export class DbError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'DbError'
  }
}
