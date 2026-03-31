/**
 * Migration Runner
 *
 * DATA-004: Database migration execution utilities
 *
 * Note: This module provides utilities for migration execution.
 * For production use with Supabase, migrations should be applied
 * through Supabase CLI or Dashboard.
 */

import type {
  Migration,
  MigrationResult,
  MigrationOptions,
  RollbackOptions,
  MigrationStatus,
  MigrationRecord,
} from './migration-types'
import {
  validateMigration,
  formatValidationResult,
  extractMigrationNumber,
  generateChecksum,
} from './migration-validator'

/**
 * Parse migration file content to extract UP and DOWN sections
 */
export function parseMigrationFile(
  filename: string,
  content: string
): Migration {
  const id = extractMigrationNumber(filename) ?? 0
  const name = filename.replace(/^\d+_/, '').replace(/\.sql$/, '')

  // Try to extract DOWN section (marked by -- DOWN or -- ROLLBACK)
  const downMarker = /--\s*(DOWN|ROLLBACK)\s*\n/i
  const parts = content.split(downMarker)

  const upSql = parts[0].trim()
  const downSql = parts.length > 1 ? parts.slice(-1)[0].trim() : undefined

  return {
    id,
    name,
    filename,
    upSql,
    downSql,
    checksum: generateChecksum(upSql),
  }
}

/**
 * Run migrations with validation and error handling
 */
export async function runMigrations(
  migrations: Migration[],
  options: MigrationOptions = {},
  executor: (sql: string) => Promise<void>
): Promise<MigrationResult[]> {
  const { dryRun = false, verbose = false, force = false } = options
  const results: MigrationResult[] = []

  // Sort migrations by ID
  const sorted = [...migrations].sort((a, b) => a.id - b.id)

  // Filter to target if specified
  // Non-null assertion safe: conditional checks options.target exists
  /* eslint-disable @typescript-eslint/no-non-null-assertion */
  const toApply = options.target
    ? sorted.filter((m) => m.id <= options.target!)
    : sorted
  /* eslint-enable @typescript-eslint/no-non-null-assertion */

  for (const migration of toApply) {
    const startTime = Date.now()

    // Validate migration
    const validation = validateMigration(migration)

    if (verbose) {
      console.log(`\n📋 Migration ${migration.id}: ${migration.name}`)
      console.log(formatValidationResult(validation))
    }

    // Check for blocking errors
    if (!validation.valid && !force) {
      results.push({
        migration,
        status: 'failed',
        duration: Date.now() - startTime,
        error: `Validation failed: ${validation.errors.map((e) => e.message).join(', ')}`,
      })
      continue
    }

    // Check for warnings
    if (validation.warnings.length > 0 && !force && !dryRun) {
      if (verbose) {
        console.log('⚠️ Warnings detected. Use --force to proceed.')
      }
      results.push({
        migration,
        status: 'skipped',
        duration: Date.now() - startTime,
        error: `Skipped due to warnings: ${validation.warnings.map((w) => w.message).join(', ')}`,
      })
      continue
    }

    // Dry run - don't actually apply
    if (dryRun) {
      if (verbose) {
        console.log('🔍 Dry run - would apply:')
        console.log(migration.upSql.substring(0, 200) + '...')
      }
      results.push({
        migration,
        status: 'skipped',
        duration: Date.now() - startTime,
      })
      continue
    }

    // Apply migration
    try {
      await executor(migration.upSql)
      results.push({
        migration,
        status: 'applied',
        duration: Date.now() - startTime,
      })
      if (verbose) {
        console.log(`✅ Applied in ${Date.now() - startTime}ms`)
      }
    } catch (error: unknown) {
      results.push({
        migration,
        status: 'failed',
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : String(error),
      })
      if (verbose) {
        console.log(`❌ Failed: ${error}`)
      }
      // Stop on first failure
      break
    }
  }

  return results
}

/**
 * Rollback migrations
 */
export async function rollbackMigrations(
  migrations: Migration[],
  options: RollbackOptions = {},
  executor: (sql: string) => Promise<void>
): Promise<MigrationResult[]> {
  const { dryRun = false, verbose = false, steps = 1 } = options
  const results: MigrationResult[] = []

  // Sort migrations by ID descending for rollback
  const sorted = [...migrations].sort((a, b) => b.id - a.id)

  // Determine which migrations to rollback
  let toRollback: Migration[]
  if (options.target !== undefined) {
    // Non-null assertion safe: conditional checks target is defined
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    toRollback = sorted.filter((m) => m.id > options.target!)
  } else {
    toRollback = sorted.slice(0, steps)
  }

  for (const migration of toRollback) {
    const startTime = Date.now()

    // Check for rollback SQL
    if (!migration.downSql) {
      if (verbose) {
        console.log(`⚠️ No rollback SQL for migration ${migration.id}: ${migration.name}`)
      }
      results.push({
        migration,
        status: 'skipped',
        duration: Date.now() - startTime,
        error: 'No rollback SQL defined',
      })
      continue
    }

    if (verbose) {
      console.log(`\n🔄 Rolling back ${migration.id}: ${migration.name}`)
    }

    // Dry run
    if (dryRun) {
      if (verbose) {
        console.log('🔍 Dry run - would execute:')
        console.log(migration.downSql.substring(0, 200) + '...')
      }
      results.push({
        migration,
        status: 'skipped',
        duration: Date.now() - startTime,
      })
      continue
    }

    // Execute rollback
    try {
      await executor(migration.downSql)
      results.push({
        migration,
        status: 'rolled_back',
        duration: Date.now() - startTime,
      })
      if (verbose) {
        console.log(`✅ Rolled back in ${Date.now() - startTime}ms`)
      }
    } catch (error: unknown) {
      results.push({
        migration,
        status: 'failed',
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : String(error),
      })
      if (verbose) {
        console.log(`❌ Rollback failed: ${error}`)
      }
      // Stop on first failure
      break
    }
  }

  return results
}

/**
 * Get migration status summary
 */
export function getMigrationStatus(
  allMigrations: Migration[],
  appliedRecords: MigrationRecord[]
): MigrationStatus {
  const appliedIds = new Set(appliedRecords.map((r) => r.id))
  const pending = allMigrations.filter((m) => !appliedIds.has(m.id))
  const current =
    appliedRecords.length > 0
      ? Math.max(...appliedRecords.map((r) => r.id))
      : null

  return {
    current,
    pending: pending.sort((a, b) => a.id - b.id),
    applied: appliedRecords.sort((a, b) => a.id - b.id),
    total: allMigrations.length,
  }
}

/**
 * Format migration status for display
 */
export function formatMigrationStatus(status: MigrationStatus): string {
  const lines: string[] = []

  lines.push('# Migration Status')
  lines.push('')
  lines.push(`Total migrations: ${status.total}`)
  lines.push(`Applied: ${status.applied.length}`)
  lines.push(`Pending: ${status.pending.length}`)
  lines.push(`Current version: ${status.current ?? 'none'}`)

  if (status.pending.length > 0) {
    lines.push('')
    lines.push('## Pending Migrations')
    for (const m of status.pending) {
      lines.push(`- [ ] ${m.id}: ${m.name}`)
    }
  }

  if (status.applied.length > 0) {
    lines.push('')
    lines.push('## Applied Migrations (last 10)')
    const recent = status.applied.slice(-10).reverse()
    for (const r of recent) {
      const date = r.applied_at.toISOString().split('T')[0]
      lines.push(`- [x] ${r.id}: ${r.name} (${date})`)
    }
  }

  return lines.join('\n')
}

/**
 * Format migration results for display
 */
export function formatMigrationResults(results: MigrationResult[]): string {
  const lines: string[] = []

  lines.push('# Migration Results')
  lines.push('')

  const applied = results.filter((r) => r.status === 'applied')
  const failed = results.filter((r) => r.status === 'failed')
  const skipped = results.filter((r) => r.status === 'skipped')
  const rolledBack = results.filter((r) => r.status === 'rolled_back')

  lines.push(`Applied: ${applied.length}`)
  lines.push(`Failed: ${failed.length}`)
  lines.push(`Skipped: ${skipped.length}`)
  lines.push(`Rolled back: ${rolledBack.length}`)
  lines.push('')

  const totalDuration = results.reduce((sum, r) => sum + r.duration, 0)
  lines.push(`Total time: ${totalDuration}ms`)
  lines.push('')

  for (const result of results) {
    const icon =
      result.status === 'applied'
        ? '✅'
        : result.status === 'failed'
          ? '❌'
          : result.status === 'rolled_back'
            ? '🔄'
            : '⏭️'

    lines.push(
      `${icon} ${result.migration.id}: ${result.migration.name} (${result.status}, ${result.duration}ms)`
    )
    if (result.error) {
      lines.push(`   Error: ${result.error}`)
    }
  }

  return lines.join('\n')
}
