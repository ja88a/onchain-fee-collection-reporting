import {
  ValidationError,
  ValidatorOptions,
  isAlphanumeric,
  isEthereumAddress,
  isHexadecimal,
  validate,
} from 'class-validator'
import { logger as wLogger } from '@jabba01/lfcr-common/dist/logger'
import { IntegratorFeesCollectedReport } from '../data'

/** Logger */
const logger = wLogger.child({
  label: 'FeesCollectedValidator',
})

/**
 * Imported Data Validation options
 */
export const VALID_OPT: ValidatorOptions = {
  skipMissingProperties: false,
  forbidUnknownValues: true,
  whitelist: true,
  forbidNonWhitelisted: true,
  dismissDefaultMessages: false,
  validationError: {
    target: true,
    value: true,
  },
  stopAtFirstError: false,
}

/**
 * Validate a account update event and provide fields & values validation errors if any
 * @param report the account update event to validate
 * @return List of validation errors, if any. Else an empty array.
 */
export async function validateReport(
  report: IntegratorFeesCollectedReport
): Promise<ValidationError[]> {
  const validationErr: ValidationError[] = await validate(report, VALID_OPT).catch(
    (error) => {
      throw new Error(
        `Failed to validate the FeesCollected report for integrator '${report.integrator}'\n${error}`
      )
    }
  )

  if (validationErr.length > 0) {
    logger.warn(
      `Validation of FeesCollected report for integrator ${report.integrator} generates ${validationErr.length} issue(s)\n${validationErr}`
    )
  }
  return validationErr
}

/**
 * Validates if the given value is a valid account ID.
 *
 * @param account The account ID to validate.
 * @returns A list of validation errors if the ID is not valid, empty if it is valid.
 */
export function validateAccountId(account: string): ValidationError[] {
  if (isAlphanumeric(account) && isHexadecimal(account) && isEthereumAddress(account)) {
    return []
  }
  return [
    {
      property: 'integratorId',
      value: account,
      constraints: {
        isAlphanumeric: 'Unsupported integrator address',
        isEthereumAddress: 'Invalid Ethereum address',
      },
    },
  ]
}
