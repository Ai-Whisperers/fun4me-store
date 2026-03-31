/**
 * Privacy Policy Service
 *
 * COMP-002: Business logic for privacy policy management
 */

import { createClient } from '@/lib/supabase/server'
import type {
  PrivacyPolicy,
  PrivacyAcceptance,
  CreatePrivacyPolicyInput,
  UpdatePrivacyPolicyInput,
  AcceptPolicyInput,
  AcceptanceStatus,
  PrivacyPolicyWithStats,
  AcceptanceReportEntry,
  PolicyComparison,
  PolicyChange,
} from './types'

/**
 * Get the current published privacy policy for a tenant
 */
export async function getCurrentPolicy(tenantId: string): Promise<PrivacyPolicy | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('privacy_policies')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('status', 'published')
    .lte('effective_date', new Date().toISOString().split('T')[0])
    .or('expires_at.is.null,expires_at.gt.' + new Date().toISOString().split('T')[0])
    .order('effective_date', { ascending: false })
    .order('version', { ascending: false })
    .limit(1)
    .single()

  if (error || !data) {
    return null
  }

  return mapDbToPolicy(data)
}

/**
 * Get all policies for a tenant (admin view)
 */
export async function getAllPolicies(tenantId: string): Promise<PrivacyPolicy[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('privacy_policies')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })

  if (error || !data) {
    return []
  }

  return data.map(mapDbToPolicy)
}

/**
 * Get a specific policy by ID
 */
export async function getPolicyById(policyId: string): Promise<PrivacyPolicy | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('privacy_policies')
    .select('*')
    .eq('id', policyId)
    .single()

  if (error || !data) {
    return null
  }

  return mapDbToPolicy(data)
}

/**
 * Create a new privacy policy (draft)
 */
export async function createPolicy(
  tenantId: string,
  userId: string,
  input: CreatePrivacyPolicyInput
): Promise<PrivacyPolicy> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('privacy_policies')
    .insert({
      tenant_id: tenantId,
      version: input.version,
      effective_date: input.effectiveDate,
      content_es: input.contentEs,
      content_en: input.contentEn || null,
      change_summary: input.changeSummary,
      requires_reacceptance: input.requiresReacceptance,
      previous_version_id: input.previousVersionId || null,
      created_by: userId,
      status: 'draft',
    })
    .select()
    .single()

  if (error) {
    throw new Error(`Error al crear política: ${error.message}`)
  }

  return mapDbToPolicy(data)
}

/**
 * Update a draft policy
 */
export async function updatePolicy(
  policyId: string,
  input: UpdatePrivacyPolicyInput
): Promise<PrivacyPolicy> {
  const supabase = await createClient()

  // First check it's a draft
  const { data: existing } = await supabase
    .from('privacy_policies')
    .select('status')
    .eq('id', policyId)
    .single()

  if (existing?.status !== 'draft') {
    throw new Error('Solo se pueden editar políticas en borrador')
  }

  const updateData: Record<string, unknown> = {}
  if (input.version !== undefined) updateData.version = input.version
  if (input.effectiveDate !== undefined) updateData.effective_date = input.effectiveDate
  if (input.contentEs !== undefined) updateData.content_es = input.contentEs
  if (input.contentEn !== undefined) updateData.content_en = input.contentEn
  if (input.changeSummary !== undefined) updateData.change_summary = input.changeSummary
  if (input.requiresReacceptance !== undefined) updateData.requires_reacceptance = input.requiresReacceptance

  const { data, error } = await supabase
    .from('privacy_policies')
    .update(updateData)
    .eq('id', policyId)
    .select()
    .single()

  if (error) {
    throw new Error(`Error al actualizar política: ${error.message}`)
  }

  return mapDbToPolicy(data)
}

/**
 * Publish a draft policy
 */
export async function publishPolicy(
  policyId: string,
  userId: string
): Promise<PrivacyPolicy> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('privacy_policies')
    .update({
      status: 'published',
      published_at: new Date().toISOString(),
      published_by: userId,
    })
    .eq('id', policyId)
    .eq('status', 'draft')
    .select()
    .single()

  if (error) {
    throw new Error(`Error al publicar política: ${error.message}`)
  }

  return mapDbToPolicy(data)
}

/**
 * Archive a published policy
 */
export async function archivePolicy(policyId: string): Promise<PrivacyPolicy> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('privacy_policies')
    .update({ status: 'archived' })
    .eq('id', policyId)
    .select()
    .single()

  if (error) {
    throw new Error(`Error al archivar política: ${error.message}`)
  }

  return mapDbToPolicy(data)
}

/**
 * Check user's acceptance status for current policy
 */
export async function getAcceptanceStatus(
  userId: string,
  tenantId: string
): Promise<AcceptanceStatus> {
  const currentPolicy = await getCurrentPolicy(tenantId)

  if (!currentPolicy) {
    return {
      hasAccepted: true, // No policy = no acceptance required
      currentVersion: '0.0',
      needsReacceptance: false,
    }
  }

  const supabase = await createClient()

  // Get user's most recent acceptance for this tenant
  const { data: acceptance } = await supabase
    .from('privacy_acceptances')
    .select('*')
    .eq('user_id', userId)
    .eq('tenant_id', tenantId)
    .order('accepted_at', { ascending: false })
    .limit(1)
    .single()

  if (!acceptance) {
    return {
      hasAccepted: false,
      currentVersion: currentPolicy.version,
      needsReacceptance: true,
      policy: currentPolicy,
    }
  }

  // Check if they accepted the current policy
  const hasAcceptedCurrent = acceptance.policy_id === currentPolicy.id

  // Check if they need to re-accept based on version comparison
  const needsReacceptance = !hasAcceptedCurrent && currentPolicy.requiresReacceptance

  return {
    hasAccepted: hasAcceptedCurrent,
    acceptedVersion: acceptance.policy_version,
    acceptedAt: acceptance.accepted_at,
    currentVersion: currentPolicy.version,
    needsReacceptance,
    policy: needsReacceptance ? currentPolicy : undefined,
  }
}

/**
 * Record user's acceptance of a policy
 */
export async function acceptPolicy(
  userId: string,
  tenantId: string,
  input: AcceptPolicyInput,
  ipAddress?: string,
  userAgent?: string
): Promise<PrivacyAcceptance> {
  const supabase = await createClient()

  // Get the policy to record version
  const policy = await getPolicyById(input.policyId)
  if (!policy) {
    throw new Error('Política no encontrada')
  }

  if (policy.status !== 'published') {
    throw new Error('Solo se pueden aceptar políticas publicadas')
  }

  const { data, error } = await supabase
    .from('privacy_acceptances')
    .insert({
      user_id: userId,
      tenant_id: tenantId,
      policy_id: input.policyId,
      policy_version: policy.version,
      acceptance_method: input.acceptanceMethod,
      location_context: input.locationContext || null,
      ip_address: ipAddress || null,
      user_agent: userAgent || null,
    })
    .select()
    .single()

  if (error) {
    // Handle unique constraint violation (already accepted)
    if (error.code === '23505') {
      throw new Error('Ya aceptaste esta versión de la política')
    }
    throw new Error(`Error al registrar aceptación: ${error.message}`)
  }

  return mapDbToAcceptance(data)
}

/**
 * Get acceptance statistics for a policy (admin)
 */
export async function getPolicyWithStats(policyId: string): Promise<PrivacyPolicyWithStats | null> {
  const supabase = await createClient()

  const { data: policy, error: policyError } = await supabase
    .from('privacy_policies')
    .select('*')
    .eq('id', policyId)
    .single()

  if (policyError || !policy) {
    return null
  }

  // Get acceptance count
  const { count: acceptanceCount } = await supabase
    .from('privacy_acceptances')
    .select('*', { count: 'exact', head: true })
    .eq('policy_id', policyId)

  // Get total users for tenant
  const { count: totalUsers } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .eq('tenant_id', policy.tenant_id)
    .eq('role', 'owner')

  const acceptances = acceptanceCount || 0
  const users = totalUsers || 0
  const rate = users > 0 ? Math.round((acceptances / users) * 100 * 100) / 100 : 0

  return {
    ...mapDbToPolicy(policy),
    acceptanceCount: acceptances,
    totalUsers: users,
    acceptanceRate: rate,
  }
}

/**
 * Get acceptance report for a policy
 */
export async function getAcceptanceReport(
  policyId: string,
  limit = 100,
  offset = 0
): Promise<AcceptanceReportEntry[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('privacy_acceptances')
    .select(`
      user_id,
      policy_version,
      accepted_at,
      acceptance_method,
      profiles!inner(email, full_name)
    `)
    .eq('policy_id', policyId)
    .order('accepted_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error || !data) {
    return []
  }

  return data.map((row) => {
    const profile = (row.profiles as Array<{ email: string; full_name: string }>)?.[0]
    return {
      userId: row.user_id,
      userEmail: profile?.email || '',
      userName: profile?.full_name || '',
      policyVersion: row.policy_version,
      acceptedAt: row.accepted_at,
      acceptanceMethod: row.acceptance_method,
    }
  })
}

/**
 * Compare two policy versions
 */
export async function comparePolicies(
  currentPolicyId: string,
  previousPolicyId: string
): Promise<PolicyComparison | null> {
  const [current, previous] = await Promise.all([
    getPolicyById(currentPolicyId),
    getPolicyById(previousPolicyId),
  ])

  if (!current || !previous) {
    return null
  }

  // Generate change list from stored change_summary
  const changes: PolicyChange[] = current.changeSummary.map((change) => ({
    type: 'modified' as const,
    section: 'Política',
    description: change,
  }))

  return {
    currentVersion: current.version,
    previousVersion: previous.version,
    changes,
  }
}

/**
 * Map database row to PrivacyPolicy type
 */
function mapDbToPolicy(row: Record<string, unknown>): PrivacyPolicy {
  return {
    id: row.id as string,
    tenantId: row.tenant_id as string,
    version: row.version as string,
    status: row.status as PrivacyPolicy['status'],
    effectiveDate: row.effective_date as string,
    expiresAt: row.expires_at as string | undefined,
    contentEs: row.content_es as string,
    contentEn: row.content_en as string | undefined,
    changeSummary: (row.change_summary as string[]) || [],
    requiresReacceptance: row.requires_reacceptance as boolean,
    previousVersionId: row.previous_version_id as string | undefined,
    createdBy: row.created_by as string,
    createdAt: row.created_at as string,
    publishedAt: row.published_at as string | undefined,
    publishedBy: row.published_by as string | undefined,
  }
}

/**
 * Map database row to PrivacyAcceptance type
 */
function mapDbToAcceptance(row: Record<string, unknown>): PrivacyAcceptance {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    tenantId: row.tenant_id as string,
    policyId: row.policy_id as string,
    policyVersion: row.policy_version as string,
    acceptedAt: row.accepted_at as string,
    ipAddress: row.ip_address as string | undefined,
    userAgent: row.user_agent as string | undefined,
    acceptanceMethod: row.acceptance_method as PrivacyAcceptance['acceptanceMethod'],
    locationContext: row.location_context as string | undefined,
  }
}
