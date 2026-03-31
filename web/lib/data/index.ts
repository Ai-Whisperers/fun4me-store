/**
 * Data Management Module
 *
 * DATA-005: Data retention, archival, and lifecycle management.
 */

// Retention configuration
export {
  retentionPolicies,
  getActiveRetentionPolicies,
  getRetentionPolicy,
  toPostgresInterval,
  protectedTables,
  isProtectedTable,
  type RetentionPolicy,
  type RetentionAction,
} from './retention-config'

// Retention job execution
export {
  runRetentionJob,
  getRetentionStats,
  type RetentionJobOptions,
  type RetentionResult,
  type RetentionJobSummary,
} from './retention-job'
