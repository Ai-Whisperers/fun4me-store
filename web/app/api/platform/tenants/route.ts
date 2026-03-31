/**
 * Platform Tenants API
 *
 * GET /api/platform/tenants - List all tenants (platform admin only)
 */

import { NextResponse } from 'next/server'
import { withApiAuth, type ApiHandlerContext } from '@/lib/auth/api-wrapper'
import { apiError, HTTP_STATUS } from '@/lib/api/errors'
import { logger } from '@/lib/logger'

// GET /api/platform/tenants - List all tenants with statistics
export const GET = withApiAuth(
  async ({ profile, supabase, request }: ApiHandlerContext) => {
    // Verify platform admin
    if (!profile.is_platform_admin) {
      return apiError('FORBIDDEN', HTTP_STATUS.FORBIDDEN, {
        details: { message: 'Platform admin access required' },
      })
    }

    const { searchParams } = new URL(request.url)
    const includeStats = searchParams.get('include_stats') === 'true'
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Get tenants
    const { data: tenants, error, count } = await supabase
      .from('tenants')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      logger.error('Platform tenants GET error', { error: error.message })
      return apiError('DATABASE_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR)
    }

    // If stats requested, fetch them
    let tenantsWithStats = tenants || []
    if (includeStats && tenants) {
      // Get counts for each tenant
      const tenantIds = tenants.map((t) => t.id)

      const [profileCounts, petCounts, appointmentCounts] = await Promise.all([
        supabase
          .from('profiles')
          .select('tenant_id', { count: 'exact', head: false })
          .in('tenant_id', tenantIds)
          .is('deleted_at', null),
        supabase
          .from('pets')
          .select('tenant_id', { count: 'exact', head: false })
          .in('tenant_id', tenantIds)
          .is('deleted_at', null),
        supabase
          .from('appointments')
          .select('tenant_id', { count: 'exact', head: false })
          .in('tenant_id', tenantIds)
          .gte('start_time', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()),
      ])

      // Aggregate counts
      const profilesByTenant = new Map<string, number>()
      const petsByTenant = new Map<string, number>()
      const appointmentsByTenant = new Map<string, number>()

      profileCounts.data?.forEach((p: { tenant_id: string }) => {
        profilesByTenant.set(p.tenant_id, (profilesByTenant.get(p.tenant_id) || 0) + 1)
      })
      petCounts.data?.forEach((p: { tenant_id: string }) => {
        petsByTenant.set(p.tenant_id, (petsByTenant.get(p.tenant_id) || 0) + 1)
      })
      appointmentCounts.data?.forEach((a: { tenant_id: string }) => {
        appointmentsByTenant.set(a.tenant_id, (appointmentsByTenant.get(a.tenant_id) || 0) + 1)
      })

      tenantsWithStats = tenants.map((tenant) => ({
        ...tenant,
        stats: {
          profile_count: profilesByTenant.get(tenant.id) || 0,
          pet_count: petsByTenant.get(tenant.id) || 0,
          appointments_30d: appointmentsByTenant.get(tenant.id) || 0,
        },
      }))
    }

    return NextResponse.json(tenantsWithStats)
  }
)

// POST /api/platform/tenants - Create a new tenant
export const POST = withApiAuth(
  async ({ profile, supabase, request, user }: ApiHandlerContext) => {
    // Verify platform admin
    if (!profile.is_platform_admin) {
      return apiError('FORBIDDEN', HTTP_STATUS.FORBIDDEN, {
        details: { message: 'Platform admin access required' },
      })
    }

    let body
    try {
      body = await request.json()
    } catch (_error: unknown) {
      return apiError('INVALID_FORMAT', HTTP_STATUS.BAD_REQUEST)
    }

    const { name, slug, settings } = body

    if (!name || !slug) {
      return apiError('MISSING_FIELDS', HTTP_STATUS.BAD_REQUEST, {
        details: { required: ['name', 'slug'] },
      })
    }

    // Validate slug format
    if (!/^[a-z0-9-]+$/.test(slug)) {
      return apiError('VALIDATION_ERROR', HTTP_STATUS.BAD_REQUEST, {
        details: { message: 'El slug solo puede contener letras minúsculas, números y guiones' },
      })
    }

    // Check if slug already exists
    const { data: existing } = await supabase
      .from('tenants')
      .select('id')
      .eq('id', slug)
      .single()

    if (existing) {
      return apiError('CONFLICT', HTTP_STATUS.CONFLICT, {
        details: { message: 'El slug ya está en uso' },
      })
    }

    // Create tenant
    const { data, error } = await supabase
      .from('tenants')
      .insert({
        id: slug,
        name,
        settings: settings || {},
        is_active: true,
      })
      .select()
      .single()

    if (error) {
      logger.error('Platform tenant POST error', { error: error.message })
      return apiError('DATABASE_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR)
    }

    // Log platform action
    await supabase.rpc('log_platform_action', {
      p_action: 'create_tenant',
      p_category: 'tenant_management',
      p_target_tenant_id: data.id,
      p_target_resource_type: 'tenant',
      p_target_resource_id: data.id,
      p_details: { name, slug },
    })

    return NextResponse.json(data, { status: 201 })
  },
  { rateLimit: 'write' }
)
