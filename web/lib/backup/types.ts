/**
 * Backup Types
 *
 * DATA-001: Type definitions for backup infrastructure
 */

/**
 * Backup provider configuration
 */
export interface BackupConfig {
  provider: 'supabase' | 's3' | 'local'
  frequency: 'hourly' | 'daily' | 'weekly' | 'monthly'
  retention: {
    days: number
    months?: number
    years?: number
  }
  enabled: boolean
}

/**
 * Backup verification result
 */
export interface BackupVerificationResult {
  timestamp: Date
  status: 'success' | 'partial' | 'failed'
  checks: IntegrityCheckResult[]
  summary: {
    totalChecks: number
    passed: number
    failed: number
    warnings: number
  }
  duration: number // milliseconds
}

/**
 * Individual integrity check result
 */
export interface IntegrityCheckResult {
  name: string
  category: 'row_count' | 'foreign_key' | 'data_presence' | 'schema' | 'custom'
  status: 'passed' | 'failed' | 'warning'
  expected?: string | number
  actual?: string | number
  message: string
  table?: string
}

/**
 * Backup strategy configuration
 */
export interface BackupStrategy {
  primary: BackupConfig
  secondary?: BackupConfig
  pointInTimeRecovery: {
    enabled: boolean
    retentionDays: number
  }
  storage: BackupConfig
  rto: {
    target: number // hours
    actual?: number
    lastTested?: Date
  }
  rpo: {
    target: number // hours
    actual?: number
    lastTested?: Date
  }
}

/**
 * Backup status for monitoring
 */
export interface BackupStatus {
  lastBackup: Date | null
  nextScheduled: Date | null
  status: 'healthy' | 'degraded' | 'critical'
  lastVerification: BackupVerificationResult | null
  alerts: BackupAlert[]
}

/**
 * Backup alert
 */
export interface BackupAlert {
  id: string
  severity: 'info' | 'warning' | 'critical'
  message: string
  timestamp: Date
  acknowledged: boolean
}

/**
 * Table statistics for backup verification
 */
export interface TableStats {
  tableName: string
  rowCount: number
  lastUpdated: Date | null
  sizeBytes?: number
}

/**
 * Restoration test result
 */
export interface RestorationTestResult {
  timestamp: Date
  status: 'success' | 'failed'
  duration: number // minutes
  rtoAchieved: number // hours
  rpoAchieved: number // hours
  notes: string
  testedBy?: string
}
