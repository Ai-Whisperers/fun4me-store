/**
 * Timeout Protection Utility (Epic 3.2)
 * 
 * Provides timeout wrapper for external API calls to prevent indefinite hangs in cron jobs.
 * Critical for preventing system hangs when external services (Stripe, email, SMS) don't respond.
 */

export class TimeoutError extends Error {
  constructor(message: string, public readonly operationName?: string) {
    super(message)
    this.name = 'TimeoutError'
  }
}

/**
 * Wraps a promise with a timeout. If the promise doesn't resolve/reject within the timeout,
 * a TimeoutError is thrown.
 * 
 * @param promise - The promise to wrap
 * @param timeoutMs - Timeout in milliseconds
 * @param operationName - Optional name for better error messages
 * @returns The promise result or throws TimeoutError
 * 
 * @example
 * ```typescript
 * const result = await withTimeout(
 *   fetch('https://api.example.com/data'),
 *   5000,
 *   'API fetch'
 * )
 * ```
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  operationName?: string
): Promise<T> {
  let timeoutId: NodeJS.Timeout | undefined

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      const message = operationName
        ? `Operation "${operationName}" timed out after ${timeoutMs}ms`
        : `Operation timed out after ${timeoutMs}ms`
      reject(new TimeoutError(message, operationName))
    }, timeoutMs)
  })

  try {
    return await Promise.race([promise, timeoutPromise])
  } finally {
    if (timeoutId !== undefined) {
      clearTimeout(timeoutId)
    }
  }
}

/**
 * Configuration for retry behavior with timeout
 */
export interface RetryConfig {
  /** Maximum number of retry attempts (default: 3) */
  maxRetries?: number
  /** Base delay in ms for exponential backoff (default: 1000) */
  baseDelayMs?: number
  /** Maximum delay in ms (default: 10000) */
  maxDelayMs?: number
  /** Timeout per attempt in ms (default: 10000) */
  timeoutMs?: number
  /** Function to determine if error is retryable (default: all errors are retryable) */
  isRetryable?: (error: Error) => boolean
  /** Callback for each retry attempt */
  onRetry?: (attempt: number, error: Error) => void
}

/**
 * Wraps a promise with timeout and exponential backoff retry logic.
 * Useful for external API calls that might fail temporarily.
 * 
 * @param fn - Async function to execute
 * @param config - Retry configuration
 * @returns The function result or throws after all retries exhausted
 * 
 * @example
 * ```typescript
 * const result = await withRetry(
 *   () => stripe.charges.create({...}),
 *   {
 *     maxRetries: 3,
 *     timeoutMs: 10000,
 *     operationName: 'Stripe charge'
 *   }
 * )
 * ```
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  config: RetryConfig & { operationName?: string } = {}
): Promise<T> {
  const {
    maxRetries = 3,
    baseDelayMs = 1000,
    maxDelayMs = 10000,
    timeoutMs = 10000,
    isRetryable = () => true,
    onRetry,
    operationName,
  } = config

  let lastError: Error | undefined

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // Wrap the function call with timeout
      const result = await withTimeout(fn(), timeoutMs, operationName)
      return result
    } catch (error: unknown) {
      lastError = error instanceof Error ? error : new Error(String(error))

      // If this is the last attempt or error is not retryable, throw
      if (attempt === maxRetries || !isRetryable(lastError)) {
        throw lastError
      }

      // Calculate delay with exponential backoff: baseDelay * 2^attempt
      const delay = Math.min(baseDelayMs * Math.pow(2, attempt), maxDelayMs)

      // Notify about retry
      if (onRetry) {
        onRetry(attempt + 1, lastError)
      }

      // Wait before retry
      await new Promise((resolve) => setTimeout(resolve, delay))
    }
  }

  // Should never reach here, but TypeScript doesn't know that
  throw lastError || new Error('Retry failed with unknown error')
}

/**
 * Timeout configurations for common operations
 */
export const TIMEOUT_PRESETS = {
  /** Fast operations: 5 seconds */
  FAST: 5_000,
  /** Standard operations: 10 seconds */
  STANDARD: 10_000,
  /** Slow operations: 30 seconds */
  SLOW: 30_000,
  /** Payment processing: 20 seconds */
  PAYMENT: 20_000,
  /** Email sending: 15 seconds */
  EMAIL: 15_000,
  /** SMS sending: 10 seconds */
  SMS: 10_000,
  /** File upload: 60 seconds */
  UPLOAD: 60_000,
} as const

/**
 * Helper to determine if an error is a timeout error
 */
export function isTimeoutError(error: unknown): error is TimeoutError {
  return error instanceof TimeoutError
}

/**
 * Helper to determine if an error is retryable (network errors, timeouts, 5xx)
 */
export function isRetryableError(error: Error): boolean {
  // Timeout errors are retryable
  if (isTimeoutError(error)) {
    return true
  }

  // Network errors are retryable
  if (error.message.includes('ECONNREFUSED') || 
      error.message.includes('ETIMEDOUT') ||
      error.message.includes('ENOTFOUND') ||
      error.message.includes('network')) {
    return true
  }

  // HTTP 5xx errors are retryable
  if ('status' in error) {
    const errorWithStatus = error as { status: unknown }
    if (typeof errorWithStatus.status === 'number') {
      return errorWithStatus.status >= 500 && errorWithStatus.status < 600
    }
  }

  // Stripe rate limit errors are retryable
  if ('type' in error) {
    const errorWithType = error as { type: unknown }
    if (errorWithType.type === 'StripeRateLimitError') {
      return true
    }
  }

  // Default: not retryable
  return false
}
