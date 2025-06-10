/** Toggle the validation of generated FeesCollected report prior to return them to requesters */
export const VALIDATE_OUTPUT_COLLECTED_FEES_REPORTS =
  process.env.VALIDATE_OUTPUT_COLLECTED_FEES_REPORTS === 'true' || true
