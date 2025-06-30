/**
 * Enable BigInt serialization to JSON
 * Integrate this patch using: `require('@jabba01/lfcr-common/dist/utils/bigint.patch')`
 */
interface BigInt {
  toJSON(): string
}

BigInt.prototype.toJSON = function (): string {
  return this.toString()
}
