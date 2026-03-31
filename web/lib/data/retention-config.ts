/**
 * Data Retention Policy Configuration
 *
 * DATA-005: Define retention policies for all data tables to ensure:
 * - Compliance with legal requirements (medical records, invoices)
 * - Storage cost optimization
 * - Privacy protection (GDPR-style deletion)
 *
 * Retention periods are based on:
 * - Legal requirements (Paraguay regulations)
 * - Business needs
 * - Privacy best practices
 */

export type RetentionAction = 'delete' | 'archive' | 'soft_delete'

export interface RetentionPolicy {
  /** Database table name */
  table: string
  /** Human-readable description */
  description: string
  /** Retention period in SQL interval format */
  retentionPeriod: string
  /** Action to take when records exceed retention */
  action: RetentionAction
  /** SQL condition to identify records for retention */
  dateColumn: string
  /** Additional WHERE clause condition */
  condition?: string
  /** Whether this policy is active */
  enabled: boolean
  /** Legal/compliance notes */
  legalNote?: string
  /** Priority for processing order (lower = first) */
  priority: number
}

/**
 * Data retention policies for the Vete platform.
 *
 * Categories:
 * 1. Short-term operational data (7-30 days)
 * 2. Medium-term transactional data (90 days - 1 year)
 * 3. Long-term compliance data (2-10 years)
 */
export const retentionPolicies: RetentionPolicy[] = [
  // ==========================================================================
  // SHORT-TERM: Temporary/Operational Data (7-30 days)
  // ==========================================================================
  {
    table: 'store_carts',
    description: 'Abandoned shopping carts',
    retentionPeriod: '7 days',
    action: 'delete',
    dateColumn: 'updated_at',
    condition: "items = '[]'::jsonb OR items IS NULL", // Only empty/abandoned carts
    enabled: true,
    priority: 10,
  },
  {
    table: 'store_stock_alerts',
    description: 'Stock notification requests that were fulfilled',
    retentionPeriod: '30 days',
    action: 'delete',
    dateColumn: 'created_at',
    condition: 'notified = true',
    enabled: true,
    priority: 10,
  },

  // ==========================================================================
  // MEDIUM-TERM: Notifications & Logs (30-90 days)
  // ==========================================================================
  {
    table: 'notifications',
    description: 'Read user notifications',
    retentionPeriod: '90 days',
    action: 'delete',
    dateColumn: 'created_at',
    condition: 'read_at IS NOT NULL',
    enabled: true,
    priority: 20,
  },
  {
    table: 'reminders',
    description: 'Processed reminders',
    retentionPeriod: '90 days',
    action: 'delete',
    dateColumn: 'scheduled_at',
    condition: "status IN ('sent', 'failed')",
    enabled: true,
    priority: 20,
  },
  {
    table: 'whatsapp_messages',
    description: 'Old WhatsApp message logs',
    retentionPeriod: '180 days',
    action: 'delete',
    dateColumn: 'created_at',
    enabled: true,
    priority: 25,
  },
  {
    table: 'lost_pet_sightings',
    description: 'Sightings for resolved lost pets',
    retentionPeriod: '180 days',
    action: 'delete',
    dateColumn: 'created_at',
    enabled: true,
    legalNote: 'Only delete if associated lost_pet is reunited',
    priority: 25,
  },

  // ==========================================================================
  // LONG-TERM: Audit & Compliance (1-2 years)
  // ==========================================================================
  {
    table: 'audit_logs',
    description: 'Security and action audit trail',
    retentionPeriod: '2 years',
    action: 'archive',
    dateColumn: 'created_at',
    enabled: true,
    legalNote: 'Required for security compliance and potential legal disputes',
    priority: 30,
  },

  // ==========================================================================
  // VERY LONG-TERM: Medical & Financial (5-10 years)
  // ==========================================================================
  {
    table: 'medical_records',
    description: 'Patient medical records',
    retentionPeriod: '10 years',
    action: 'archive',
    dateColumn: 'created_at',
    enabled: true,
    legalNote: 'Medical records must be retained for minimum 10 years per Paraguay health regulations',
    priority: 50,
  },
  {
    table: 'prescriptions',
    description: 'Prescription records',
    retentionPeriod: '10 years',
    action: 'archive',
    dateColumn: 'created_at',
    enabled: true,
    legalNote: 'Controlled substance prescriptions require extended retention',
    priority: 50,
  },
  {
    table: 'invoices',
    description: 'Financial invoices',
    retentionPeriod: '7 years',
    action: 'archive',
    dateColumn: 'created_at',
    enabled: true,
    legalNote: 'Tax and accounting compliance requires 7-year retention',
    priority: 50,
  },
  {
    table: 'payments',
    description: 'Payment transactions',
    retentionPeriod: '7 years',
    action: 'archive',
    dateColumn: 'payment_date',
    enabled: true,
    legalNote: 'Financial records for tax compliance',
    priority: 50,
  },
  {
    table: 'consent_documents',
    description: 'Signed consent records',
    retentionPeriod: '10 years',
    action: 'archive',
    dateColumn: 'signed_at',
    enabled: true,
    legalNote: 'Legal evidence of informed consent',
    priority: 50,
  },
  {
    table: 'insurance_claims',
    description: 'Insurance claim records',
    retentionPeriod: '7 years',
    action: 'archive',
    dateColumn: 'created_at',
    enabled: true,
    legalNote: 'Insurance dispute period and tax compliance',
    priority: 50,
  },
]

/**
 * Get active retention policies sorted by priority
 */
export function getActiveRetentionPolicies(): RetentionPolicy[] {
  return retentionPolicies
    .filter((p) => p.enabled)
    .sort((a, b) => a.priority - b.priority)
}

/**
 * Get retention policy for a specific table
 */
export function getRetentionPolicy(table: string): RetentionPolicy | undefined {
  return retentionPolicies.find((p) => p.table === table)
}

/**
 * Convert retention period string to PostgreSQL interval
 */
export function toPostgresInterval(period: string): string {
  return `'${period}'::interval`
}

/**
 * Tables that should NEVER have data deleted automatically
 * These require manual review before any deletion
 */
export const protectedTables = [
  'tenants',
  'profiles',
  'pets',
  'vaccines', // Core pet health data
  'appointments', // Historical record
  'hospitalizations', // Critical care history
  'lab_orders', // Diagnostic history
  'lab_results', // Diagnostic data
] as const

/**
 * Check if a table is protected from automatic retention
 */
export function isProtectedTable(table: string): boolean {
  return protectedTables.includes(table as (typeof protectedTables)[number])
}
