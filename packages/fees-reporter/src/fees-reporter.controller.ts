import { logger as wLogger } from '@jabba01/lfcr-common/dist/logger'
import { VALIDATE_OUTPUT_COLLECTED_FEES_REPORTS } from './config/service.config'
import {
  IntegratorFeesCollectedReport,
  createIntegratorFeesCollectedReport,
} from './data'
import { FeeCollectedReportService } from './fees-reporter.service'
import { FeeCollectionReportError, FeeCollectionReportInputError } from './utils'
import { validateAccountId, validateReport } from './utils/fee-collected-validation'

const logger = wLogger.child({
  label: 'FeeCollectedReportController',
})

/**
 * Reports all the fees collected by the specified integrator, along with the LiFi protocol share.
 *
 * The total amount of collected fees is grouped by tokens and corresponding chain where the FeeCollector contract(s) is deployed.
 *
 * @param integratorId Onchain account address of the integrator.
 * @returns A list of collected fee events associated to the integrator.
 */
export const reportFeesCollectedByIntegrator = async (
  integratorId: string
): Promise<IntegratorFeesCollectedReport> => {
  logger.info(`FeesCollected report requested for integrator '${integratorId}'`)

  // Validate the input parameters
  const validationErrors = validateAccountId(integratorId)
  if (validationErrors.length > 0) {
    throw new FeeCollectionReportInputError(
      `Unsupported integrator ID '${integratorId}' requested \n${JSON.stringify(validationErrors)}`
    )
  }

  // Generate the report
  const feesReporterService = new FeeCollectedReportService()
  const report = await feesReporterService
    .reportFeesCollectedByIntegrator(integratorId)
    .catch((error) => {
      logger.error(
        `Failed to generate a collected fee report for integrator '${integratorId}'. \n${error.stack ?? error}`
      )
      throw new FeeCollectionReportError(
        `Failed to generate a collected fee report for integrator '${integratorId}'.`,
        500,
        { cause: error }
      )
    })

  if (VALIDATE_OUTPUT_COLLECTED_FEES_REPORTS) {
    // Validate the report output
    const reportInst = createIntegratorFeesCollectedReport(report)
    await validateReport(reportInst).then((validationErrors) => {
      if (validationErrors.length > 0) {
        logger.error(
          `Failed to generate a valid collected fees report for integrator '${integratorId}'. \nValidation Errors: ${JSON.stringify(validationErrors)}`
        )
        throw new FeeCollectionReportError(
          `Report Validation Error: Failed to generate a valid report on collected fees for integrator '${integratorId}'`
        )
      }
      return report
    })
  }

  return report
}
