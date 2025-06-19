/** Toggle the validation of generated FeesCollected report prior to return them to requesters */
export const VALIDATE_OUTPUT_COLLECTED_FEES_REPORTS =
  process.env.VALIDATE_OUTPUT_COLLECTED_FEES_REPORTS === 'true' || true

export const RESULT_EVENTS_PER_PAGE = process.env.RESULT_EVENTS_PER_PAGE
  ? Number(process.env.RESULT_EVENTS_PER_PAGE)
  : 50

export const RESULT_EVENTS_PER_PAGE_MAX = process.env.RESULT_EVENTS_PER_PAGE_MAX
  ? Number(process.env.RESULT_EVENTS_PER_PAGE_MAX)
  : 100
