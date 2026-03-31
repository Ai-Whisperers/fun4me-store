/**
 * Migration Validator
 *
 * DATA-004: Pre-migration validation utilities
 */

import type {
  Migration,
  ValidationResult,
  ValidationWarning,
  ValidationError,
} from './migration-types'
import { DANGEROUS_PATTERNS, LOCK_PATTERNS } from './migration-types'

/**
 * Validate a migration before applying
 */
export function validateMigration(migration: Migration): ValidationResult {
  const warnings: ValidationWarning[] = []
  const errors: ValidationError[] = []

  // Check for dangerous patterns
  for (const { pattern, code, message } of DANGEROUS_PATTERNS) {
    if (pattern.test(migration.upSql)) {
      errors.push({
        code,
        message,
        fatal: code === 'DROP_DATABASE',
      })
    }
  }

  // Check for potential lock issues
  for (const { pattern, level, message } of LOCK_PATTERNS) {
    if (pattern.test(migration.upSql)) {
      warnings.push({
        code: `LOCK_${level.toUpperCase()}`,
        message,
      })
    }
  }

  // Check for missing transaction
  if (
    !migration.upSql.includes('BEGIN') &&
    !migration.upSql.includes('COMMIT') &&
    containsMultipleStatements(migration.upSql)
  ) {
    warnings.push({
      code: 'NO_TRANSACTION',
      message: 'Multiple statements without explicit transaction',
    })
  }

  // Check for missing down migration
  if (!migration.downSql) {
    warnings.push({
      code: 'NO_ROLLBACK',
      message: 'No rollback/down migration defined',
    })
  }

  // Check for empty migration
  if (!migration.upSql.trim()) {
    errors.push({
      code: 'EMPTY_MIGRATION',
      message: 'Migration SQL is empty',
      fatal: true,
    })
  }

  // Validate SQL syntax (basic check)
  const syntaxErrors = checkBasicSyntax(migration.upSql)
  errors.push(...syntaxErrors)

  return {
    valid: errors.filter((e) => e.fatal).length === 0,
    warnings,
    errors,
  }
}

/**
 * Check if SQL contains multiple statements
 */
function containsMultipleStatements(sql: string): boolean {
  // Remove comments and strings, then count semicolons
  const cleaned = sql
    .replace(/--.*$/gm, '') // Remove single-line comments
    .replace(/\/\*[\s\S]*?\*\//g, '') // Remove multi-line comments
    .replace(/'[^']*'/g, "''") // Normalize strings

  const statements = cleaned.split(';').filter((s) => s.trim())
  return statements.length > 1
}

/**
 * Basic SQL syntax validation
 */
function checkBasicSyntax(sql: string): ValidationError[] {
  const errors: ValidationError[] = []

  // Check for unclosed parentheses
  const openParens = (sql.match(/\(/g) || []).length
  const closeParens = (sql.match(/\)/g) || []).length
  if (openParens !== closeParens) {
    errors.push({
      code: 'UNBALANCED_PARENS',
      message: `Unbalanced parentheses: ${openParens} open, ${closeParens} close`,
      fatal: true,
    })
  }

  // Check for unclosed quotes
  const singleQuotes = (sql.match(/'/g) || []).length
  if (singleQuotes % 2 !== 0) {
    errors.push({
      code: 'UNCLOSED_QUOTE',
      message: 'Unclosed single quote',
      fatal: true,
    })
  }

  return errors
}

/**
 * Estimate potential lock time based on SQL patterns
 */
export function estimateLockRisk(
  sql: string
): 'low' | 'medium' | 'high' | 'critical' {
  let riskLevel = 0

  for (const { pattern, level } of LOCK_PATTERNS) {
    if (pattern.test(sql)) {
      const levelValue = level === 'high' ? 3 : level === 'medium' ? 2 : 1
      riskLevel = Math.max(riskLevel, levelValue)
    }
  }

  // Check for operations on large tables
  if (/tenants|profiles|pets|appointments|invoices/i.test(sql)) {
    riskLevel = Math.min(riskLevel + 1, 4)
  }

  const levels: Record<number, 'low' | 'medium' | 'high' | 'critical'> = {
    0: 'low',
    1: 'low',
    2: 'medium',
    3: 'high',
    4: 'critical',
  }

  return levels[riskLevel] || 'low'
}

/**
 * Format validation result for display
 */
export function formatValidationResult(result: ValidationResult): string {
  const lines: string[] = []

  if (result.valid) {
    lines.push('✅ Migration validation passed')
  } else {
    lines.push('❌ Migration validation failed')
  }

  if (result.errors.length > 0) {
    lines.push('')
    lines.push('Errors:')
    for (const error of result.errors) {
      const fatal = error.fatal ? ' (FATAL)' : ''
      lines.push(`  ❌ [${error.code}] ${error.message}${fatal}`)
    }
  }

  if (result.warnings.length > 0) {
    lines.push('')
    lines.push('Warnings:')
    for (const warning of result.warnings) {
      lines.push(`  ⚠️ [${warning.code}] ${warning.message}`)
    }
  }

  return lines.join('\n')
}

/**
 * Check if migration name follows convention
 */
export function validateMigrationName(filename: string): boolean {
  // Expected format: XXX_description.sql
  const pattern = /^\d{3}_[a-z][a-z0-9_]*\.sql$/
  return pattern.test(filename)
}

/**
 * Extract migration number from filename
 */
export function extractMigrationNumber(filename: string): number | null {
  const match = filename.match(/^(\d+)_/)
  return match ? parseInt(match[1], 10) : null
}

/**
 * Generate checksum for migration content
 */
export function generateChecksum(sql: string): string {
  // Simple hash for change detection
  let hash = 0
  const normalized = sql.replace(/\s+/g, ' ').trim()

  for (let i = 0; i < normalized.length; i++) {
    const char = normalized.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash = hash & hash // Convert to 32-bit integer
  }

  return Math.abs(hash).toString(16).padStart(8, '0')
}
