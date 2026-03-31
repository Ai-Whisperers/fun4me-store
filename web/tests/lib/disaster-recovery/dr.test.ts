/**
 * Disaster Recovery Tests
 *
 * DATA-003: Tests for DR utilities
 */

import { describe, it, expect } from 'vitest'
import {
  RECOVERY_CHECKLIST,
  getChecklistByPhase,
  getCriticalChecklist,
  calculateProgress,
  getNextIncompleteItem,
  formatChecklist,
} from '@/lib/disaster-recovery/checklist'
import {
  CRITICAL_SERVICES,
  NON_CRITICAL_SERVICES,
  areAllCriticalServicesHealthy,
  getServicesByStatus,
  determineOverallStatus,
  formatHealthCheckResults,
  createHealthCheckResult,
  getSuggestedActions,
} from '@/lib/disaster-recovery/health-checks'
import type { ChecklistItem, HealthCheckResult } from '@/lib/disaster-recovery/types'

describe('Recovery Checklist', () => {
  it('should export a non-empty checklist', () => {
    expect(RECOVERY_CHECKLIST).toBeInstanceOf(Array)
    expect(RECOVERY_CHECKLIST.length).toBeGreaterThan(0)
  })

  it('should have required properties on each item', () => {
    for (const item of RECOVERY_CHECKLIST) {
      expect(item.id).toBeDefined()
      expect(item.step).toBeDefined()
      expect(typeof item.critical).toBe('boolean')
      expect(item.phase).toBeDefined()
    }
  })

  it('should have items in all phases', () => {
    const phases = ['initial', 'assessment', 'communication', 'recovery', 'post-incident']
    for (const phase of phases) {
      const items = getChecklistByPhase(phase as ChecklistItem['phase'])
      expect(items.length).toBeGreaterThan(0)
    }
  })
})

describe('getChecklistByPhase', () => {
  it('should return only items for the specified phase', () => {
    const initialItems = getChecklistByPhase('initial')
    expect(initialItems.every((item) => item.phase === 'initial')).toBe(true)
  })

  it('should return empty array for invalid phase', () => {
    // @ts-expect-error Testing invalid input
    const items = getChecklistByPhase('invalid')
    expect(items).toHaveLength(0)
  })
})

describe('getCriticalChecklist', () => {
  it('should return only critical items', () => {
    const critical = getCriticalChecklist()
    expect(critical.every((item) => item.critical)).toBe(true)
  })

  it('should have fewer items than full checklist', () => {
    const critical = getCriticalChecklist()
    expect(critical.length).toBeLessThan(RECOVERY_CHECKLIST.length)
  })
})

describe('calculateProgress', () => {
  it('should calculate 0% for no completed items', () => {
    const checklist: ChecklistItem[] = [
      { id: '1', step: 'Step 1', critical: true, phase: 'initial', completed: false },
      { id: '2', step: 'Step 2', critical: false, phase: 'initial', completed: false },
    ]

    const progress = calculateProgress(checklist)
    expect(progress.percentage).toBe(0)
    expect(progress.completed).toBe(0)
    expect(progress.total).toBe(2)
  })

  it('should calculate 100% for all completed items', () => {
    const checklist: ChecklistItem[] = [
      { id: '1', step: 'Step 1', critical: true, phase: 'initial', completed: true },
      { id: '2', step: 'Step 2', critical: false, phase: 'initial', completed: true },
    ]

    const progress = calculateProgress(checklist)
    expect(progress.percentage).toBe(100)
    expect(progress.completed).toBe(2)
  })

  it('should calculate partial progress correctly', () => {
    const checklist: ChecklistItem[] = [
      { id: '1', step: 'Step 1', critical: true, phase: 'initial', completed: true },
      { id: '2', step: 'Step 2', critical: false, phase: 'initial', completed: false },
    ]

    const progress = calculateProgress(checklist)
    expect(progress.percentage).toBe(50)
    expect(progress.completed).toBe(1)
  })

  it('should track critical items separately', () => {
    const checklist: ChecklistItem[] = [
      { id: '1', step: 'Step 1', critical: true, phase: 'initial', completed: true },
      { id: '2', step: 'Step 2', critical: true, phase: 'initial', completed: false },
      { id: '3', step: 'Step 3', critical: false, phase: 'initial', completed: true },
    ]

    const progress = calculateProgress(checklist)
    expect(progress.criticalCompleted).toBe(1)
    expect(progress.criticalTotal).toBe(2)
  })

  it('should handle empty checklist', () => {
    const progress = calculateProgress([])
    expect(progress.percentage).toBe(0)
    expect(progress.total).toBe(0)
  })
})

describe('getNextIncompleteItem', () => {
  it('should return first incomplete item', () => {
    const checklist: ChecklistItem[] = [
      { id: '1', step: 'Step 1', critical: true, phase: 'initial', completed: true },
      { id: '2', step: 'Step 2', critical: false, phase: 'initial', completed: false },
      { id: '3', step: 'Step 3', critical: false, phase: 'initial', completed: false },
    ]

    const next = getNextIncompleteItem(checklist)
    expect(next?.id).toBe('2')
  })

  it('should return null when all complete', () => {
    const checklist: ChecklistItem[] = [
      { id: '1', step: 'Step 1', critical: true, phase: 'initial', completed: true },
    ]

    const next = getNextIncompleteItem(checklist)
    expect(next).toBeNull()
  })

  it('should return null for empty checklist', () => {
    const next = getNextIncompleteItem([])
    expect(next).toBeNull()
  })
})

describe('formatChecklist', () => {
  it('should format checklist as markdown', () => {
    const checklist: ChecklistItem[] = [
      { id: '1', step: 'Step 1', critical: true, phase: 'initial', completed: true },
      { id: '2', step: 'Step 2', critical: false, phase: 'recovery', completed: false },
    ]

    const formatted = formatChecklist(checklist)

    expect(formatted).toContain('# Recovery Checklist')
    expect(formatted).toContain('## Initial Response')
    expect(formatted).toContain('## Recovery')
    expect(formatted).toContain('[x] Step 1 (CRITICAL)')
    expect(formatted).toContain('[ ] Step 2')
  })
})

// Health Checks Tests

describe('Critical Services', () => {
  it('should have defined critical services', () => {
    expect(CRITICAL_SERVICES).toContain('database')
    expect(CRITICAL_SERVICES).toContain('auth')
    expect(CRITICAL_SERVICES).toContain('api')
  })

  it('should have defined non-critical services', () => {
    expect(NON_CRITICAL_SERVICES).toContain('email')
    expect(NON_CRITICAL_SERVICES).toContain('whatsapp')
  })
})

describe('areAllCriticalServicesHealthy', () => {
  it('should return true when all critical services are healthy', () => {
    const results: HealthCheckResult[] = [
      { service: 'database', status: 'healthy', lastChecked: new Date() },
      { service: 'auth', status: 'healthy', lastChecked: new Date() },
      { service: 'api', status: 'healthy', lastChecked: new Date() },
      { service: 'storage', status: 'healthy', lastChecked: new Date() },
      { service: 'cron', status: 'healthy', lastChecked: new Date() },
    ]

    expect(areAllCriticalServicesHealthy(results)).toBe(true)
  })

  it('should return false when any critical service is down', () => {
    const results: HealthCheckResult[] = [
      { service: 'database', status: 'down', lastChecked: new Date() },
      { service: 'auth', status: 'healthy', lastChecked: new Date() },
    ]

    expect(areAllCriticalServicesHealthy(results)).toBe(false)
  })

  it('should return false when any critical service is degraded', () => {
    const results: HealthCheckResult[] = [
      { service: 'database', status: 'degraded', lastChecked: new Date() },
      { service: 'auth', status: 'healthy', lastChecked: new Date() },
    ]

    expect(areAllCriticalServicesHealthy(results)).toBe(false)
  })

  it('should ignore non-critical services', () => {
    const results: HealthCheckResult[] = [
      { service: 'database', status: 'healthy', lastChecked: new Date() },
      { service: 'email', status: 'down', lastChecked: new Date() },
    ]

    expect(areAllCriticalServicesHealthy(results)).toBe(true)
  })
})

describe('getServicesByStatus', () => {
  it('should filter services by status', () => {
    const results: HealthCheckResult[] = [
      { service: 'database', status: 'healthy', lastChecked: new Date() },
      { service: 'auth', status: 'down', lastChecked: new Date() },
      { service: 'api', status: 'healthy', lastChecked: new Date() },
    ]

    const healthy = getServicesByStatus(results, 'healthy')
    expect(healthy).toHaveLength(2)
    expect(healthy.map((r) => r.service)).toContain('database')
    expect(healthy.map((r) => r.service)).toContain('api')

    const down = getServicesByStatus(results, 'down')
    expect(down).toHaveLength(1)
    expect(down[0].service).toBe('auth')
  })
})

describe('determineOverallStatus', () => {
  it('should return operational when all services healthy', () => {
    const results: HealthCheckResult[] = [
      { service: 'database', status: 'healthy', lastChecked: new Date() },
      { service: 'auth', status: 'healthy', lastChecked: new Date() },
      { service: 'email', status: 'healthy', lastChecked: new Date() },
    ]

    expect(determineOverallStatus(results)).toBe('operational')
  })

  it('should return major_outage when 2+ critical services down', () => {
    const results: HealthCheckResult[] = [
      { service: 'database', status: 'down', lastChecked: new Date() },
      { service: 'auth', status: 'down', lastChecked: new Date() },
    ]

    expect(determineOverallStatus(results)).toBe('major_outage')
  })

  it('should return partial_outage when 1 critical service down', () => {
    const results: HealthCheckResult[] = [
      { service: 'database', status: 'down', lastChecked: new Date() },
      { service: 'auth', status: 'healthy', lastChecked: new Date() },
    ]

    expect(determineOverallStatus(results)).toBe('partial_outage')
  })

  it('should return degraded when critical service degraded', () => {
    const results: HealthCheckResult[] = [
      { service: 'database', status: 'degraded', lastChecked: new Date() },
      { service: 'auth', status: 'healthy', lastChecked: new Date() },
    ]

    expect(determineOverallStatus(results)).toBe('degraded')
  })

  it('should return degraded when non-critical service down', () => {
    const results: HealthCheckResult[] = [
      { service: 'database', status: 'healthy', lastChecked: new Date() },
      { service: 'email', status: 'down', lastChecked: new Date() },
    ]

    expect(determineOverallStatus(results)).toBe('degraded')
  })
})

describe('formatHealthCheckResults', () => {
  it('should format results as markdown', () => {
    const results: HealthCheckResult[] = [
      { service: 'database', status: 'healthy', lastChecked: new Date(), latencyMs: 50 },
      { service: 'email', status: 'down', lastChecked: new Date() },
    ]

    const formatted = formatHealthCheckResults(results)

    expect(formatted).toContain('# Health Check Results')
    expect(formatted).toContain('## Critical Services')
    expect(formatted).toContain('## Non-Critical Services')
    expect(formatted).toContain('database: healthy')
    expect(formatted).toContain('email: down')
    expect(formatted).toContain('(50ms)')
  })

  it('should show overall status', () => {
    const results: HealthCheckResult[] = [
      { service: 'database', status: 'healthy', lastChecked: new Date() },
    ]

    const formatted = formatHealthCheckResults(results)
    expect(formatted).toContain('## Overall Status')
  })
})

describe('createHealthCheckResult', () => {
  it('should create a health check result', () => {
    const result = createHealthCheckResult('database', 'healthy', {
      latencyMs: 100,
      details: 'All good',
    })

    expect(result.service).toBe('database')
    expect(result.status).toBe('healthy')
    expect(result.latencyMs).toBe(100)
    expect(result.details).toBe('All good')
    expect(result.lastChecked).toBeInstanceOf(Date)
  })

  it('should work without options', () => {
    const result = createHealthCheckResult('auth', 'down')

    expect(result.service).toBe('auth')
    expect(result.status).toBe('down')
    expect(result.latencyMs).toBeUndefined()
  })
})

describe('getSuggestedActions', () => {
  it('should suggest actions for down services', () => {
    const results: HealthCheckResult[] = [
      { service: 'database', status: 'down', lastChecked: new Date() },
    ]

    const actions = getSuggestedActions(results)
    expect(actions.length).toBeGreaterThan(0)
    expect(actions.some((a) => a.includes('Supabase'))).toBe(true)
  })

  it('should suggest actions for degraded services', () => {
    const results: HealthCheckResult[] = [
      { service: 'api', status: 'degraded', lastChecked: new Date(), latencyMs: 6000 },
    ]

    const actions = getSuggestedActions(results)
    expect(actions.some((a) => a.includes('latency'))).toBe(true)
  })

  it('should return empty array for healthy services', () => {
    const results: HealthCheckResult[] = [
      { service: 'database', status: 'healthy', lastChecked: new Date() },
    ]

    const actions = getSuggestedActions(results)
    expect(actions).toHaveLength(0)
  })

  it('should deduplicate actions', () => {
    const results: HealthCheckResult[] = [
      { service: 'database', status: 'down', lastChecked: new Date() },
      { service: 'auth', status: 'down', lastChecked: new Date() },
    ]

    const actions = getSuggestedActions(results)
    const uniqueActions = [...new Set(actions)]
    expect(actions.length).toBe(uniqueActions.length)
  })
})
