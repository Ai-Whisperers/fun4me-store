/**
 * Cron Job Tracking Service
 *
 * Tracks execution of cron jobs for monitoring and debugging.
 * Provides wrappers for automatic start/complete/fail tracking.
 *
 * Usage:
 * ```typescript
 * const result = await trackCronExecution('process-subscriptions', async () => {
 *   // Your cron job logic here
 *   return { processed: 10, metadata: { skipped: 2 } }
 * })
 * ```
 */

import { createServiceClient } from '@/lib/supabase/service'
import { logger } from '@/lib/logger'
import { alertOnCronFailure } from './cron-alerting'

// =============================================================================
// Types
// =============================================================================

export interface CronExecutionResult {
  processed: number
  metadata?: Record<string, unknown>
}

export interface CronRunResult<T = unknown> {
  success: boolean
  runId?: string
  data?: T
  error?: string
  durationMs?: number
}

export interface CronJobStatus {
  job_name: string
  last_run_at: string | null
  last_status: 'running' | 'completed' | 'failed' | null
  last_duration_ms: number | null
  last_error: string | null
  runs_today: number
  failures_today: number
}

// =============================================================================
// Main Tracking Function
// =============================================================================

/**
 * Wraps a cron job operation with automatic tracking.
 * Records start time, completion status, and execution metrics.
 *
 * @param jobName - Name of the cron job (e.g., 'process-subscriptions')
 * @param operation - Async function that performs the cron job work
 * @returns Result including tracking information
 */
export async function trackCronExecution<T extends CronExecutionResult>(
  jobName: string,
  operation: () => Promise<T>
): Promise<CronRunResult<T>> {
  const startTime = Date.now()
  let runId: string | undefined

  try {
    const supabase = await createServiceClient()

    // Start tracking
    const { data: startResult, error: startError } = await supabase.rpc('start_cron_run', {
      p_job_name: jobName,
    })

    if (startError) {
      // Log but don't fail - tracking is non-critical
      logger.warn(`Failed to start cron tracking for ${jobName}`, {
        error: startError.message,
      })
    } else {
      runId = startResult
    }

    // Execute the operation
    const result = await operation()

    // Complete tracking
    if (runId) {
      const { error: completeError } = await supabase.rpc('complete_cron_run', {
        p_run_id: runId,
        p_records_processed: result.processed,
        p_metadata: result.metadata || {},
      })

      if (completeError) {
        logger.warn(`Failed to complete cron tracking for ${jobName}`, {
          error: completeError.message,
        })
      }
    }

    return {
      success: true,
      runId,
      data: result,
      durationMs: Date.now() - startTime,
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'

    // Record failure
    if (runId) {
      try {
        const supabase = await createServiceClient()
        await supabase.rpc('fail_cron_run', {
          p_run_id: runId,
          p_error_message: errorMessage,
          p_metadata: {},
        })
      } catch (trackError: unknown) {
        logger.warn(`Failed to record cron failure for ${jobName}`, {
          error: trackError instanceof Error ? trackError.message : 'Unknown',
        })
      }
    }

    logger.error(`Cron job ${jobName} failed`, {
      error: errorMessage,
      runId,
      durationMs: Date.now() - startTime,
    })

    // Send alert for failed job
    try {
      await alertOnCronFailure(jobName, errorMessage, runId)
    } catch (alertError: unknown) {
      // Don't fail tracking if alerting fails
      logger.warn(`Failed to send alert for ${jobName}`, {
        error: alertError instanceof Error ? alertError.message : 'Unknown',
      })
    }

    return {
      success: false,
      runId,
      error: errorMessage,
      durationMs: Date.now() - startTime,
    }
  }
}

// =============================================================================
// Status Query Functions
// =============================================================================

/**
 * Get status of all cron jobs.
 * Includes last run time, status, and today's statistics.
 */
export async function getCronJobStatus(): Promise<CronJobStatus[]> {
  try {
    const supabase = await createServiceClient()

    const { data, error } = await supabase.rpc('get_cron_job_status')

    if (error) {
      logger.warn('Failed to get cron job status', { error: error.message })
      return []
    }

    return data || []
  } catch (error: unknown) {
    logger.warn('Error getting cron job status', {
      error: error instanceof Error ? error.message : 'Unknown',
    })
    return []
  }
}

/**
 * Get recent runs for a specific job.
 */
export async function getJobHistory(
  jobName: string,
  limit: number = 10
): Promise<
  {
    id: string
    started_at: string
    completed_at: string | null
    status: string
    records_processed: number
    execution_time_ms: number | null
    error_message: string | null
  }[]
> {
  try {
    const supabase = await createServiceClient()

    const { data, error } = await supabase
      .from('cron_job_runs')
      .select('id, started_at, completed_at, status, records_processed, execution_time_ms, error_message')
      .eq('job_name', jobName)
      .order('started_at', { ascending: false })
      .limit(limit)

    if (error) {
      logger.warn(`Failed to get job history for ${jobName}`, { error: error.message })
      return []
    }

    return data || []
  } catch (error: unknown) {
    logger.warn(`Error getting job history for ${jobName}`, {
      error: error instanceof Error ? error.message : 'Unknown',
    })
    return []
  }
}

/**
 * Cleanup old cron run records.
 * Should be called periodically (e.g., daily).
 */
export async function cleanupOldRuns(): Promise<number> {
  try {
    const supabase = await createServiceClient()

    const { data, error } = await supabase.rpc('cleanup_old_cron_runs')

    if (error) {
      logger.warn('Failed to cleanup old cron runs', { error: error.message })
      return 0
    }

    if (data > 0) {
      logger.info(`Cleaned up ${data} old cron run records`)
    }

    return data || 0
  } catch (error: unknown) {
    logger.warn('Error cleaning up old cron runs', {
      error: error instanceof Error ? error.message : 'Unknown',
    })
    return 0
  }
}

// =============================================================================
// Simple Tracking (Without Wrapper)
// =============================================================================

/**
 * Manually start tracking a cron run.
 * Use this when you need more control than trackCronExecution provides.
 */
export async function startCronRun(jobName: string): Promise<string | null> {
  try {
    const supabase = await createServiceClient()

    const { data, error } = await supabase.rpc('start_cron_run', {
      p_job_name: jobName,
    })

    if (error) {
      logger.warn(`Failed to start cron run for ${jobName}`, { error: error.message })
      return null
    }

    return data
  } catch (error: unknown) {
    logger.warn(`Error starting cron run for ${jobName}`, {
      error: error instanceof Error ? error.message : 'Unknown',
    })
    return null
  }
}

/**
 * Manually complete a cron run.
 */
export async function completeCronRun(
  runId: string,
  processed: number = 0,
  metadata: Record<string, unknown> = {}
): Promise<void> {
  try {
    const supabase = await createServiceClient()

    const { error } = await supabase.rpc('complete_cron_run', {
      p_run_id: runId,
      p_records_processed: processed,
      p_metadata: metadata,
    })

    if (error) {
      logger.warn(`Failed to complete cron run ${runId}`, { error: error.message })
    }
  } catch (error: unknown) {
    logger.warn(`Error completing cron run ${runId}`, {
      error: error instanceof Error ? error.message : 'Unknown',
    })
  }
}

/**
 * Manually fail a cron run.
 */
export async function failCronRun(
  runId: string,
  errorMessage: string,
  metadata: Record<string, unknown> = {}
): Promise<void> {
  try {
    const supabase = await createServiceClient()

    const { error } = await supabase.rpc('fail_cron_run', {
      p_run_id: runId,
      p_error_message: errorMessage,
      p_metadata: metadata,
    })

    if (error) {
      logger.warn(`Failed to record cron failure ${runId}`, { error: error.message })
    }
  } catch (error: unknown) {
    logger.warn(`Error failing cron run ${runId}`, {
      error: error instanceof Error ? error.message : 'Unknown',
    })
  }
}
