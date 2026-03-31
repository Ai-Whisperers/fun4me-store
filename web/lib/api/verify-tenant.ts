/**
 * Tenant verification utilities
 * API-009: Create Tenant Verification Utility
 */

import { SupabaseClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { apiError, HTTP_STATUS } from './errors'

interface TenantVerifyResult {
  valid: boolean
  error?: NextResponse
  data?: { tenant_id: string }
}

/**
 * Verify that a resource belongs to the user's tenant
 *
 * @param supabase - Supabase client
 * @param table - Table name to check
 * @param resourceId - ID of the resource
 * @param userTenantId - User's tenant ID
 * @returns Verification result with error if invalid
 *
 * @example
 * ```typescript
 * const verification = await verifyResourceTenant(supabase, 'invoices', invoiceId, profile.tenant_id);
 * if (!verification.valid) {
 *   return verification.error;
 * }
 * ```
 */
export async function verifyResourceTenant(
  supabase: SupabaseClient,
  table: string,
  resourceId: string,
  userTenantId: string
): Promise<TenantVerifyResult> {
  const { data, error } = await supabase
    .from(table)
    .select('tenant_id')
    .eq('id', resourceId)
    .single()

  if (error || !data) {
    return {
      valid: false,
      error: apiError('NOT_FOUND', HTTP_STATUS.NOT_FOUND),
    }
  }

  if (data.tenant_id !== userTenantId) {
    return {
      valid: false,
      error: apiError('FORBIDDEN', HTTP_STATUS.FORBIDDEN),
    }
  }

  return { valid: true, data }
}

/**
 * Verify that a pet belongs to the user (for pet owners)
 * Checks both tenant isolation and ownership
 *
 * @param supabase - Supabase client
 * @param petId - Pet ID
 * @param userId - User ID
 * @param userTenantId - User's tenant ID
 * @returns Verification result with error if invalid
 *
 * @example
 * ```typescript
 * const verification = await verifyPetOwnership(supabase, petId, user.id, profile.tenant_id);
 * if (!verification.valid) {
 *   return verification.error;
 * }
 * ```
 */
export async function verifyPetOwnership(
  supabase: SupabaseClient,
  petId: string,
  userId: string,
  userTenantId: string
): Promise<TenantVerifyResult> {
  const { data, error } = await supabase
    .from('pets')
    .select('owner_id, tenant_id')
    .eq('id', petId)
    .single()

  if (error || !data) {
    return {
      valid: false,
      error: apiError('NOT_FOUND', HTTP_STATUS.NOT_FOUND),
    }
  }

  // Check tenant match
  if (data.tenant_id !== userTenantId) {
    return {
      valid: false,
      error: apiError('FORBIDDEN', HTTP_STATUS.FORBIDDEN),
    }
  }

  // Check ownership for non-staff
  if (data.owner_id !== userId) {
    return {
      valid: false,
      error: apiError('FORBIDDEN', HTTP_STATUS.FORBIDDEN),
    }
  }

  return { valid: true, data }
}
