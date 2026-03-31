/**
 * Tenant Features API
 *
 * GET /api/tenant/features?tenantId=xxx
 *
 * Returns feature flags and subscription information for a tenant.
 * Used by the client-side feature flags hook.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getTenantFeatures } from '@/lib/features/server'

export async function GET(request: NextRequest): Promise<NextResponse> {
  const searchParams = request.nextUrl.searchParams
  const tenantId = searchParams.get('tenantId')

  if (!tenantId) {
    return NextResponse.json(
      { error: 'tenantId is required' },
      { status: 400 }
    )
  }

  // Verify tenant exists and is active
  const supabase = await createClient()
  const { data: tenant, error: tenantError } = await supabase
    .from('tenants')
    .select('id, is_active')
    .eq('id', tenantId)
    .single()

  if (tenantError || !tenant || !tenant.is_active) {
    return NextResponse.json(
      { error: 'Tenant not found' },
      { status: 404 }
    )
  }

  // Get feature flags
  const features = await getTenantFeatures(tenantId)

  if (!features) {
    return NextResponse.json(
      { error: 'Could not load features' },
      { status: 500 }
    )
  }

  // Convert Date objects to ISO strings for JSON serialization
  const response = {
    ...features,
    trialEndsAt: features.trialEndsAt?.toISOString() || null,
    subscriptionExpiresAt: features.subscriptionExpiresAt?.toISOString() || null,
  }

  return NextResponse.json(response)
}
