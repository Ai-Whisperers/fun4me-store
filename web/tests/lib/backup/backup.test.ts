/**
 * Backup Infrastructure Tests
 *
 * DATA-001: Tests for backup verification and integrity utilities
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock Supabase
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() =>
    Promise.resolve({
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({ data: { id: '1' }, error: null })),
          })),
          not: vi.fn(() => ({
            limit: vi.fn(() => Promise.resolve({ data: [{ id: '1' }], error: null })),
          })),
          limit: vi.fn(() => Promise.resolve({ data: [{ id: '1' }], error: null })),
        })),
      })),
    })
  ),
}))

describe('Backup Types', () => {
  it('should export BackupConfig interface shape', async () => {
    const { DEFAULT_BACKUP_STRATEGY } = await import('@/lib/backup')

    expect(DEFAULT_BACKUP_STRATEGY).toBeDefined()
    expect(DEFAULT_BACKUP_STRATEGY.primary).toBeDefined()
    expect(DEFAULT_BACKUP_STRATEGY.primary.provider).toBe('supabase')
    expect(DEFAULT_BACKUP_STRATEGY.primary.frequency).toBe('daily')
    expect(DEFAULT_BACKUP_STRATEGY.primary.retention.days).toBe(30)
    expect(DEFAULT_BACKUP_STRATEGY.primary.enabled).toBe(true)
  })

  it('should have valid RTO/RPO targets', async () => {
    const { DEFAULT_BACKUP_STRATEGY } = await import('@/lib/backup')

    expect(DEFAULT_BACKUP_STRATEGY.rto.target).toBe(4) // 4 hours
    expect(DEFAULT_BACKUP_STRATEGY.rpo.target).toBe(1) // 1 hour
  })

  it('should configure point-in-time recovery', async () => {
    const { DEFAULT_BACKUP_STRATEGY } = await import('@/lib/backup')

    expect(DEFAULT_BACKUP_STRATEGY.pointInTimeRecovery.enabled).toBe(true)
    expect(DEFAULT_BACKUP_STRATEGY.pointInTimeRecovery.retentionDays).toBe(7)
  })

  it('should have disabled secondary backup by default', async () => {
    const { DEFAULT_BACKUP_STRATEGY } = await import('@/lib/backup')

    expect(DEFAULT_BACKUP_STRATEGY.secondary).toBeDefined()
    expect(DEFAULT_BACKUP_STRATEGY.secondary?.enabled).toBe(false)
    expect(DEFAULT_BACKUP_STRATEGY.secondary?.provider).toBe('s3')
  })
})

describe('Integrity Constants', () => {
  it('should export CRITICAL_TABLES', async () => {
    const { CRITICAL_TABLES } = await import('@/lib/backup')

    expect(CRITICAL_TABLES).toBeInstanceOf(Array)
    expect(CRITICAL_TABLES).toContain('tenants')
    expect(CRITICAL_TABLES).toContain('profiles')
    expect(CRITICAL_TABLES).toContain('pets')
    expect(CRITICAL_TABLES).toContain('appointments')
    expect(CRITICAL_TABLES).toContain('invoices')
    expect(CRITICAL_TABLES).toContain('medical_records')
  })

  it('should export MINIMUM_ROW_EXPECTATIONS', async () => {
    const { MINIMUM_ROW_EXPECTATIONS } = await import('@/lib/backup')

    expect(MINIMUM_ROW_EXPECTATIONS).toBeDefined()
    expect(MINIMUM_ROW_EXPECTATIONS.tenants).toBe(1)
    expect(MINIMUM_ROW_EXPECTATIONS.profiles).toBe(1)
  })
})

describe('Backup Status', () => {
  it('should return degraded status when no verification exists', async () => {
    const { getBackupStatus } = await import('@/lib/backup')

    const status = getBackupStatus(null)

    expect(status.status).toBe('degraded')
    expect(status.alerts).toHaveLength(1)
    expect(status.alerts[0].id).toBe('no-verification')
    expect(status.alerts[0].severity).toBe('warning')
  })

  it('should return healthy status for successful verification', async () => {
    const { getBackupStatus } = await import('@/lib/backup')

    const mockVerification = {
      timestamp: new Date(),
      status: 'success' as const,
      checks: [],
      summary: { totalChecks: 10, passed: 10, failed: 0, warnings: 0 },
      duration: 1000,
    }

    const status = getBackupStatus(mockVerification)

    expect(status.status).toBe('healthy')
    expect(status.alerts).toHaveLength(0)
  })

  it('should return critical status for failed verification', async () => {
    const { getBackupStatus } = await import('@/lib/backup')

    const mockVerification = {
      timestamp: new Date(),
      status: 'failed' as const,
      checks: [],
      summary: { totalChecks: 10, passed: 5, failed: 5, warnings: 0 },
      duration: 1000,
    }

    const status = getBackupStatus(mockVerification)

    expect(status.status).toBe('critical')
    expect(status.alerts.some((a) => a.id === 'verification-failed')).toBe(true)
  })

  it('should return degraded status for partial verification', async () => {
    const { getBackupStatus } = await import('@/lib/backup')

    const mockVerification = {
      timestamp: new Date(),
      status: 'partial' as const,
      checks: [],
      summary: { totalChecks: 10, passed: 8, failed: 0, warnings: 2 },
      duration: 1000,
    }

    const status = getBackupStatus(mockVerification)

    expect(status.status).toBe('degraded')
    expect(status.alerts.some((a) => a.id === 'verification-warnings')).toBe(true)
  })

  it('should alert on stale verification (>24h old)', async () => {
    const { getBackupStatus } = await import('@/lib/backup')

    const oldDate = new Date()
    oldDate.setHours(oldDate.getHours() - 48) // 48 hours ago

    const mockVerification = {
      timestamp: oldDate,
      status: 'success' as const,
      checks: [],
      summary: { totalChecks: 10, passed: 10, failed: 0, warnings: 0 },
      duration: 1000,
    }

    const status = getBackupStatus(mockVerification)

    expect(status.alerts.some((a) => a.id === 'stale-verification')).toBe(true)
  })

  it('should have nextScheduled date in the future', async () => {
    const { getBackupStatus } = await import('@/lib/backup')

    const status = getBackupStatus(null)

    expect(status.nextScheduled).toBeInstanceOf(Date)
    expect(status.nextScheduled!.getTime()).toBeGreaterThan(Date.now())
  })
})

describe('Format Functions', () => {
  it('should format verification report as markdown', async () => {
    const { formatVerificationReport } = await import('@/lib/backup')

    const mockResult = {
      timestamp: new Date('2024-01-15T12:00:00Z'),
      status: 'success' as const,
      checks: [
        {
          name: 'Row count: tenants',
          category: 'row_count' as const,
          status: 'passed' as const,
          message: 'Table tenants has 5 rows',
          table: 'tenants',
        },
        {
          name: 'FK: profiles -> tenants',
          category: 'foreign_key' as const,
          status: 'passed' as const,
          message: 'Profile-tenant relationships intact',
        },
      ],
      summary: { totalChecks: 2, passed: 2, failed: 0, warnings: 0 },
      duration: 500,
    }

    const report = formatVerificationReport(mockResult)

    expect(report).toContain('# Backup Verification Report')
    expect(report).toContain('**Status**: SUCCESS')
    expect(report).toContain('**Duration**: 500ms')
    expect(report).toContain('- Total Checks: 2')
    expect(report).toContain('- Passed: 2')
    expect(report).toContain('✅')
    expect(report).toContain('ROW COUNT')
    expect(report).toContain('FOREIGN KEY')
  })

  it('should format backup strategy as markdown', async () => {
    const { formatBackupStrategy, DEFAULT_BACKUP_STRATEGY } = await import('@/lib/backup')

    const formatted = formatBackupStrategy(DEFAULT_BACKUP_STRATEGY)

    expect(formatted).toContain('# Backup Strategy')
    expect(formatted).toContain('## Primary Backup (Supabase)')
    expect(formatted).toContain('- Provider: supabase')
    expect(formatted).toContain('- Frequency: daily')
    expect(formatted).toContain('- Retention: 30 days')
    expect(formatted).toContain('## Point-in-Time Recovery')
    expect(formatted).toContain('- Enabled: true')
    expect(formatted).toContain('## Recovery Objectives')
    expect(formatted).toContain('- RTO Target: 4 hours')
    expect(formatted).toContain('- RPO Target: 1 hour')
  })

  it('should show failed status with X icon', async () => {
    const { formatVerificationReport } = await import('@/lib/backup')

    const mockResult = {
      timestamp: new Date(),
      status: 'failed' as const,
      checks: [
        {
          name: 'Row count: tenants',
          category: 'row_count' as const,
          status: 'failed' as const,
          message: 'Error counting rows: connection failed',
          table: 'tenants',
        },
      ],
      summary: { totalChecks: 1, passed: 0, failed: 1, warnings: 0 },
      duration: 100,
    }

    const report = formatVerificationReport(mockResult)

    expect(report).toContain('**Status**: FAILED')
    expect(report).toContain('❌')
  })

  it('should show warning status with warning icon', async () => {
    const { formatVerificationReport } = await import('@/lib/backup')

    const mockResult = {
      timestamp: new Date(),
      status: 'partial' as const,
      checks: [
        {
          name: 'Row count: tenants',
          category: 'row_count' as const,
          status: 'warning' as const,
          message: 'Table tenants has fewer rows than expected',
          table: 'tenants',
        },
      ],
      summary: { totalChecks: 1, passed: 0, failed: 0, warnings: 1 },
      duration: 100,
    }

    const report = formatVerificationReport(mockResult)

    expect(report).toContain('⚠️')
  })
})

describe('IntegrityCheckResult Type', () => {
  it('should support all category types', async () => {
    const { formatVerificationReport } = await import('@/lib/backup')

    const mockResult = {
      timestamp: new Date(),
      status: 'success' as const,
      checks: [
        {
          name: 'Row count test',
          category: 'row_count' as const,
          status: 'passed' as const,
          message: 'OK',
        },
        {
          name: 'FK test',
          category: 'foreign_key' as const,
          status: 'passed' as const,
          message: 'OK',
        },
        {
          name: 'Data test',
          category: 'data_presence' as const,
          status: 'passed' as const,
          message: 'OK',
        },
        {
          name: 'Schema test',
          category: 'schema' as const,
          status: 'passed' as const,
          message: 'OK',
        },
        {
          name: 'Custom test',
          category: 'custom' as const,
          status: 'passed' as const,
          message: 'OK',
        },
      ],
      summary: { totalChecks: 5, passed: 5, failed: 0, warnings: 0 },
      duration: 100,
    }

    const report = formatVerificationReport(mockResult)

    expect(report).toContain('ROW COUNT')
    expect(report).toContain('FOREIGN KEY')
    expect(report).toContain('DATA PRESENCE')
    expect(report).toContain('SCHEMA')
    expect(report).toContain('CUSTOM')
  })
})

describe('Backup Module Exports', () => {
  it('should export all required functions from index', async () => {
    const backup = await import('@/lib/backup')

    // Verification exports
    expect(typeof backup.verifyBackup).toBe('function')
    expect(typeof backup.getBackupStatus).toBe('function')
    expect(typeof backup.formatVerificationReport).toBe('function')
    expect(typeof backup.formatBackupStrategy).toBe('function')
    expect(backup.DEFAULT_BACKUP_STRATEGY).toBeDefined()

    // Integrity exports
    expect(typeof backup.checkRowCounts).toBe('function')
    expect(typeof backup.checkForeignKeyIntegrity).toBe('function')
    expect(typeof backup.checkCriticalData).toBe('function')
    expect(typeof backup.runSampleQueries).toBe('function')
    expect(typeof backup.getTableStats).toBe('function')
    expect(backup.CRITICAL_TABLES).toBeDefined()
    expect(backup.MINIMUM_ROW_EXPECTATIONS).toBeDefined()
  })
})

describe('Verification Function', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should run all verification checks in parallel', async () => {
    const { verifyBackup } = await import('@/lib/backup')

    const result = await verifyBackup()

    expect(result).toBeDefined()
    expect(result.timestamp).toBeInstanceOf(Date)
    expect(result.summary).toBeDefined()
    expect(typeof result.duration).toBe('number')
  })

  it('should determine status based on check results', async () => {
    const { verifyBackup } = await import('@/lib/backup')

    const result = await verifyBackup()

    // Status should be one of the valid values
    expect(['success', 'partial', 'failed']).toContain(result.status)
  })
})
