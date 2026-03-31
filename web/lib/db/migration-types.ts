/**
 * Database Migration Types
 *
 * DATA-004: Type definitions for migration tooling
 */

/**
 * Migration file metadata
 */
export interface Migration {
  id: number
  name: string
  filename: string
  upSql: string
  downSql?: string
  checksum: string
  appliedAt?: Date
}

/**
 * Migration run result
 */
export interface MigrationResult {
  migration: Migration
  status: 'applied' | 'skipped' | 'failed' | 'rolled_back'
  duration: number
  error?: string
}

/**
 * Migration validation result
 */
export interface ValidationResult {
  valid: boolean
  warnings: ValidationWarning[]
  errors: ValidationError[]
}

export interface ValidationWarning {
  code: string
  message: string
  line?: number
}

export interface ValidationError {
  code: string
  message: string
  line?: number
  fatal: boolean
}

/**
 * Migration run options
 */
export interface MigrationOptions {
  target?: number // Target migration number
  dryRun?: boolean // Don't actually apply migrations
  verbose?: boolean // Detailed logging
  force?: boolean // Skip validation warnings
}

/**
 * Rollback options
 */
export interface RollbackOptions {
  steps?: number // Number of migrations to rollback
  target?: number // Rollback to specific migration
  dryRun?: boolean
  verbose?: boolean
}

/**
 * Migration history record (stored in database)
 */
export interface MigrationRecord {
  id: number
  name: string
  checksum: string
  applied_at: Date
  execution_time_ms: number
}

/**
 * Migration status summary
 */
export interface MigrationStatus {
  current: number | null
  pending: Migration[]
  applied: MigrationRecord[]
  total: number
}

/**
 * Dangerous SQL patterns to check
 */
export const DANGEROUS_PATTERNS = [
  { pattern: /DROP\s+TABLE(?!\s+IF\s+EXISTS)/i, code: 'DROP_WITHOUT_IF_EXISTS', message: 'DROP TABLE without IF EXISTS is dangerous' },
  { pattern: /DELETE\s+FROM\s+\w+(?!\s+WHERE)/i, code: 'DELETE_WITHOUT_WHERE', message: 'DELETE without WHERE clause' },
  { pattern: /UPDATE\s+\w+\s+SET(?!.*WHERE)/i, code: 'UPDATE_WITHOUT_WHERE', message: 'UPDATE without WHERE clause' },
  { pattern: /TRUNCATE\s+TABLE/i, code: 'TRUNCATE', message: 'TRUNCATE TABLE is not reversible' },
  { pattern: /DROP\s+DATABASE/i, code: 'DROP_DATABASE', message: 'DROP DATABASE is extremely dangerous' },
  { pattern: /ALTER\s+TABLE.*DROP\s+COLUMN(?!\s+IF\s+EXISTS)/i, code: 'DROP_COLUMN_WITHOUT_IF_EXISTS', message: 'DROP COLUMN without IF EXISTS' },
] as const

/**
 * SQL patterns that might cause long locks
 */
export const LOCK_PATTERNS = [
  { pattern: /ADD\s+COLUMN.*NOT\s+NULL(?!\s+DEFAULT)/i, level: 'high', message: 'Adding NOT NULL column without DEFAULT requires table lock' },
  { pattern: /ALTER\s+TABLE.*ALTER\s+COLUMN.*TYPE/i, level: 'medium', message: 'Changing column type may lock table' },
  { pattern: /CREATE\s+INDEX(?!\s+CONCURRENTLY)/i, level: 'medium', message: 'Consider CREATE INDEX CONCURRENTLY for large tables' },
  { pattern: /DROP\s+INDEX(?!\s+CONCURRENTLY)/i, level: 'low', message: 'Consider DROP INDEX CONCURRENTLY' },
] as const
