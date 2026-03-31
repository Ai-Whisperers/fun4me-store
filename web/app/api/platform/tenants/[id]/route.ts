/**
 * Platform Tenant Detail API
 *
 * GET /api/platform/tenants/[id] - Get tenant details
 * PUT /api/platform/tenants/[id] - Update tenant
 * DELETE /api/platform/tenants/[id] - Delete tenant (soft delete)
 */

import { NextResponse } from 'next/server'
import { withApiAuthParams, type ApiHandlerContextWithParams } from '@/lib/auth/api-wrapper'
import { apiError, HTTP_STATUS } from '@/lib/api/errors'
import { logger } from '@/lib/logger'

type Params = { id: string }

// GET /api/platform/tenants/[id]
export const GET = withApiAuthParams<Params>(
  async ({ profile, supabase, params }: ApiHandlerContextWithParams<Params>) => {
    const { id } = params

    if (!profile.is_platform_admin) {
      return apiError('FORBIDDEN', HTTP_STATUS.FORBIDDEN, {
        details: { message: 'Platform admin access required' },
      })
    }

    const { data, error } = await supabase
      .from('tenants')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return apiError('NOT_FOUND', HTTP_STATUS.NOT_FOUND)
      }
      logger.error('Platform tenant GET error', { tenantId: id, error: error.message })
      return apiError('DATABASE_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR)
    }

    // Get tenant stats
    const [profilesRes, appointmentsRes, invoicesRes] = await Promise.all([
      supabase
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .eq('tenant_id', id)
        .is('deleted_at', null),
      supabase
        .from('appointments')
        .select('id', { count: 'exact', head: true })
        .eq('tenant_id', id)
        .gte('start_time', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()),
      supabase
        .from('invoices')
        .select('total')
        .eq('tenant_id', id)
        .eq('status', 'paid')
        .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()),
    ])

    const totalRevenue30d = invoicesRes.data?.reduce((sum, inv) => sum + (Number(inv.total) || 0), 0) || 0

    return NextResponse.json({
      ...data,
      stats: {
        total_users: profilesRes.count || 0,
        appointments_30d: appointmentsRes.count || 0,
        revenue_30d: totalRevenue30d,
      },
    })
  }
)

// PUT /api/platform/tenants/[id]
export const PUT = withApiAuthParams<Params>(
  async ({ profile, supabase, request, user: _user, params }: ApiHandlerContextWithParams<Params>) => {
    const { id } = params

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

    const { name, slug, is_active, settings } = body

    // Check if tenant exists
    const { data: existing, error: fetchError } = await supabase
      .from('tenants')
      .select('id, name, is_active')
      .eq('id', id)
      .single()

    if (fetchError || !existing) {
      return apiError('NOT_FOUND', HTTP_STATUS.NOT_FOUND)
    }

    // If changing slug, check for conflicts
    if (slug && slug !== id) {
      const { data: slugConflict } = await supabase
        .from('tenants')
        .select('id')
        .eq('id', slug)
        .single()

      if (slugConflict) {
        return apiError('CONFLICT', HTTP_STATUS.CONFLICT, {
          details: { message: 'El slug ya está en uso' },
        })
      }
    }

    // Build update object
    const updates: Record<string, unknown> = {}
    if (name !== undefined) updates.name = name
    if (is_active !== undefined) updates.is_active = is_active
    if (settings !== undefined) updates.settings = settings
    updates.updated_at = new Date().toISOString()

    const { data, error } = await supabase
      .from('tenants')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      logger.error('Platform tenant PUT error', { tenantId: id, error: error.message })
      return apiError('DATABASE_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR)
    }

    // Log platform action
    const action = is_active !== undefined && is_active !== existing.is_active
      ? (is_active ? 'reactivate_tenant' : 'suspend_tenant')
      : 'update_tenant'

    await supabase.rpc('log_platform_action', {
      p_action: action,
      p_category: 'tenant_management',
      p_target_tenant_id: id,
      p_target_resource_type: 'tenant',
      p_target_resource_id: id,
      p_details: { name: data.name, changes: Object.keys(updates) },
    })

    return NextResponse.json(data)
  },
  { rateLimit: 'write' }
)

// DELETE /api/platform/tenants/[id] - Soft delete (set is_active = false)
export const DELETE = withApiAuthParams<Params>(
  async ({ profile, supabase, user: _user, params }: ApiHandlerContextWithParams<Params>) => {
    const { id } = params

    if (!profile.is_platform_admin) {
      return apiError('FORBIDDEN', HTTP_STATUS.FORBIDDEN, {
        details: { message: 'Platform admin access required' },
      })
    }

    // Check if tenant exists
    const { data: existing, error: fetchError } = await supabase
      .from('tenants')
      .select('id, name')
      .eq('id', id)
      .single()

    if (fetchError || !existing) {
      return apiError('NOT_FOUND', HTTP_STATUS.NOT_FOUND)
    }

    // Soft delete by setting is_active = false
    const { error } = await supabase
      .from('tenants')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', id)

    if (error) {
      logger.error('Platform tenant DELETE error', { tenantId: id, error: error.message })
      return apiError('DATABASE_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR)
    }

    // Log platform action
    await supabase.rpc('log_platform_action', {
      p_action: 'suspend_tenant',
      p_category: 'tenant_management',
      p_target_tenant_id: id,
      p_target_resource_type: 'tenant',
      p_target_resource_id: id,
      p_details: { name: existing.name },
    })

    return NextResponse.json({ success: true })
  },
  { rateLimit: 'write' }
)
