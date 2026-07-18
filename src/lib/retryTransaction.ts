/**
 * Retry a function that can fail due to a serialization conflict (Postgres SQLSTATE
 * 40001) or a unique-constraint violation (Prisma P2002). These arise when two
 * concurrent requests both try to reserve the same sequential number (invoice/contract).
 *
 * Retrying gives the losing request a fresh read of the max number so it can pick the
 * next one, instead of surfacing a spurious 500 to the user.
 */
export async function withSequenceRetry<T>(
  fn: () => Promise<T>,
  maxAttempts = 5
): Promise<T> {
  let lastError: unknown
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error
      const code = (error as { code?: string })?.code
      const message = error instanceof Error ? error.message : ''
      const isConflict =
        code === 'P2002' || // unique constraint (duplicate number)
        code === '40001' || // serialization failure
        /could not serialize|deadlock detected|Unique constraint/i.test(message)
      if (!isConflict) throw error
      // brief, deterministic backoff (no Math.random available in this runtime)
      await new Promise((resolve) => setTimeout(resolve, 25 * (attempt + 1)))
    }
  }
  throw lastError
}
