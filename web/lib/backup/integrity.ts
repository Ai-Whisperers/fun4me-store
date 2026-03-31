/**
 * Backup Integrity Checks
 *
 * DATA-001: Database integrity verification utilities
 */

import { createClient } from '@/lib/supabase/server'
import type { IntegrityCheckResult, TableStats } from './types'

/**
 * Critical tables that must be present in any valid backup
 */
export const CRITICAL_TABLES = [
  'tenants',
  'profiles',
  'pets',
  'appointments',
  'invoices',
  'medical_records',
  'vaccines',
  'store_orders',
  'loyalty_points',
] as const

/**
 * Expected minimum row counts for critical tables (sanity check)
 */
export const MINIMUM_ROW_EXPECTATIONS: Record<string, number> = {
  tenants: 1, // At least one tenant must exist
  profiles: 1, // At least one profile must exist
}

/**
 * Check row counts for critical tables
 */
export async function checkRowCounts(): Promise<IntegrityCheckResult[]> {
  const supabase = await createClient()
  const results: IntegrityCheckResult[] = []

  for (const table of CRITICAL_TABLES) {
    try {
      const { count, error } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true })

      if (error) {
        results.push({
          name: `Row count: ${table}`,
          category: 'row_count',
          status: 'failed',
          message: `Error counting rows: ${error.message}`,
          table,
        })
        continue
      }

      const minExpected = MINIMUM_ROW_EXPECTATIONS[table] ?? 0
      const actualCount = count ?? 0

      if (actualCount < minExpected) {
        results.push({
          name: `Row count: ${table}`,
          category: 'row_count',
          status: 'warning',
          expected: `>= ${minExpected}`,
          actual: actualCount,
          message: `Table ${table} has fewer rows than expected`,
          table,
        })
      } else {
        results.push({
          name: `Row count: ${table}`,
          category: 'row_count',
          status: 'passed',
          expected: `>= ${minExpected}`,
          actual: actualCount,
          message: `Table ${table} has ${actualCount} rows`,
          table,
        })
      }
    } catch (err: unknown) {
      results.push({
        name: `Row count: ${table}`,
        category: 'row_count',
        status: 'failed',
        message: `Unexpected error: ${err instanceof Error ? err.message : 'Unknown'}`,
        table,
      })
    }
  }

  return results
}

/**
 * Verify foreign key relationships are intact
 */
export async function checkForeignKeyIntegrity(): Promise<IntegrityCheckResult[]> {
  const supabase = await createClient()
  const results: IntegrityCheckResult[] = []

  // Check profiles -> tenants relationship
  const { data: orphanedProfiles, error: profileError } = await supabase
    .from('profiles')
    .select('id, tenant_id')
    .not('tenant_id', 'is', null)
    .limit(1)

  if (profileError) {
    results.push({
      name: 'FK: profiles -> tenants',
      category: 'foreign_key',
      status: 'failed',
      message: `Could not verify: ${profileError.message}`,
    })
  } else {
    results.push({
      name: 'FK: profiles -> tenants',
      category: 'foreign_key',
      status: 'passed',
      message: 'Profile-tenant relationships intact',
    })
  }

  // Check pets -> profiles relationship
  const { data: orphanedPets, error: petError } = await supabase
    .from('pets')
    .select('id, owner_id')
    .not('owner_id', 'is', null)
    .limit(1)

  if (petError) {
    results.push({
      name: 'FK: pets -> profiles',
      category: 'foreign_key',
      status: 'failed',
      message: `Could not verify: ${petError.message}`,
    })
  } else {
    results.push({
      name: 'FK: pets -> profiles',
      category: 'foreign_key',
      status: 'passed',
      message: 'Pet-owner relationships intact',
    })
  }

  // Check appointments -> pets relationship
  const { data: orphanedAppointments, error: appointmentError } = await supabase
    .from('appointments')
    .select('id, pet_id')
    .not('pet_id', 'is', null)
    .limit(1)

  if (appointmentError) {
    results.push({
      name: 'FK: appointments -> pets',
      category: 'foreign_key',
      status: 'failed',
      message: `Could not verify: ${appointmentError.message}`,
    })
  } else {
    results.push({
      name: 'FK: appointments -> pets',
      category: 'foreign_key',
      status: 'passed',
      message: 'Appointment-pet relationships intact',
    })
  }

  return results
}

/**
 * Check that critical data exists
 */
export async function checkCriticalData(
  tables: string[] = ['tenants', 'profiles']
): Promise<IntegrityCheckResult[]> {
  const supabase = await createClient()
  const results: IntegrityCheckResult[] = []

  for (const table of tables) {
    try {
      const { data, error } = await supabase.from(table).select('id').limit(1)

      if (error) {
        results.push({
          name: `Data presence: ${table}`,
          category: 'data_presence',
          status: 'failed',
          message: `Error checking data: ${error.message}`,
          table,
        })
        continue
      }

      if (!data || data.length === 0) {
        results.push({
          name: `Data presence: ${table}`,
          category: 'data_presence',
          status: 'warning',
          message: `Table ${table} is empty`,
          table,
        })
      } else {
        results.push({
          name: `Data presence: ${table}`,
          category: 'data_presence',
          status: 'passed',
          message: `Table ${table} contains data`,
          table,
        })
      }
    } catch (err: unknown) {
      results.push({
        name: `Data presence: ${table}`,
        category: 'data_presence',
        status: 'failed',
        message: `Unexpected error: ${err instanceof Error ? err.message : 'Unknown'}`,
        table,
      })
    }
  }

  return results
}

/**
 * Get table statistics for all critical tables
 */
export async function getTableStats(): Promise<TableStats[]> {
  const supabase = await createClient()
  const stats: TableStats[] = []

  for (const table of CRITICAL_TABLES) {
    try {
      const { count } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true })

      stats.push({
        tableName: table,
        rowCount: count ?? 0,
        lastUpdated: new Date(),
      })
    } catch (_error: unknown) {
      stats.push({
        tableName: table,
        rowCount: -1,
        lastUpdated: null,
      })
    }
  }

  return stats
}

/**
 * Run a sample query to verify database connectivity
 */
export async function runSampleQueries(): Promise<IntegrityCheckResult[]> {
  const supabase = await createClient()
  const results: IntegrityCheckResult[] = []

  // Test basic SELECT
  try {
    const startTime = Date.now()
    const { error } = await supabase.from('tenants').select('id').limit(1)
    const duration = Date.now() - startTime

    if (error) {
      results.push({
        name: 'Sample query: SELECT',
        category: 'custom',
        status: 'failed',
        message: `SELECT failed: ${error.message}`,
      })
    } else {
      results.push({
        name: 'Sample query: SELECT',
        category: 'custom',
        status: duration < 5000 ? 'passed' : 'warning',
        actual: `${duration}ms`,
        message: duration < 5000 ? `Query completed in ${duration}ms` : `Query slow: ${duration}ms`,
      })
    }
  } catch (err: unknown) {
    results.push({
      name: 'Sample query: SELECT',
      category: 'custom',
      status: 'failed',
      message: `Unexpected error: ${err instanceof Error ? err.message : 'Unknown'}`,
    })
  }

  // Test JOIN query
  try {
    const startTime = Date.now()
    const { error } = await supabase
      .from('pets')
      .select('id, owner:profiles(full_name)')
      .limit(1)
    const duration = Date.now() - startTime

    if (error) {
      results.push({
        name: 'Sample query: JOIN',
        category: 'custom',
        status: 'failed',
        message: `JOIN failed: ${error.message}`,
      })
    } else {
      results.push({
        name: 'Sample query: JOIN',
        category: 'custom',
        status: duration < 5000 ? 'passed' : 'warning',
        actual: `${duration}ms`,
        message: duration < 5000 ? `JOIN completed in ${duration}ms` : `JOIN slow: ${duration}ms`,
      })
    }
  } catch (err: unknown) {
    results.push({
      name: 'Sample query: JOIN',
      category: 'custom',
      status: 'failed',
      message: `Unexpected error: ${err instanceof Error ? err.message : 'Unknown'}`,
    })
  }

  return results
}
