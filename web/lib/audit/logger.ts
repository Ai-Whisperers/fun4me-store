/**
 * Audit Logging Utilities
 *
 * Provides functions for logging user actions and system events.
 * Audit logs are stored in the `audit_logs` table for compliance
 * and debugging purposes.
 */

import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'

export type AuditAction =
  | 'CREATE'
  | 'UPDATE'
  | 'DELETE'
  | 'VIEW'
  | 'LOGIN'
  | 'LOGOUT'
  | 'DISCHARGE_PATIENT'
  | 'ADMIT_PATIENT'
  | 'GENERATE_INVOICE'
  | 'PROCESS_PAYMENT'
  | 'DISPENSE_MEDICATION'
  | 'APPROVE_ORDER'
  | 'REJECT_ORDER'

export interface AuditDetails {
  [key: string]: unknown
}

/**
 * Logs an audit event to the database.
 *
 * @param action - The type of action being logged
 * @param resource - The resource being acted upon (e.g., "hospitalizations/123")
 * @param details - Additional details about the action
 */
export async function logAudit(
  action: AuditAction | string,
  resource: string,
  details: AuditDetails = {}
): Promise<void> {
  try {
    const supabase = await createClient()

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      logger.warn('[Audit] No user context for audit log')
      return
    }

    // Get user's tenant
    const { data: profile } = await supabase
      .from('profiles')
      .select('tenant_id')
      .eq('id', user.id)
      .single()

    if (!profile) {
      logger.warn('[Audit] No profile found for user')
      return
    }

    // Insert audit log
    const { error } = await supabase.from('audit_logs').insert({
      tenant_id: profile.tenant_id,
      user_id: user.id,
      action,
      resource,
      details,
      created_at: new Date().toISOString(),
    })

    if (error) {
      logger.error('[Audit] Failed to insert audit log', { error: error.message })
    }
  } catch (error: unknown) {
    // Don't throw - audit logging should never break the main flow
    logger.error('[Audit] Error logging audit event', {
      error: error instanceof Error ? error.message : String(error),
    })
  }
}

/**
 * Logs an audit event with explicit tenant and user IDs.
 * Use this when you already have the context and want to avoid extra DB calls.
 *
 * @param tenantId - The tenant ID
 * @param userId - The user ID
 * @param action - The type of action being logged
 * @param resource - The resource being acted upon
 * @param details - Additional details about the action
 */
export async function logAuditWithContext(
  tenantId: string,
  userId: string,
  action: AuditAction | string,
  resource: string,
  details: AuditDetails = {}
): Promise<void> {
  try {
    const supabase = await createClient()

    const { error } = await supabase.from('audit_logs').insert({
      tenant_id: tenantId,
      user_id: userId,
      action,
      resource,
      details,
      created_at: new Date().toISOString(),
    })

    if (error) {
      logger.error('[Audit] Failed to insert audit log', { error: error.message })
    }
  } catch (error: unknown) {
    logger.error('[Audit] Error logging audit event', {
      error: error instanceof Error ? error.message : String(error),
    })
  }
}
