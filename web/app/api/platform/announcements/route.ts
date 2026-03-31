/**
 * Platform Announcements API
 *
 * GET /api/platform/announcements - List announcements
 * POST /api/platform/announcements - Create announcement (platform admin only)
 */

import { NextResponse } from 'next/server'
import { withApiAuth, type ApiHandlerContext } from '@/lib/auth/api-wrapper'
import { apiError, HTTP_STATUS } from '@/lib/api/errors'
import { logger } from '@/lib/logger'

// GET /api/platform/announcements - List active announcements
export const GET = withApiAuth(async ({ profile, supabase, request, user }: ApiHandlerContext) => {
  const { searchParams } = new URL(request.url)
  const includeInactive = searchParams.get('include_inactive') === 'true'

  // Only platform admins can see inactive announcements
  if (includeInactive && !profile.is_platform_admin) {
    return apiError('FORBIDDEN', HTTP_STATUS.FORBIDDEN)
  }

  let query = supabase
    .from('platform_announcements')
    .select('*')
    .order('priority', { ascending: false })
    .order('created_at', { ascending: false })

  if (!includeInactive) {
    const now = new Date().toISOString()
    query = query
      .eq('is_active', true)
      .lte('starts_at', now)
      .or(`ends_at.is.null,ends_at.gt.${now}`)
  }

  const { data, error } = await query

  if (error) {
    logger.error('Platform announcements GET error', { error: error.message })
    return apiError('DATABASE_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR)
  }

  // Get user's dismissed announcements
  const { data: dismissed } = await supabase
    .from('dismissed_announcements')
    .select('announcement_id')
    .eq('user_id', user.id)

  const dismissedIds = new Set(dismissed?.map((d) => d.announcement_id) || [])

  // Filter out dismissed and add flag
  const announcements = (data || [])
    .filter((a) => !dismissedIds.has(a.id) || !a.is_dismissible)
    .map((a) => ({
      ...a,
      is_dismissed: dismissedIds.has(a.id),
    }))

  return NextResponse.json(announcements)
})

// POST /api/platform/announcements - Create announcement
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

    const {
      title,
      content,
      announcement_type,
      target_roles,
      target_tenant_ids,
      is_dismissible,
      priority,
      action_url,
      action_label,
      starts_at,
      ends_at,
    } = body

    // Validate required fields
    if (!title || !content) {
      return apiError('MISSING_FIELDS', HTTP_STATUS.BAD_REQUEST, {
        details: { required: ['title', 'content'] },
      })
    }

    const { data, error } = await supabase
      .from('platform_announcements')
      .insert({
        title,
        content,
        announcement_type: announcement_type || 'info',
        target_roles: target_roles || ['admin'],
        target_tenant_ids: target_tenant_ids || null,
        is_dismissible: is_dismissible ?? true,
        priority: priority || 0,
        action_url,
        action_label,
        starts_at: starts_at || new Date().toISOString(),
        ends_at,
        created_by: user.id,
      })
      .select()
      .single()

    if (error) {
      logger.error('Platform announcement POST error', {
        userId: user.id,
        error: error.message,
      })
      return apiError('DATABASE_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR)
    }

    // Log platform action
    await supabase.rpc('log_platform_action', {
      p_action: 'create_announcement',
      p_category: 'system_config',
      p_target_resource_type: 'announcement',
      p_target_resource_id: data.id,
      p_details: { title },
    })

    return NextResponse.json(data, { status: 201 })
  },
  { rateLimit: 'write' }
)
