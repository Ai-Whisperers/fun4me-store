/**
 * Consent Preference Service
 *
 * COMP-003: Business logic for managing user consent preferences
 */

import { SupabaseClient } from '@supabase/supabase-js'
import {
  ConsentPreference,
  ConsentPreferenceAudit,
  ConsentStatus,
  ConsentAnalytics,
  ConsentType,
  ConsentSource,
  BulkConsentUpdateInput,
  CONSENT_TYPES,
  isValidConsentType,
} from './types'

/**
 * Database row type for consent_preferences
 */
interface ConsentPreferenceRow {
  id: string
  user_id: string
  tenant_id: string
  consent_type: string
  granted: boolean
  granted_at: string | null
  withdrawn_at: string | null
  source: string
  version: number
  created_at: string
  updated_at: string
}

/**
 * Database row type for consent_preference_audit
 */
interface ConsentPreferenceAuditRow {
  id: string
  preference_id: string
  user_id: string
  tenant_id: string
  consent_type: string
  old_value: boolean | null
  new_value: boolean
  source: string
  ip_address: string | null
  user_agent: string | null
  changed_at: string
}

/**
 * Convert database row to ConsentPreference
 */
function rowToPreference(row: ConsentPreferenceRow): ConsentPreference {
  return {
    id: row.id,
    userId: row.user_id,
    tenantId: row.tenant_id,
    consentType: row.consent_type as ConsentType,
    granted: row.granted,
    grantedAt: row.granted_at,
    withdrawnAt: row.withdrawn_at,
    source: row.source as ConsentSource,
    version: row.version,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

/**
 * Convert database row to ConsentPreferenceAudit
 */
function rowToAudit(row: ConsentPreferenceAuditRow): ConsentPreferenceAudit {
  return {
    id: row.id,
    preferenceId: row.preference_id,
    userId: row.user_id,
    tenantId: row.tenant_id,
    consentType: row.consent_type as ConsentType,
    oldValue: row.old_value,
    newValue: row.new_value,
    source: row.source as ConsentSource,
    ipAddress: row.ip_address,
    userAgent: row.user_agent,
    changedAt: row.changed_at,
  }
}

/**
 * Get all consent preferences for a user
 */
export async function getUserPreferences(
  supabase: SupabaseClient,
  userId: string,
  tenantId: string
): Promise<ConsentPreference[]> {
  const { data, error } = await supabase
    .from('consent_preferences')
    .select('*')
    .eq('user_id', userId)
    .eq('tenant_id', tenantId)
    .order('consent_type')

  if (error) {
    throw new Error(`Error al obtener preferencias: ${error.message}`)
  }

  return (data || []).map(rowToPreference)
}

/**
 * Get user consent status (preferences mapped by type)
 */
export async function getConsentStatus(
  supabase: SupabaseClient,
  userId: string,
  tenantId: string
): Promise<ConsentStatus> {
  const preferences = await getUserPreferences(supabase, userId, tenantId)

  const preferencesMap: Record<ConsentType, ConsentPreference | null> = {} as Record<
    ConsentType,
    ConsentPreference | null
  >

  // Initialize all types as null
  for (const type of Object.values(CONSENT_TYPES)) {
    preferencesMap[type] = null
  }

  // Fill in existing preferences
  let lastUpdated: string | null = null
  for (const pref of preferences) {
    preferencesMap[pref.consentType] = pref
    if (!lastUpdated || pref.updatedAt > lastUpdated) {
      lastUpdated = pref.updatedAt
    }
  }

  return {
    userId,
    tenantId,
    preferences: preferencesMap,
    lastUpdated,
  }
}

/**
 * Check if user has granted a specific consent
 */
export async function hasConsent(
  supabase: SupabaseClient,
  userId: string,
  tenantId: string,
  consentType: ConsentType
): Promise<boolean> {
  const { data, error } = await supabase
    .from('consent_preferences')
    .select('granted')
    .eq('user_id', userId)
    .eq('tenant_id', tenantId)
    .eq('consent_type', consentType)
    .single()

  if (error && error.code !== 'PGRST116') {
    // PGRST116 = no rows
    throw new Error(`Error al verificar consentimiento: ${error.message}`)
  }

  return data?.granted ?? false
}

/**
 * Get a single consent preference
 */
export async function getPreference(
  supabase: SupabaseClient,
  userId: string,
  tenantId: string,
  consentType: ConsentType
): Promise<ConsentPreference | null> {
  const { data, error } = await supabase
    .from('consent_preferences')
    .select('*')
    .eq('user_id', userId)
    .eq('tenant_id', tenantId)
    .eq('consent_type', consentType)
    .single()

  if (error && error.code !== 'PGRST116') {
    throw new Error(`Error al obtener preferencia: ${error.message}`)
  }

  return data ? rowToPreference(data) : null
}

/**
 * Set or update a consent preference
 */
export async function setPreference(
  supabase: SupabaseClient,
  userId: string,
  tenantId: string,
  consentType: ConsentType,
  granted: boolean,
  source: ConsentSource,
  ipAddress?: string,
  userAgent?: string
): Promise<ConsentPreference> {
  if (!isValidConsentType(consentType)) {
    throw new Error(`Tipo de consentimiento inválido: ${consentType}`)
  }

  // Check if preference exists
  const existing = await getPreference(supabase, userId, tenantId, consentType)

  if (existing) {
    // Update existing preference
    const updateData: Record<string, unknown> = {
      granted,
      source,
      version: existing.version + 1,
    }

    if (granted) {
      updateData.granted_at = new Date().toISOString()
      updateData.withdrawn_at = null
    } else {
      updateData.withdrawn_at = new Date().toISOString()
    }

    const { data, error } = await supabase
      .from('consent_preferences')
      .update(updateData)
      .eq('id', existing.id)
      .select()
      .single()

    if (error) {
      throw new Error(`Error al actualizar preferencia: ${error.message}`)
    }

    // Update audit log with IP and user agent (trigger only inserts basic data)
    if (ipAddress || userAgent) {
      await supabase
        .from('consent_preference_audit')
        .update({
          ip_address: ipAddress,
          user_agent: userAgent,
        })
        .eq('preference_id', data.id)
        .order('changed_at', { ascending: false })
        .limit(1)
    }

    return rowToPreference(data)
  } else {
    // Create new preference
    const insertData: Record<string, unknown> = {
      user_id: userId,
      tenant_id: tenantId,
      consent_type: consentType,
      granted,
      source,
      version: 1,
    }

    if (granted) {
      insertData.granted_at = new Date().toISOString()
    }

    const { data, error } = await supabase
      .from('consent_preferences')
      .insert(insertData)
      .select()
      .single()

    if (error) {
      throw new Error(`Error al crear preferencia: ${error.message}`)
    }

    // Update audit log with IP and user agent
    if (ipAddress || userAgent) {
      await supabase
        .from('consent_preference_audit')
        .update({
          ip_address: ipAddress,
          user_agent: userAgent,
        })
        .eq('preference_id', data.id)
        .order('changed_at', { ascending: false })
        .limit(1)
    }

    return rowToPreference(data)
  }
}

/**
 * Bulk update multiple consent preferences
 */
export async function bulkUpdatePreferences(
  supabase: SupabaseClient,
  userId: string,
  tenantId: string,
  input: BulkConsentUpdateInput,
  ipAddress?: string,
  userAgent?: string
): Promise<ConsentPreference[]> {
  const results: ConsentPreference[] = []

  for (const pref of input.preferences) {
    const result = await setPreference(
      supabase,
      userId,
      tenantId,
      pref.consentType,
      pref.granted,
      input.source,
      ipAddress,
      userAgent
    )
    results.push(result)
  }

  return results
}

/**
 * Withdraw a consent (set to false)
 */
export async function withdrawConsent(
  supabase: SupabaseClient,
  userId: string,
  tenantId: string,
  consentType: ConsentType,
  source: ConsentSource,
  ipAddress?: string,
  userAgent?: string
): Promise<ConsentPreference> {
  return setPreference(supabase, userId, tenantId, consentType, false, source, ipAddress, userAgent)
}

/**
 * Grant a consent (set to true)
 */
export async function grantConsent(
  supabase: SupabaseClient,
  userId: string,
  tenantId: string,
  consentType: ConsentType,
  source: ConsentSource,
  ipAddress?: string,
  userAgent?: string
): Promise<ConsentPreference> {
  return setPreference(supabase, userId, tenantId, consentType, true, source, ipAddress, userAgent)
}

/**
 * Get audit history for a user
 */
export async function getAuditHistory(
  supabase: SupabaseClient,
  userId: string,
  tenantId: string,
  options?: {
    consentType?: ConsentType
    limit?: number
    offset?: number
  }
): Promise<ConsentPreferenceAudit[]> {
  let query = supabase
    .from('consent_preference_audit')
    .select('*')
    .eq('user_id', userId)
    .eq('tenant_id', tenantId)
    .order('changed_at', { ascending: false })

  if (options?.consentType) {
    query = query.eq('consent_type', options.consentType)
  }

  if (options?.limit) {
    query = query.limit(options.limit)
  }

  if (options?.offset) {
    query = query.range(options.offset, options.offset + (options.limit || 10) - 1)
  }

  const { data, error } = await query

  if (error) {
    throw new Error(`Error al obtener historial: ${error.message}`)
  }

  return (data || []).map(rowToAudit)
}

/**
 * Get consent analytics for a tenant
 */
export async function getConsentAnalytics(
  supabase: SupabaseClient,
  tenantId: string
): Promise<ConsentAnalytics[]> {
  const { data, error } = await supabase.rpc('get_consent_analytics', {
    p_tenant_id: tenantId,
  })

  if (error) {
    throw new Error(`Error al obtener analíticas: ${error.message}`)
  }

  return (data || []).map(
    (row: {
      consent_type: string
      total_users: number
      granted_count: number
      withdrawn_count: number
      grant_rate: number
      changes_last_30_days: number
    }) => ({
      tenantId,
      consentType: row.consent_type as ConsentType,
      totalUsers: row.total_users,
      grantedCount: row.granted_count,
      withdrawnCount: row.withdrawn_count,
      neverSetCount: row.total_users - row.granted_count - row.withdrawn_count,
      grantRate: row.grant_rate,
      changesLast30Days: row.changes_last_30_days,
    })
  )
}

/**
 * Export consent data for a user (GDPR compliance)
 */
export async function exportUserConsentData(
  supabase: SupabaseClient,
  userId: string,
  tenantId: string
): Promise<{
  preferences: ConsentPreference[]
  auditHistory: ConsentPreferenceAudit[]
  exportedAt: string
}> {
  const [preferences, auditHistory] = await Promise.all([
    getUserPreferences(supabase, userId, tenantId),
    getAuditHistory(supabase, userId, tenantId),
  ])

  return {
    preferences,
    auditHistory,
    exportedAt: new Date().toISOString(),
  }
}

/**
 * Initialize default consent preferences for a new user
 */
export async function initializeUserPreferences(
  supabase: SupabaseClient,
  userId: string,
  tenantId: string,
  defaults?: Partial<Record<ConsentType, boolean>>
): Promise<ConsentPreference[]> {
  const results: ConsentPreference[] = []

  // Data processing is required by default
  const defaultPreferences: Partial<Record<ConsentType, boolean>> = {
    [CONSENT_TYPES.DATA_PROCESSING]: true,
    ...defaults,
  }

  for (const [type, granted] of Object.entries(defaultPreferences)) {
    if (isValidConsentType(type)) {
      const result = await setPreference(
        supabase,
        userId,
        tenantId,
        type,
        granted ?? false,
        'signup'
      )
      results.push(result)
    }
  }

  return results
}
