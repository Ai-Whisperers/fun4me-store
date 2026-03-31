/**
 * Disaster Recovery Health Checks
 *
 * DATA-003: Service health verification utilities
 */

import type { HealthCheckResult } from './types'

/**
 * Critical services to check during incident response
 */
export const CRITICAL_SERVICES = [
  'database',
  'auth',
  'api',
  'storage',
  'cron',
] as const

/**
 * Non-critical services that can degrade gracefully
 */
export const NON_CRITICAL_SERVICES = [
  'email',
  'whatsapp',
  'rate-limiting',
] as const

type CriticalService = (typeof CRITICAL_SERVICES)[number]
type NonCriticalService = (typeof NON_CRITICAL_SERVICES)[number]
type ServiceName = CriticalService | NonCriticalService

/**
 * Check if all critical services are healthy
 */
export function areAllCriticalServicesHealthy(
  results: HealthCheckResult[]
): boolean {
  const criticalResults = results.filter((r) =>
    CRITICAL_SERVICES.includes(r.service as CriticalService)
  )

  return criticalResults.every((r) => r.status === 'healthy')
}

/**
 * Get services by status
 */
export function getServicesByStatus(
  results: HealthCheckResult[],
  status: HealthCheckResult['status']
): HealthCheckResult[] {
  return results.filter((r) => r.status === status)
}

/**
 * Determine overall system status from health checks
 */
export function determineOverallStatus(
  results: HealthCheckResult[]
): 'operational' | 'degraded' | 'partial_outage' | 'major_outage' {
  const criticalDown = results.filter(
    (r) =>
      CRITICAL_SERVICES.includes(r.service as CriticalService) &&
      r.status === 'down'
  )

  const criticalDegraded = results.filter(
    (r) =>
      CRITICAL_SERVICES.includes(r.service as CriticalService) &&
      r.status === 'degraded'
  )

  const nonCriticalDown = results.filter(
    (r) =>
      NON_CRITICAL_SERVICES.includes(r.service as NonCriticalService) &&
      r.status === 'down'
  )

  // All critical services down = major outage
  if (criticalDown.length >= 2) {
    return 'major_outage'
  }

  // Any critical service down = partial outage
  if (criticalDown.length > 0) {
    return 'partial_outage'
  }

  // Critical services degraded or non-critical down = degraded
  if (criticalDegraded.length > 0 || nonCriticalDown.length > 0) {
    return 'degraded'
  }

  return 'operational'
}

/**
 * Format health check results for display
 */
export function formatHealthCheckResults(
  results: HealthCheckResult[]
): string {
  const lines: string[] = ['# Health Check Results', '']

  const statusIcons: Record<HealthCheckResult['status'], string> = {
    healthy: '✅',
    degraded: '⚠️',
    down: '❌',
    unknown: '❓',
  }

  // Critical services first
  lines.push('## Critical Services')
  for (const service of CRITICAL_SERVICES) {
    const result = results.find((r) => r.service === service)
    if (result) {
      const icon = statusIcons[result.status]
      const latency = result.latencyMs ? ` (${result.latencyMs}ms)` : ''
      lines.push(`- ${icon} ${service}: ${result.status}${latency}`)
    } else {
      lines.push(`- ❓ ${service}: not checked`)
    }
  }
  lines.push('')

  // Non-critical services
  lines.push('## Non-Critical Services')
  for (const service of NON_CRITICAL_SERVICES) {
    const result = results.find((r) => r.service === service)
    if (result) {
      const icon = statusIcons[result.status]
      const latency = result.latencyMs ? ` (${result.latencyMs}ms)` : ''
      lines.push(`- ${icon} ${service}: ${result.status}${latency}`)
    } else {
      lines.push(`- ❓ ${service}: not checked`)
    }
  }
  lines.push('')

  // Overall status
  const overall = determineOverallStatus(results)
  const overallIcon: Record<typeof overall, string> = {
    operational: '✅',
    degraded: '⚠️',
    partial_outage: '🟠',
    major_outage: '❌',
  }

  lines.push(`## Overall Status: ${overallIcon[overall]} ${overall.toUpperCase()}`)

  return lines.join('\n')
}

/**
 * Create a health check result
 */
export function createHealthCheckResult(
  service: ServiceName,
  status: HealthCheckResult['status'],
  options?: {
    latencyMs?: number
    details?: string
  }
): HealthCheckResult {
  return {
    service,
    status,
    latencyMs: options?.latencyMs,
    lastChecked: new Date(),
    details: options?.details,
  }
}

/**
 * Get suggested actions based on health check results
 */
export function getSuggestedActions(
  results: HealthCheckResult[]
): string[] {
  const actions: string[] = []

  for (const result of results) {
    if (result.status === 'down') {
      switch (result.service) {
        case 'database':
          actions.push('Check Supabase status page')
          actions.push('Review database connection settings')
          actions.push('Consider initiating PITR if corruption detected')
          break
        case 'auth':
          actions.push('Verify Supabase Auth service status')
          actions.push('Check auth configuration')
          break
        case 'api':
          actions.push('Check Vercel deployment status')
          actions.push('Review recent deployments')
          actions.push('Consider rollback if recent deploy')
          break
        case 'storage':
          actions.push('Check Supabase Storage status')
          actions.push('Verify storage bucket configuration')
          break
        case 'email':
          actions.push('Check Resend service status')
          actions.push('Verify API key')
          break
        case 'whatsapp':
          actions.push('Check WhatsApp Business API status')
          actions.push('Verify API credentials')
          break
      }
    } else if (result.status === 'degraded') {
      if (result.latencyMs && result.latencyMs > 5000) {
        actions.push(`Investigate high latency on ${result.service}`)
      }
    }
  }

  // Deduplicate
  return [...new Set(actions)]
}
