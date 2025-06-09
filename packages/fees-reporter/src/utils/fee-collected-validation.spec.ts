import {
  IntegratorFeesCollectedReport,
  createIntegratorFeesCollectedReport,
} from '../data'
import { validateReport } from './fee-collected-validation'

describe('validateReport', () => {
  beforeEach(async () => {})

  it('should return an empty array if the given report is valid', async () => {
    const report: IntegratorFeesCollectedReport = {
      integrator: '0x1234567890123456789012345678901234567890',
      integratorFeesCollected: [
        {
          chainKey: 'pol',
          token: '0x0000000000000000000000000000000000000000',
          amount: '1000000000000000000',
        },
      ],
      lifiFeesCollected: [
        {
          chainKey: 'pol',
          token: '0x0000000000000000000000000000000000000000',
          amount: '10000000000000000',
        },
      ],
    }

    const validationErr = await validateReport(
      createIntegratorFeesCollectedReport(report)
    )

    expect(validationErr).toEqual([])
  })

  it('should return an error if the given report is invalid', async () => {
    const report = Object.assign(new IntegratorFeesCollectedReport(), {
      integrator: '0x1234567890123456789012345678901234567890ZZ',
      integratorFeesCollected: [
        {
          chainKey: 'pol',
          token: '0x0000000000000000000000000000000000000000',
          amount: '1000000000000000000',
        },
        {
          chainKey: 'pol',
          token: '0x1234567890123456789012345678901234567890',
          amount: '1000000000000000000',
        },
      ],
      lifiFeesCollected: [
        {
          chainKey: 'pol',
          token: '0x0000000000000000000000000000000000000000',
          amount: '100000000000000',
        },
        {
          chainKey: 'pol',
          token: '0x1234567890123456789012345678901234567890',
          amount: '100000000000000',
        },
      ],
    })

    const validationErrs = await validateReport(
      createIntegratorFeesCollectedReport(report)
    )

    if (validationErrs == null) {
      expect(validationErrs != null).toBeTruthy()
      return
    }

    expect(validationErrs.length > 0).toBeTruthy()
    expect(validationErrs[0].property).toEqual('integrator')
    expect(validationErrs[0].value).toEqual(
      '0x1234567890123456789012345678901234567890ZZ'
    )
    const validConstraints = validationErrs[0].constraints
    expect(validConstraints != null)
    expect(validConstraints).toEqual({
      isEthereumAddress: 'integrator must be an Ethereum address',
      isHexadecimal: 'integrator must be a hexadecimal number',
    })
  })
})
