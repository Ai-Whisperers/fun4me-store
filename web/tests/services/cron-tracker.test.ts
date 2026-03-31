/**
 * Cron Tracker Service Tests
 *
 * Tests cron job tracking functionality:
 * - Execution tracking with automatic start/complete/fail
 * - Manual tracking functions
 * - Status and history queries
 * - Cleanup operations
 * - Error handling and alerting integration
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import {
  trackCronExecution,
  getCronJobStatus,
  getJobHistory,
  cleanupOldRuns,
  startCronRun,
  completeCronRun,
  failCronRun,
  type CronJobStatus,
} from '@/lib/services/cron-tracker'
import { createMockSupabaseClient, type MockSupabaseClient } from './__mocks__/supabase-mock'

// Mock dependencies
vi.mock('@/lib/supabase/service', () => ({
  createServiceClient: vi.fn(),
}))

vi.mock('@/lib/logger', () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}))

vi.mock('@/lib/services/cron-alerting', () => ({
  alertOnCronFailure: vi.fn(),
}))

// =============================================================================
// TEST DATA FACTORIES
// =============================================================================

function createMockJobStatus(overrides: Partial<CronJobStatus> = {}): CronJobStatus {
  return {
    job_name: 'process-subscriptions',
    last_run_at: '2024-01-15T10:00:00Z',
    last_status: 'completed',
    last_duration_ms: 5000,
    last_error: null,
    runs_today: 24,
    failures_today: 0,
    ...overrides,
  }
}

function createMockJobRun(overrides: any = {}) {
  return {
    id: 'run-123-456',
    started_at: '2024-01-15T10:00:00Z',
    completed_at: '2024-01-15T10:00:05Z',
    status: 'completed',
    records_processed: 25,
    execution_time_ms: 5000,
    error_message: null,
    ...overrides,
  }
}

// =============================================================================
// MOCK SETUP
// =============================================================================

let mockSupabase: MockSupabaseClient
let alertOnCronFailureMock: typeof vi.fn

beforeEach(async () => {
  // Setup Supabase mock
  mockSupabase = createMockSupabaseClient()
  const { createServiceClient } = await import('@/lib/supabase/service')
  vi.mocked(createServiceClient).mockResolvedValue(mockSupabase as any)

  // Setup alerting mock
  const { alertOnCronFailure } = await import('@/lib/services/cron-alerting')
  alertOnCronFailureMock = vi.mocked(alertOnCronFailure)

  // Mock Date.now() for predictable timing
  let dateNowCallCount = 0
  vi.spyOn(Date, 'now').mockImplementation(() => {
    dateNowCallCount++
    return dateNowCallCount === 1 ? 1000 : 1500 // 500ms duration
  })
})

afterEach(() => {
  vi.clearAllMocks()
})

// =============================================================================
// EXECUTION TRACKING TESTS
// =============================================================================

describe('trackCronExecution', () => {
  it('should track successful cron job execution', async () => {
    const mockOperation = vi.fn().mockResolvedValue({
      processed: 25,
      metadata: { skipped: 2 },
    })

    // Mock start_cron_run
    mockSupabase.rpc.mockResolvedValueOnce({
      data: 'run-123-456',
      error: null,
    })

    // Mock complete_cron_run
    mockSupabase.rpc.mockResolvedValueOnce({
      data: null,
      error: null,
    })

    const result = await trackCronExecution('process-subscriptions', mockOperation)

    expect(result.success).toBe(true)
    expect(result.runId).toBe('run-123-456')
    expect(result.data).toEqual({
      processed: 25,
      metadata: { skipped: 2 },
    })
    expect(result.durationMs).toBe(500)

    expect(mockSupabase.rpc).toHaveBeenCalledWith('start_cron_run', {
      p_job_name: 'process-subscriptions',
    })

    expect(mockSupabase.rpc).toHaveBeenCalledWith('complete_cron_run', {
      p_run_id: 'run-123-456',
      p_records_processed: 25,
      p_metadata: { skipped: 2 },
    })
  })

  it('should track failed cron job execution', async () => {
    const mockOperation = vi.fn().mockRejectedValue(new Error('Database connection failed'))

    // Mock start_cron_run
    mockSupabase.rpc.mockResolvedValueOnce({
      data: 'run-789-012',
      error: null,
    })

    // Mock fail_cron_run
    mockSupabase.rpc.mockResolvedValueOnce({
      data: null,
      error: null,
    })

    const result = await trackCronExecution('backup-database', mockOperation)

    expect(result.success).toBe(false)
    expect(result.runId).toBe('run-789-012')
    expect(result.error).toBe('Database connection failed')
    expect(result.durationMs).toBe(500)

    expect(mockSupabase.rpc).toHaveBeenCalledWith('fail_cron_run', {
      p_run_id: 'run-789-012',
      p_error_message: 'Database connection failed',
      p_metadata: {},
    })

    expect(alertOnCronFailureMock).toHaveBeenCalledWith(
      'backup-database',
      'Database connection failed',
      'run-789-012'
    )
  })

  it('should continue execution even if tracking fails', async () => {
    const mockOperation = vi.fn().mockResolvedValue({
      processed: 10,
      metadata: {},
    })

    // Mock start_cron_run failure
    mockSupabase.rpc.mockResolvedValueOnce({
      data: null,
      error: { message: 'Tracking database down' },
    })

    const result = await trackCronExecution('cleanup-logs', mockOperation)

    expect(result.success).toBe(true)
    expect(result.runId).toBeUndefined()
    expect(result.data).toEqual({
      processed: 10,
      metadata: {},
    })
    expect(mockOperation).toHaveBeenCalled()
  })

  it('should handle unknown error types', async () => {
    const mockOperation = vi.fn().mockRejectedValue('String error')

    mockSupabase.rpc.mockResolvedValueOnce({
      data: 'run-456-789',
      error: null,
    })

    mockSupabase.rpc.mockResolvedValueOnce({
      data: null,
      error: null,
    })

    const result = await trackCronExecution('test-job', mockOperation)

    expect(result.success).toBe(false)
    expect(result.error).toBe('Unknown error')

    expect(mockSupabase.rpc).toHaveBeenCalledWith('fail_cron_run', {
      p_run_id: 'run-456-789',
      p_error_message: 'Unknown error',
      p_metadata: {},
    })
  })
})

// =============================================================================
// STATUS QUERY TESTS
// =============================================================================

describe('getCronJobStatus', () => {
  it('should return all cron job statuses', async () => {
    const mockStatuses = [
      createMockJobStatus({
        job_name: 'process-subscriptions',
        runs_today: 24,
        failures_today: 0,
      }),
      createMockJobStatus({
        job_name: 'backup-database',
        last_status: 'failed',
        last_error: 'Connection timeout',
        failures_today: 1,
      }),
    ]

    mockSupabase.rpc.mockResolvedValue({
      data: mockStatuses,
      error: null,
    })

    const result = await getCronJobStatus()

    expect(result).toEqual(mockStatuses)
    expect(mockSupabase.rpc).toHaveBeenCalledWith('get_cron_job_status')
  })

  it('should handle query errors gracefully', async () => {
    mockSupabase.rpc.mockResolvedValue({
      data: null,
      error: { message: 'Database error' },
    })

    const result = await getCronJobStatus()

    expect(result).toEqual([])
  })

  it('should handle exceptions gracefully', async () => {
    mockSupabase.rpc.mockRejectedValue(new Error('Network error'))

    const result = await getCronJobStatus()

    expect(result).toEqual([])
  })
})

// =============================================================================
// JOB HISTORY TESTS
// =============================================================================

describe('getJobHistory', () => {
  it('should return job history with default limit', async () => {
    const mockRuns = [
      createMockJobRun(),
      createMockJobRun({
        id: 'run-456-789',
        status: 'failed',
        error_message: 'Timeout error',
      }),
    ]

    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue({
              data: mockRuns,
              error: null,
            }),
          }),
        }),
      }),
    } as any)

    const result = await getJobHistory('process-subscriptions')

    expect(result).toEqual(mockRuns)
    expect(mockSupabase.from).toHaveBeenCalledWith('cron_job_runs')
  })

  it('should respect custom limit', async () => {
    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue({
              data: [],
              error: null,
            }),
          }),
        }),
      }),
    } as any)

    await getJobHistory('test-job', 5)

    const limitCall = mockSupabase.from().select().eq().order().limit as any
    expect(limitCall).toHaveBeenCalledWith(5)
  })

  it('should handle query errors gracefully', async () => {
    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue({
              data: null,
              error: { message: 'Query error' },
            }),
          }),
        }),
      }),
    } as any)

    const result = await getJobHistory('test-job')

    expect(result).toEqual([])
  })
})

// =============================================================================
// CLEANUP TESTS
// =============================================================================

describe('cleanupOldRuns', () => {
  it('should cleanup old runs and return count', async () => {
    mockSupabase.rpc.mockResolvedValue({
      data: 150,
      error: null,
    })

    const result = await cleanupOldRuns()

    expect(result).toBe(150)
    expect(mockSupabase.rpc).toHaveBeenCalledWith('cleanup_old_cron_runs')
  })

  it('should handle cleanup errors gracefully', async () => {
    mockSupabase.rpc.mockResolvedValue({
      data: null,
      error: { message: 'Cleanup failed' },
    })

    const result = await cleanupOldRuns()

    expect(result).toBe(0)
  })

  it('should handle exceptions gracefully', async () => {
    mockSupabase.rpc.mockRejectedValue(new Error('Database unavailable'))

    const result = await cleanupOldRuns()

    expect(result).toBe(0)
  })
})

// =============================================================================
// MANUAL TRACKING TESTS
// =============================================================================

describe('manual tracking functions', () => {
  describe('startCronRun', () => {
    it('should start cron run and return run ID', async () => {
      mockSupabase.rpc.mockResolvedValue({
        data: 'run-new-123',
        error: null,
      })

      const result = await startCronRun('manual-job')

      expect(result).toBe('run-new-123')
      expect(mockSupabase.rpc).toHaveBeenCalledWith('start_cron_run', {
        p_job_name: 'manual-job',
      })
    })

    it('should handle start errors gracefully', async () => {
      mockSupabase.rpc.mockResolvedValue({
        data: null,
        error: { message: 'Start failed' },
      })

      const result = await startCronRun('manual-job')

      expect(result).toBe(null)
    })
  })

  describe('completeCronRun', () => {
    it('should complete cron run with metadata', async () => {
      mockSupabase.rpc.mockResolvedValue({
        data: null,
        error: null,
      })

      await completeCronRun('run-123', 50, { category: 'test' })

      expect(mockSupabase.rpc).toHaveBeenCalledWith('complete_cron_run', {
        p_run_id: 'run-123',
        p_records_processed: 50,
        p_metadata: { category: 'test' },
      })
    })

    it('should handle completion errors gracefully', async () => {
      mockSupabase.rpc.mockResolvedValue({
        data: null,
        error: { message: 'Complete failed' },
      })

      // Should not throw
      await expect(completeCronRun('run-123', 25)).resolves.toBeUndefined()
    })
  })

  describe('failCronRun', () => {
    it('should fail cron run with error message', async () => {
      mockSupabase.rpc.mockResolvedValue({
        data: null,
        error: null,
      })

      await failCronRun('run-456', 'Test error', { context: 'testing' })

      expect(mockSupabase.rpc).toHaveBeenCalledWith('fail_cron_run', {
        p_run_id: 'run-456',
        p_error_message: 'Test error',
        p_metadata: { context: 'testing' },
      })
    })

    it('should handle fail errors gracefully', async () => {
      mockSupabase.rpc.mockResolvedValue({
        data: null,
        error: { message: 'Fail operation failed' },
      })

      // Should not throw
      await expect(failCronRun('run-456', 'Test error')).resolves.toBeUndefined()
    })
  })
})