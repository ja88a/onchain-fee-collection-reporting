/**
 * A wrapper around setTimeout which returns a promise. Useful for waiting for an amount of
 * time from an async function. e.g. await waitFor(1000);
 *
 * @param milliseconds The amount of time to wait.
 * @returns A promise that resolves once the given number of milliseconds has ellapsed.
 */
export function waitFor(milliseconds: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds)
  })
}

/**
 * Used by doWithLock() to keep track of each "stack" of locks for a given lock name.
 */
const locksByName: Record<string, Promise<any>[]> = {}

/**
 * Used to ensure that only a single task for the given lock name can be executed at once.
 *
 * @param lockName The name of the lock to be obtained.
 * @param task The task to execute.
 * @returns The value returned by the task.
 */
export async function doWithLock<T>(
  lockName: string,
  task: () => Promise<T>,
): Promise<T> {
  if (!locksByName[lockName]) {
    locksByName[lockName] = []
  }

  const locks = locksByName[lockName]
  const isFirst = locks.length === 0
  let unlock = () => {}

  const newLock = new Promise<void>((resolve) => {
    unlock = resolve
  })

  locks.push(newLock)

  if (!isFirst) {
    const predecessorLock = locks[locks.length - 2]
    await predecessorLock
  }

  try {
    return await task()
  } catch (error) {
    throw new Error(`Failed to execute Task '${lockName}' with Lock \n${error}`)
  } finally {
    // Remove task lock
    locks.splice(0, 1)
    // Start next waiting task.
    unlock()
  }
}
