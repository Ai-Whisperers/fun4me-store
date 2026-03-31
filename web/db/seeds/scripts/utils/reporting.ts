/**
 * Reporting Utility for Seed System
 *
 * Provides structured reporting of seed operations with clear summaries.
 */

/**
 * Result of seeding a single table
 */
export interface SeederResult {
  table: string
  created: number
  skipped: number
  errors: number
  errorDetails: string[]
  warnings: string[]
  duration: number
}

/**
 * Complete seed report
 */
export interface SeedReport {
  variant: string
  tenants: string[]
  mode: 'test' | 'seed'
  startTime: Date
  endTime: Date
  duration: number
  results: SeederResult[]
  summary: {
    totalTables: number
    totalCreated: number
    totalSkipped: number
    totalErrors: number
    successRate: number
  }
}

/**
 * Create a seeder result
 */
export function createSeederResult(
  table: string,
  created: number,
  skipped: number,
  errors: Array<{ error: Error }>,
  warnings: string[] = [],
  startTime?: Date
): SeederResult {
  return {
    table,
    created,
    skipped,
    errors: errors.length,
    errorDetails: errors.map((e) => e.error.message).slice(0, 5),
    warnings,
    duration: startTime ? Date.now() - startTime.getTime() : 0,
  }
}

/**
 * Create a complete seed report
 */
export function createReport(
  variant: string,
  tenants: string[],
  mode: 'test' | 'seed',
  results: SeederResult[],
  startTime: Date
): SeedReport {
  const endTime = new Date()
  const totalCreated = results.reduce((sum, r) => sum + r.created, 0)
  const totalSkipped = results.reduce((sum, r) => sum + r.skipped, 0)
  const totalErrors = results.reduce((sum, r) => sum + r.errors, 0)
  const totalAttempted = totalCreated + totalSkipped + totalErrors

  return {
    variant,
    tenants,
    mode,
    startTime,
    endTime,
    duration: endTime.getTime() - startTime.getTime(),
    results,
    summary: {
      totalTables: results.length,
      totalCreated,
      totalSkipped,
      totalErrors,
      successRate:
        totalAttempted > 0
          ? Math.round(((totalCreated + totalSkipped) / totalAttempted) * 100)
          : 100,
    },
  }
}

/**
 * Print seed report to console
 */
export function printReport(report: SeedReport): void {
  const line = '═'.repeat(60)
  const thinLine = '─'.repeat(40)

  console.log(`\n${line}`)
  console.log(`  SEED REPORT: ${report.variant.toUpperCase()}`)
  console.log(`  Mode: ${report.mode} | Tenants: ${report.tenants.join(', ')}`)
  console.log(`${line}\n`)

  // Table results
  for (const result of report.results) {
    const status = result.errors > 0 ? '⚠️' : result.created > 0 ? '✅' : '⏭️'

    const skipInfo = result.skipped > 0 ? ` (${result.skipped} skipped)` : ''
    const errorInfo = result.errors > 0 ? ` [${result.errors} errors]` : ''

    console.log(`  ${status} ${result.table}: ${result.created} created${skipInfo}${errorInfo}`)

    // Show error details
    if (result.errorDetails.length > 0) {
      for (const detail of result.errorDetails.slice(0, 3)) {
        console.log(`      ❌ ${detail}`)
      }
      if (result.errorDetails.length > 3) {
        console.log(`      ... and ${result.errorDetails.length - 3} more errors`)
      }
    }

    // Show warnings
    if (result.warnings.length > 0) {
      for (const warning of result.warnings) {
        console.log(`      ⚠️ ${warning}`)
      }
    }
  }

  // Summary
  console.log(`\n  ${thinLine}`)
  console.log(`  SUMMARY:`)
  console.log(`    Tables seeded:  ${report.summary.totalTables}`)
  console.log(`    Records created: ${report.summary.totalCreated}`)
  console.log(`    Records skipped: ${report.summary.totalSkipped}`)
  console.log(`    Errors:          ${report.summary.totalErrors}`)
  console.log(`    Success rate:    ${report.summary.successRate}%`)
  console.log(`    Duration:        ${formatDuration(report.duration)}`)
  console.log(`${line}\n`)

  // Final status
  if (report.summary.totalErrors > 0) {
    console.log(`⚠️  Completed with ${report.summary.totalErrors} errors\n`)
  } else if (report.summary.totalCreated === 0 && report.summary.totalSkipped > 0) {
    console.log(`✅ All records already exist (idempotent)\n`)
  } else {
    console.log(`✅ Seed completed successfully\n`)
  }
}

/**
 * Format duration in human-readable format
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) {
    return `${ms}ms`
  }
  const seconds = Math.floor(ms / 1000)
  const minutes = Math.floor(seconds / 60)

  if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`
  }
  return `${seconds}s`
}

/**
 * Print a progress indicator
 */
export function printProgress(current: number, total: number, label: string): void {
  const percent = Math.round((current / total) * 100)
  const bar = '█'.repeat(Math.floor(percent / 5)) + '░'.repeat(20 - Math.floor(percent / 5))
  process.stdout.write(`\r  [${bar}] ${percent}% - ${label}`)
}

/**
 * Clear the progress line
 */
export function clearProgress(): void {
  process.stdout.write('\r' + ' '.repeat(80) + '\r')
}

/**
 * Create a simple logger for seeding operations
 */
export function createLogger(verbose: boolean = false) {
  return {
    info: (message: string) => console.log(`  ℹ️  ${message}`),
    success: (message: string) => console.log(`  ✅ ${message}`),
    warning: (message: string) => console.log(`  ⚠️  ${message}`),
    error: (message: string) => console.error(`  ❌ ${message}`),
    debug: (message: string) => {
      if (verbose) {
        console.log(`  🔍 ${message}`)
      }
    },
    table: (data: Record<string, unknown>[]) => {
      if (verbose && data.length > 0) {
        console.table(data.slice(0, 10))
      }
    },
  }
}

/**
 * Export report as JSON
 */
export function exportReportAsJson(report: SeedReport): string {
  return JSON.stringify(report, null, 2)
}

/**
 * Get summary line for quick display
 */
export function getSummaryLine(report: SeedReport): string {
  const { totalCreated, totalSkipped, totalErrors } = report.summary
  const status = totalErrors > 0 ? '⚠️' : '✅'
  return `${status} ${report.variant}: ${totalCreated} created, ${totalSkipped} skipped, ${totalErrors} errors (${formatDuration(report.duration)})`
}
