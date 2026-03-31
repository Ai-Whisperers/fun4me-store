/**
 * Data Retention Statistics Endpoint
 *
 * GET /api/health/retention
 *
 * DATA-005: Returns statistics about data retention policies and estimated cleanup.
 * Protected by API key for internal monitoring access.
 */

import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/logger'
import { getActiveRetentionPolicies, protectedTables } from '@/lib/data/retention-config'
import { getRetentionStats } from '@/lib/data/retention-job'

export const dynamic = 'force-dynamic'

// Internal monitoring key (same as cron auth)
const MONITORING_KEY = process.env.CRON_SECRET

interface RetentionHealthResponse {
  policies: Array<{
    table: string
    description: string
    retentionPeriod: string
    action: string
    enabled: boolean
    legalNote?: string
  }>
  statistics: Array<{
    table: string
    retentionPeriod: string
    action: string
    estimatedRecords: number
    oldestRecord: string | null
  }>
  protectedTables: string[]
  timestamp: string
}

export async function GET(
  request: NextRequest
): Promise<NextResponse<RetentionHealthResponse | { error: string }>> {
  // Verify monitoring access
  const authHeader = request.headers.get('authorization')
  const providedKey = authHeader?.replace('Bearer ', '')

  if (!MONITORING_KEY) {
    logger.warn('Retention health endpoint called but CRON_SECRET not configured')
    return NextResponse.json({ error: 'Monitoring not configured' }, { status: 503 })
  }

  if (providedKey !== MONITORING_KEY) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  try {
    const policies = getActiveRetentionPolicies()
    const statistics = await getRetentionStats()

    const response: RetentionHealthResponse = {
      policies: policies.map((p) => ({
        table: p.table,
        description: p.description,
        retentionPeriod: p.retentionPeriod,
        action: p.action,
        enabled: p.enabled,
        legalNote: p.legalNote,
      })),
      statistics,
      protectedTables: [...protectedTables],
      timestamp: new Date().toISOString(),
    }

    logger.debug('Retention health check', {
      policyCount: policies.length,
      tablesWithData: statistics.filter((s) => s.estimatedRecords > 0).length,
    })

    return NextResponse.json(response)
  } catch (error) {
    logger.error('Failed to get retention stats', {
      error: error instanceof Error ? error.message : String(error),
    })

    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
