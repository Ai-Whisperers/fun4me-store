/**
 * Cron Alerting Service Tests
 *
 * Tests cron job alerting functionality:
 * - Alert sending (Slack, email, DB logging)
 * - Alert severity handling
 * - Health check integration
 * - Error handling and fallbacks
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import {
  sendCronAlert,
  checkAndAlertUnhealthyJobs,
  alertOnCronFailure,
  type AlertPayload,
} from '@/lib/services/cron-alerting'
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

// =============================================================================
// TEST DATA FACTORIES
// =============================================================================

function createMockAlertPayload(overrides: Partial<AlertPayload> = {}): AlertPayload {
  return {
    jobName: 'process-subscriptions',
    severity: 'warning',
    message: 'Job failed to complete within expected time',
    details: {
      lastRun: '2024-01-15T10:00:00Z',
      expectedInterval: 3600000,
      error: 'Connection timeout',
      runId: 'run-123-456',
    },
    ...overrides,
  }
}

// =============================================================================
// MOCK SETUP
// =============================================================================

let mockSupabase: MockSupabaseClient
let originalEnv: NodeJS.ProcessEnv
let fetchMock: typeof vi.fn

beforeEach(async () => {
  // Setup Supabase mock
  mockSupabase = createMockSupabaseClient()
  const { createServiceClient } = await import('@/lib/supabase/service')
  vi.mocked(createServiceClient).mockResolvedValue(mockSupabase as any)

  // Setup environment
  originalEnv = { ...process.env }
  process.env.SLACK_CRON_WEBHOOK_URL = 'https://hooks.slack.com/test'
  process.env.ADMIN_ALERT_EMAIL = 'admin@example.com'
  process.env.NEXT_PUBLIC_BASE_URL = 'https://test.example.com'

  // Setup fetch mock
  fetchMock = vi.fn()
  global.fetch = fetchMock
})

afterEach(() => {
  vi.clearAllMocks()
  process.env = originalEnv
})

// =============================================================================
// ALERT SENDING TESTS
// =============================================================================

describe('sendCronAlert', () => {
  it('should log warning alert to database', async () => {
    const payload = createMockAlertPayload()

    mockSupabase.from.mockReturnValue({
      insert: vi.fn().mockResolvedValue({ data: null, error: null }),
    } as any)

    await sendCronAlert(payload)

    expect(mockSupabase.from).toHaveBeenCalledWith('cron_alerts')
    const insertCall = mockSupabase.from().insert as any
    expect(insertCall).toHaveBeenCalledWith({
      job_name: 'process-subscriptions',
      severity: 'warning',
      message: 'Job failed to complete within expected time',
      details: payload.details,
      created_at: expect.any(String),
    })
  })

  it('should send Slack alert when webhook URL is configured', async () => {
    const payload = createMockAlertPayload()

    mockSupabase.from.mockReturnValue({
      insert: vi.fn().mockResolvedValue({ data: null, error: null }),
    } as any)

    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
    } as Response)

    await sendCronAlert(payload)

    expect(fetchMock).toHaveBeenCalledWith(
      'https://hooks.slack.com/test',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: expect.stringContaining('Cron Job Alert'),
      })
    )
  })

  it('should send email alert for critical severity', async () => {
    const payload = createMockAlertPayload({
      severity: 'critical',
      jobName: 'billing/auto-charge',
    })

    // Mock first call for cron_alerts
    const mockInsert1 = vi.fn().mockResolvedValue({ data: null, error: null })
    // Mock second call for platform_notifications  
    const mockInsert2 = vi.fn().mockResolvedValue({ data: null, error: null })

    mockSupabase.from
      .mockReturnValueOnce({ insert: mockInsert1 } as any)
      .mockReturnValueOnce({ insert: mockInsert2 } as any)

    await sendCronAlert(payload)

    expect(mockSupabase.from).toHaveBeenCalledWith('cron_alerts')
    expect(mockSupabase.from).toHaveBeenCalledWith('platform_notifications')
    
    expect(mockInsert2).toHaveBeenCalledWith({
      recipient_email: 'admin@example.com',
      type: 'cron_alert',
      subject: '🚨 Critical Cron Alert: billing/auto-charge',
      body: expect.stringContaining('billing/auto-charge'),
      metadata: expect.any(Object),
      created_at: expect.any(String),
    })
  })

  it('should not fail if database logging fails', async () => {
    const payload = createMockAlertPayload()

    mockSupabase.from.mockReturnValue({
      insert: vi.fn().mockResolvedValue({ 
        data: null, 
        error: { message: 'Database error' } 
      }),
    } as any)

    // Should not throw
    await expect(sendCronAlert(payload)).resolves.toBeUndefined()
  })

  it('should not send Slack alert if webhook URL not configured', async () => {
    delete process.env.SLACK_CRON_WEBHOOK_URL

    const payload = createMockAlertPayload()

    mockSupabase.from.mockReturnValue({
      insert: vi.fn().mockResolvedValue({ data: null, error: null }),
    } as any)

    await sendCronAlert(payload)

    expect(fetchMock).not.toHaveBeenCalled()
  })
})

// =============================================================================
// HEALTH CHECK INTEGRATION TESTS
// =============================================================================

describe('checkAndAlertUnhealthyJobs', () => {
  it('should check health endpoint and send alerts for critical jobs', async () => {
    const healthResponse = {
      jobs: [
        {
          name: 'process-subscriptions',
          status: 'critical',
          message: 'Job has not run in 24 hours',
          lastRun: '2024-01-14T10:00:00Z',
          healthy: false,
        },
        {
          name: 'cleanup-logs',
          status: 'healthy',
          message: 'Job running normally',
          lastRun: '2024-01-15T09:30:00Z',
          healthy: true,
        },
      ],
    }

    fetchMock.mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue(healthResponse),
    } as any)

    mockSupabase.from.mockReturnValue({
      insert: vi.fn().mockResolvedValue({ data: null, error: null }),
    } as any)

    const result = await checkAndAlertUnhealthyJobs()

    expect(result).toEqual({
      checked: 2,
      alerts: 1,
    })

    expect(fetchMock).toHaveBeenCalledWith('https://test.example.com/api/health/cron')
    expect(mockSupabase.from).toHaveBeenCalledWith('cron_alerts')
  })

  it('should send warning alerts for unhealthy jobs', async () => {
    const healthResponse = {
      jobs: [
        {
          name: 'backup-database',
          status: 'warning',
          message: 'Job took longer than expected',
          lastRun: '2024-01-15T08:00:00Z',
          healthy: false,
        },
      ],
    }

    fetchMock.mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue(healthResponse),
    } as any)

    mockSupabase.from.mockReturnValue({
      insert: vi.fn().mockResolvedValue({ data: null, error: null }),
    } as any)

    const result = await checkAndAlertUnhealthyJobs()

    expect(result).toEqual({
      checked: 1,
      alerts: 1,
    })
  })

  it('should handle health endpoint errors gracefully', async () => {
    fetchMock.mockRejectedValue(new Error('Network error'))

    const result = await checkAndAlertUnhealthyJobs()

    expect(result).toEqual({
      checked: 0,
      alerts: 0,
    })
  })

  it('should handle malformed health response', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ invalid: 'response' }),
    } as any)

    const result = await checkAndAlertUnhealthyJobs()

    expect(result).toEqual({
      checked: 0,
      alerts: 0,
    })
  })
})

// =============================================================================
// IMMEDIATE FAILURE ALERTING TESTS
// =============================================================================

describe('alertOnCronFailure', () => {
  it('should send critical alert for critical jobs', async () => {
    mockSupabase.from.mockReturnValue({
      insert: vi.fn().mockResolvedValue({ data: null, error: null }),
    } as any)

    await alertOnCronFailure('billing/auto-charge', 'Payment provider timeout', 'run-789')

    expect(mockSupabase.from).toHaveBeenCalledWith('cron_alerts')
    const insertCall = mockSupabase.from().insert as any
    expect(insertCall).toHaveBeenCalledWith({
      job_name: 'billing/auto-charge',
      severity: 'critical',
      message: 'Cron job "billing/auto-charge" failed with error: Payment provider timeout',
      details: {
        error: 'Payment provider timeout',
        runId: 'run-789',
      },
      created_at: expect.any(String),
    })
  })

  it('should send warning alert for non-critical jobs', async () => {
    mockSupabase.from.mockReturnValue({
      insert: vi.fn().mockResolvedValue({ data: null, error: null }),
    } as any)

    await alertOnCronFailure('cleanup-logs', 'Disk space low', 'run-456')

    const insertCall = mockSupabase.from().insert as any
    expect(insertCall).toHaveBeenCalledWith(
      expect.objectContaining({
        job_name: 'cleanup-logs',
        severity: 'warning',
      })
    )
  })

  it('should handle alerting without run ID', async () => {
    mockSupabase.from.mockReturnValue({
      insert: vi.fn().mockResolvedValue({ data: null, error: null }),
    } as any)

    await alertOnCronFailure('backup-database', 'Storage service unavailable')

    const insertCall = mockSupabase.from().insert as any
    expect(insertCall).toHaveBeenCalledWith(
      expect.objectContaining({
        details: {
          error: 'Storage service unavailable',
          runId: undefined,
        },
      })
    )
  })
})

// =============================================================================
// ERROR HANDLING TESTS
// =============================================================================

describe('error handling', () => {
  it('should not fail if Slack webhook fails', async () => {
    const payload = createMockAlertPayload()

    mockSupabase.from.mockReturnValue({
      insert: vi.fn().mockResolvedValue({ data: null, error: null }),
    } as any)

    fetchMock.mockRejectedValue(new Error('Slack API error'))

    // Should not throw
    await expect(sendCronAlert(payload)).resolves.toBeUndefined()
  })

  it('should not fail if email sending fails', async () => {
    const payload = createMockAlertPayload({ severity: 'critical' })

    mockSupabase.from
      .mockReturnValueOnce({
        insert: vi.fn().mockResolvedValue({ data: null, error: null }),
      } as any)
      .mockReturnValueOnce({
        insert: vi.fn().mockResolvedValue({ 
          data: null, 
          error: { message: 'Email service down' } 
        }),
      } as any)

    // Should not throw
    await expect(sendCronAlert(payload)).resolves.toBeUndefined()
  })
})