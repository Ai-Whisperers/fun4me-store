/**
 * Cron Job External API Call Wrappers (Epic 3.2)
 * 
 * Provides timeout-protected versions of external API calls for use in cron jobs.
 * Prevents cron jobs from hanging indefinitely when external services don't respond.
 * 
 * Usage in cron jobs:
 * ```typescript
 * import { sendEmailWithTimeout, chargeCustomerWithRetry } from '@/lib/api/cron-external-calls'
 * 
 * // In cron job
 * const result = await sendEmailWithTimeout({ to, subject, html })
 * ```
 */

import { sendEmail, type EmailOptions } from '@/lib/email/client'
import { processAutoCharge, type AutoChargeParams } from '@/lib/billing/stripe'
import { withTimeout, withRetry, TIMEOUT_PRESETS, isRetryableError } from '@/lib/utils/timeout'
import { logger } from '@/lib/logger'

/**
 * Send email with timeout protection (Epic 3.2)
 * 
 * Wraps the standard sendEmail function with a 15-second timeout.
 * If the email provider doesn't respond within 15 seconds, throws TimeoutError.
 * 
 * @param options - Email options (to, subject, html, etc.)
 * @returns Promise resolving to email send result
 * @throws TimeoutError if email sending takes longer than 15 seconds
 */
export async function sendEmailWithTimeout(options: EmailOptions) {
  try {
    return await withTimeout(
      sendEmail(options),
      TIMEOUT_PRESETS.EMAIL, // 15 seconds
      `Email to ${options.to}`
    )
  } catch (error: unknown) {
    // Log timeout/failure but don't crash the cron job
    logger.error('Email sending failed or timed out in cron job', {
      to: options.to,
      subject: options.subject,
      error: error instanceof Error ? error.message : String(error),
    })
    throw error
  }
}

/**
 * Send email with retry logic (Epic 3.2)
 * 
 * Wraps sendEmail with timeout + exponential backoff retry.
 * Retries up to 3 times on retryable errors (network failures, 5xx errors).
 * 
 * @param options - Email options
 * @returns Promise resolving to email send result
 */
export async function sendEmailWithRetry(options: EmailOptions) {
  return withRetry(
    () => sendEmail(options),
    {
      maxRetries: 3,
      timeoutMs: TIMEOUT_PRESETS.EMAIL,
      baseDelayMs: 1000,
      maxDelayMs: 5000,
      isRetryable: isRetryableError,
      operationName: `Email to ${options.to}`,
      onRetry: (attempt, error) => {
        logger.warn('Retrying email send in cron job', {
          attempt,
          to: options.to,
          error: error.message,
        })
      },
    }
  )
}

/**
 * Process auto-charge with timeout and retry (Epic 3.2 & 3.3)
 * 
 * Wraps Stripe auto-charge with timeout + retry logic.
 * Critical for preventing payment processing hangs in cron jobs.
 * 
 * @param params - Auto-charge parameters
 * @returns Promise resolving to charge result
 */
export async function chargeCustomerWithRetry(params: AutoChargeParams) {
  return withRetry(
    () => processAutoCharge(params),
    {
      maxRetries: 3,
      timeoutMs: TIMEOUT_PRESETS.PAYMENT, // 20 seconds
      baseDelayMs: 2000, // Start with 2s delay for payments
      maxDelayMs: 10000, // Max 10s delay
      isRetryable: (error) => {
        // Retry on network errors, timeouts, and Stripe rate limits
        if (isRetryableError(error)) {
          return true
        }
        
        // Don't retry on card declined, insufficient funds, etc.
        if (error.message.includes('card_declined') ||
            error.message.includes('insufficient_funds') ||
            error.message.includes('expired_card')) {
          return false
        }
        
        // Retry other Stripe errors
        return true
      },
      operationName: `Stripe charge for customer ${params.customerId}`,
      onRetry: (attempt, error) => {
        logger.warn('Retrying Stripe charge in cron job', {
          attempt,
          customerId: params.customerId,
          amount: params.amount,
          error: error.message,
        })
      },
    }
  )
}

/**
 * Generic HTTP fetch with timeout (Epic 3.2)
 * 
 * Wraps fetch calls with timeout protection.
 * Useful for webhook calls, API integrations, etc.
 * 
 * @param url - URL to fetch
 * @param options - Fetch options
 * @param timeoutMs - Timeout in milliseconds (default: 10s)
 * @returns Promise resolving to fetch response
 */
export async function fetchWithTimeout(
  url: string,
  options?: RequestInit,
  timeoutMs: number = TIMEOUT_PRESETS.STANDARD
) {
  try {
    return await withTimeout(
      fetch(url, options),
      timeoutMs,
      `HTTP ${options?.method || 'GET'} ${url}`
    )
  } catch (error: unknown) {
    logger.error('HTTP fetch failed or timed out in cron job', {
      url,
      method: options?.method || 'GET',
      error: error instanceof Error ? error.message : String(error),
    })
    throw error
  }
}

/**
 * Generic HTTP fetch with retry (Epic 3.2)
 * 
 * Wraps fetch with timeout + retry logic.
 * Retries on network errors and 5xx responses.
 * 
 * @param url - URL to fetch
 * @param options - Fetch options
 * @param config - Retry configuration
 * @returns Promise resolving to fetch response
 */
export async function fetchWithRetry(
  url: string,
  options?: RequestInit,
  config?: {
    maxRetries?: number
    timeoutMs?: number
  }
) {
  return withRetry(
    async () => {
      const response = await fetch(url, options)
      
      // Throw on non-OK responses so retry logic can handle them
      if (!response.ok) {
        const error = new Error(`HTTP ${response.status}: ${response.statusText}`) as Error & { status?: number }
        error.status = response.status
        throw error
      }
      
      return response
    },
    {
      maxRetries: config?.maxRetries ?? 3,
      timeoutMs: config?.timeoutMs ?? TIMEOUT_PRESETS.STANDARD,
      baseDelayMs: 1000,
      maxDelayMs: 5000,
      isRetryable: isRetryableError,
      operationName: `HTTP ${options?.method || 'GET'} ${url}`,
      onRetry: (attempt, error) => {
        logger.warn('Retrying HTTP fetch in cron job', {
          attempt,
          url,
          method: options?.method || 'GET',
          error: error.message,
        })
      },
    }
  )
}

/**
 * Batch process with timeout per item (Epic 3.2)
 * 
 * Processes an array of items with timeout protection on each item.
 * Returns results with successes and failures separated.
 * 
 * @param items - Array of items to process
 * @param processor - Async function to process each item
 * @param timeoutMs - Timeout per item in milliseconds
 * @returns Object with successful and failed items
 */
export async function batchProcessWithTimeout<T, R>(
  items: T[],
  processor: (item: T) => Promise<R>,
  timeoutMs: number = TIMEOUT_PRESETS.STANDARD
): Promise<{
  successes: Array<{ item: T; result: R }>
  failures: Array<{ item: T; error: Error }>
}> {
  const results = await Promise.allSettled(
    items.map(async (item) => {
      const result = await withTimeout(
        processor(item),
        timeoutMs,
        'Batch item processing'
      )
      return { item, result }
    })
  )

  const successes: Array<{ item: T; result: R }> = []
  const failures: Array<{ item: T; error: Error }> = []

  results.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      successes.push(result.value)
    } else {
      failures.push({
        item: items[index],
        error: result.reason instanceof Error ? result.reason : new Error(String(result.reason)),
      })
    }
  })

  return { successes, failures }
}
