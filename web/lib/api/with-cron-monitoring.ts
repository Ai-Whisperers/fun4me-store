/**
 * Cron Job Monitoring Wrapper
 *
 * AUDIT-002: Wraps cron job handlers with monitoring, alerting, and proper error handling.
 *
 * Features:
 * - Automatic alerting on failures
 * - High error rate detection (>10%)
 * - Slow job detection (>2 minutes)
 * - Proper HTTP status codes (500 on failure)
 * - Structured logging
 */

import { NextRequest, NextResponse } from 'next/server'
import { createRequestLogger } from '@/lib/logger'
import { checkCronAuth } from '@/lib/api/cron-auth'
import {
  sendCronFailureAlert,
  sendHighErrorRateAlert,
  sendSlowJobAlert,
} from '@/lib/monitoring/alerts'

// =============================================================================
// Types
// =============================================================================

export interface CronResult {
  /** Whether the job succeeded overall */
  success: boolean
  /** Number of items processed successfully */
  processed: number
  /** Number of items skipped (not an error) */
  skipped?: number
  /** Number of items that failed */
  failed?: number
  /** Error messages for failed items */
  errors: string[]
  /** Additional data to include in response */
  data?: Record<string, unknown>
}

export type CronHandler = (
  request: NextRequest,
  log: ReturnType<typeof createRequestLogger>
) => Promise<CronResult>

// =============================================================================
// Configuration
// =============================================================================

/** Error rate threshold for alerting (10%) */
const ERROR_RATE_THRESHOLD = 0.1

/** Duration threshold for slow job alerting (2 minutes) */
const SLOW_JOB_THRESHOLD_MS = 120_000

// =============================================================================
// Wrapper Function
// =============================================================================

/**
 * Wrap a cron job handler with monitoring and alerting
 *
 * @param jobName - Name of the cron job (for logging and alerts)
 * @param handler - The actual cron job handler function
 * @param options - Optional configuration
 *
 * @example
 * ```typescript
 * // app/api/cron/process-subscriptions/route.ts
 * import { withCronMonitoring } from '@/lib/api/with-cron-monitoring'
 *
 * async function processSubscriptions(request, log): Promise<CronResult> {
 *   const results = { success: true, processed: 0, errors: [] }
 *   // ... processing logic
 *   return results
 * }
 *
 * export const POST = withCronMonitoring('process-subscriptions', processSubscriptions)
 * ```
 */
export function withCronMonitoring(
  jobName: string,
  handler: CronHandler,
  options?: {
    /** Custom error rate threshold (default: 0.1 = 10%) */
    errorRateThreshold?: number
    /** Custom slow job threshold in ms (default: 120000 = 2 min) */
    slowJobThresholdMs?: number
    /** Skip authentication check (use with caution) */
    skipAuth?: boolean
  }
) {
  const errorRateThreshold = options?.errorRateThreshold ?? ERROR_RATE_THRESHOLD
  const slowJobThresholdMs = options?.slowJobThresholdMs ?? SLOW_JOB_THRESHOLD_MS

  return async function monitoredCronHandler(request: NextRequest): Promise<NextResponse> {
    const log = createRequestLogger(request, { action: `cron.${jobName}` })
    const startTime = Date.now()

    // Authenticate cron request
    if (!options?.skipAuth) {
      const { authorized, errorResponse } = checkCronAuth(request)
      if (!authorized) {
        log.warn('Unauthorized cron request')
        // checkCronAuth guarantees errorResponse when !authorized
        return errorResponse || NextResponse.json({ error: 'No autorizado' }, { status: 401 })
      }
    }

    try {
      // Execute the handler
      const result = await handler(request, log)
      const duration = Date.now() - startTime

      // Calculate metrics
      const totalItems = result.processed + (result.failed ?? 0) + (result.skipped ?? 0)
      const errorCount = result.errors.length
      const errorRate = totalItems > 0 ? errorCount / totalItems : 0

      // Log completion
      log.info(`Cron ${jobName} completed`, {
        ...result,
        duration_ms: duration,
        error_rate: `${(errorRate * 100).toFixed(1)}%`,
      })

      // Check for high error rate
      if (errorRate > errorRateThreshold && errorCount > 0) {
        await sendHighErrorRateAlert(jobName, errorCount, totalItems, result.errors)
      }

      // Check for slow job
      if (duration > slowJobThresholdMs) {
        await sendSlowJobAlert(jobName, duration)
      }

      // Return success response
      return NextResponse.json({
        success: result.success,
        processed: result.processed,
        skipped: result.skipped ?? 0,
        failed: result.failed ?? result.errors.length,
        errors: result.errors.length > 0 ? result.errors.slice(0, 10) : undefined, // Limit errors in response
        duration_ms: duration,
        timestamp: new Date().toISOString(),
        ...(result.data ?? {}),
      })
    } catch (error: unknown) {
      const duration = Date.now() - startTime
      const errorObj = error instanceof Error ? error : new Error(String(error))

      // Log the failure
      log.error(`Cron ${jobName} failed`, errorObj)

      // Send critical alert
      await sendCronFailureAlert(jobName, errorObj, duration)

      // Return 500 so Vercel shows failure in dashboard
      return NextResponse.json(
        {
          success: false,
          error: errorObj.message,
          duration_ms: duration,
          timestamp: new Date().toISOString(),
        },
        { status: 500 }
      )
    }
  }
}

// =============================================================================
// Helper for GET handlers (some cron services use GET)
// =============================================================================

/**
 * Same as withCronMonitoring but for GET handlers
 */
export function withCronMonitoringGet(
  jobName: string,
  handler: CronHandler,
  options?: Parameters<typeof withCronMonitoring>[2]
) {
  return withCronMonitoring(jobName, handler, options)
}
