import { zeroAddress, isAddress, isHex, isHash, zeroHash } from 'viem'
import { z } from 'zod'

export const HexStringSchema = z.custom(isHex, {
  message: 'Not a valid Hexadecimal string',
})

export const HexStringSchemaSpec = HexStringSchema.openapi({
  type: 'string',
  example: '0x',
})

export const AddressSchema = z.custom(isAddress, {
  message: 'Not a valid address string',
})

export const AddressSchemaSpec = AddressSchema.openapi({
  type: 'string',
  example: zeroAddress,
})

export const TransactionHashSchema = z.custom(isHash, {
  message: 'Not a valid transaction hash string',
})

export const TransactionHashSchemaSpec = HexStringSchema.openapi({
  type: 'string',
  example: zeroHash,
  description: 'Transaction hash',
})

export const NumberishSchema = z.union([z.string(), z.number(), z.bigint()])

function createInt256(corce) {
  return NumberishSchema.pipe(corce(z.coerce.bigint()))
}

export const Int256 = createInt256((x) => x)

export const Int256Positive = createInt256((x) => x.min(BigInt(0)))
