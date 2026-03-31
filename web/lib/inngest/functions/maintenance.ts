/**
 * Inngest Maintenance Functions
 *
 * Background jobs for system maintenance:
 * - Cleanup old exports
 * - Data retention policies
 * - Metrics capture
 * - Backup verification
 * - Health checks
 * - Process subscriptions
 * - Generate recurring appointments
 */

import { inngest } from '../client'
import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'

// =============================================================================
// CLEANUP EXPORTS
// =============================================================================

export const cleanupExports = inngest.createFunction(
  {
    id: 'maintenance-cleanup-exports',
    name: 'Cleanup Old Export Files',
    retries: 2,
  },
  { cron: '0 3 * * *' }, // Daily at 03:00 UTC
  async ({ step }) => {
    // Default: delete exports older than 7 days
    const maxAgeDays = 7

    const result = await step.run('cleanup-exports', async () => {
      const supabase = await createClient('service_role')
      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - maxAgeDays)

      // Delete old export records
      const { data: exports, error } = await supabase
        .from('data_exports')
        .delete()
        .lt('created_at', cutoffDate.toISOString())
        .select('id, file_path')

      if (error) {
        throw new Error(`Delete error: ${error.message}`)
      }

      // Delete associated storage files
      if (exports && exports.length > 0) {
        const filePaths = exports.map((e) => e.file_path).filter(Boolean)

        if (filePaths.length > 0) {
          const { error: storageError } = await supabase.storage
            .from('exports')
            .remove(filePaths)

          if (storageError) {
            logger.warn('Failed to delete some export files', {
              error: storageError.message,
            })
          }
        }
      }

      return { deleted: exports?.length || 0 }
    })

    logger.info('Export cleanup completed', result)
    return { success: true, ...result }
  }
)

// =============================================================================
// DATA RETENTION
// =============================================================================

export const dataRetention = inngest.createFunction(
  {
    id: 'maintenance-retention',
    name: 'Apply Data Retention Policies',
    retries: 1,
  },
  { cron: '0 2 * * 0' }, // Weekly on Sunday at 02:00 UTC
  async ({ step }) => {
    // Cron jobs always run for real (not dry run)
    const dryRun = false

    const result = await step.run('apply-retention', async () => {
      const supabase = await createClient('service_role')

      // Call database RPC for retention
      const { data, error } = await supabase.rpc('apply_data_retention_policies', {
        p_dry_run: dryRun,
      })

      if (error) {
        throw new Error(`Retention RPC error: ${error.message}`)
      }

      return data || { audit_logs_deleted: 0, notifications_deleted: 0, sessions_deleted: 0 }
    })

    logger.info('Data retention completed', { dryRun, ...result })
    return { success: true, dryRun, ...result }
  }
)

// =============================================================================
// CAPTURE METRICS
// =============================================================================

export const captureMetrics = inngest.createFunction(
  {
    id: 'maintenance-capture-metrics',
    name: 'Capture System Metrics',
    retries: 1,
  },
  { cron: '0 * * * *' }, // Every hour
  async ({ step }) => {
    const result = await step.run('capture-metrics', async () => {
      const supabase = await createClient('service_role')
      const timestamp = new Date().toISOString()

      // Capture various metrics
      const metrics: Record<string, number> = {}

      // Total tenants
      const { count: tenantCount } = await supabase
        .from('tenants')
        .select('*', { count: 'exact', head: true })
      metrics.total_tenants = tenantCount || 0

      // Active users (logged in last 24h)
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      const { count: activeUsers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .gt('last_sign_in_at', yesterday.toISOString())
      metrics.active_users_24h = activeUsers || 0

      // Appointments today
      const today = new Date().toISOString().split('T')[0]
      const { count: appointmentsToday } = await supabase
        .from('appointments')
        .select('*', { count: 'exact', head: true })
        .gte('start_time', `${today}T00:00:00`)
        .lt('start_time', `${today}T23:59:59`)
      metrics.appointments_today = appointmentsToday || 0

      // Store metrics
      await supabase.from('system_metrics').insert({
        timestamp,
        metrics,
      })

      return metrics
    })

    logger.info('Metrics captured', result)
    return { success: true, metrics: result }
  }
)

// =============================================================================
// VERIFY BACKUP
// =============================================================================

export const verifyBackup = inngest.createFunction(
  {
    id: 'maintenance-verify-backup',
    name: 'Verify Backup Integrity',
    retries: 1,
  },
  { cron: '0 4 * * *' }, // Daily at 04:00 UTC
  async ({ step }) => {
    const result = await step.run('verify-backup', async () => {
      const supabase = await createClient('service_role')

      // Check last backup record
      const { data: lastBackup, error } = await supabase
        .from('backup_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (error && error.code !== 'PGRST116') {
        // PGRST116 = no rows
        throw new Error(`Query error: ${error.message}`)
      }

      if (!lastBackup) {
        logger.warn('No backup records found')
        return { status: 'no_backups', lastBackup: null }
      }

      // Check if backup is recent (within 24h)
      const lastBackupDate = new Date(lastBackup.created_at)
      const hoursSinceBackup = (Date.now() - lastBackupDate.getTime()) / (1000 * 60 * 60)

      if (hoursSinceBackup > 24) {
        logger.error('Backup is stale', { hoursSinceBackup })
        return { status: 'stale', hoursSinceBackup, lastBackup: lastBackup.created_at }
      }

      return { status: 'ok', hoursSinceBackup, lastBackup: lastBackup.created_at }
    })

    return { success: result.status === 'ok', ...result }
  }
)

// =============================================================================
// HEALTH CHECK
// =============================================================================

export const healthCheck = inngest.createFunction(
  {
    id: 'maintenance-health-check',
    name: 'System Health Check',
    retries: 0, // Don't retry health checks
  },
  { cron: '*/5 * * * *' }, // Every 5 minutes
  async ({ step }) => {
    const result = await step.run('health-check', async () => {
      const checks: Record<string, { status: 'ok' | 'error'; latencyMs?: number; error?: string }> = {}

      // Database check
      try {
        const dbStart = Date.now()
        const supabase = await createClient('service_role')
        await supabase.from('tenants').select('id').limit(1)
        checks.database = { status: 'ok', latencyMs: Date.now() - dbStart }
      } catch (e: unknown) {
        checks.database = { status: 'error', error: e instanceof Error ? e.message : 'Unknown' }
      }

      // Storage check
      try {
        const storageStart = Date.now()
        const supabase = await createClient('service_role')
        await supabase.storage.from('pets').list('', { limit: 1 })
        checks.storage = { status: 'ok', latencyMs: Date.now() - storageStart }
      } catch (e: unknown) {
        checks.storage = { status: 'error', error: e instanceof Error ? e.message : 'Unknown' }
      }

      const allOk = Object.values(checks).every((c) => c.status === 'ok')

      return { healthy: allOk, checks }
    })

    if (!result.healthy) {
      logger.error('Health check failed', result)
    }

    return { success: result.healthy, ...result }
  }
)

// =============================================================================
// PROCESS SUBSCRIPTIONS
// =============================================================================

export const processSubscriptions = inngest.createFunction(
  {
    id: 'subscriptions-process',
    name: 'Process Subscription Renewals',
    retries: 2,
    concurrency: { limit: 1 },
  },
  { cron: '0 0 * * *' }, // Daily at midnight UTC
  async ({ step }) => {
    // For cron jobs, process all subscriptions
    const subscriptionId: string | undefined = undefined

    const result = await step.run('process-subscriptions', async () => {
      const supabase = await createClient('service_role')
      const today = new Date().toISOString().split('T')[0]

      // Get subscriptions due for renewal
      let query = supabase
        .from('subscriptions')
        .select('*')
        .eq('status', 'active')
        .lte('next_billing_date', today)
        .limit(100)

      if (subscriptionId) {
        query = query.eq('id', subscriptionId)
      }

      const { data: subscriptions, error } = await query

      if (error) {
        throw new Error(`Query error: ${error.message}`)
      }

      if (!subscriptions || subscriptions.length === 0) {
        return { processed: 0, renewed: 0, failed: 0 }
      }

      let renewed = 0
      let failed = 0

      for (const subscription of subscriptions) {
        try {
          // Calculate next billing date
          const nextDate = new Date(subscription.next_billing_date)
          nextDate.setMonth(nextDate.getMonth() + 1)

          // Update subscription
          await supabase
            .from('subscriptions')
            .update({
              next_billing_date: nextDate.toISOString().split('T')[0],
              last_billed_at: new Date().toISOString(),
            })
            .eq('id', subscription.id)

          renewed++
        } catch (e: unknown) {
          logger.error('Subscription renewal failed', {
            subscriptionId: subscription.id,
            error: e instanceof Error ? e.message : 'Unknown',
          })
          failed++
        }
      }

      return { processed: subscriptions.length, renewed, failed }
    })

    logger.info('Subscriptions processed', result)
    return { success: result.failed === 0, ...result }
  }
)

// =============================================================================
// GENERATE RECURRING APPOINTMENTS
// =============================================================================

export const generateRecurringAppointments = inngest.createFunction(
  {
    id: 'appointments-generate-recurring',
    name: 'Generate Recurring Appointments',
    retries: 2,
  },
  { cron: '0 5 * * *' }, // Daily at 05:00 UTC
  async ({ step }) => {
    // Generate appointments for next 30 days
    const daysAhead = 30

    const result = await step.run('generate-recurring', async () => {
      const supabase = await createClient('service_role')

      // Call RPC to generate recurring appointments
      const { data, error } = await supabase.rpc('generate_recurring_appointments', {
        p_days_ahead: daysAhead,
      })

      if (error) {
        throw new Error(`RPC error: ${error.message}`)
      }

      return { appointmentsCreated: data || 0 }
    })

    logger.info('Recurring appointments generated', result)
    return { success: true, ...result }
  }
)
