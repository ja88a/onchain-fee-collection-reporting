export type ITag<T extends string = string> = {
  tag: T
}

export function createTag<T extends string>(tag: T) {
  return {
    tag: tag,
  }
}
