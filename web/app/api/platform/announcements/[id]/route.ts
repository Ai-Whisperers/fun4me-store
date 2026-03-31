/**
 * Platform Announcement Detail API
 *
 * GET /api/platform/announcements/[id] - Get announcement details
 * PUT /api/platform/announcements/[id] - Update announcement
 * DELETE /api/platform/announcements/[id] - Delete announcement
 */

import { NextResponse } from 'next/server'
import { withApiAuthParams, type ApiHandlerContextWithParams } from '@/lib/auth/api-wrapper'
import { apiError, HTTP_STATUS } from '@/lib/api/errors'
import { logger } from '@/lib/logger'

type Params = { id: string }

// GET /api/platform/announcements/[id]
export const GET = withApiAuthParams<Params>(
  async ({ profile, supabase, params }: ApiHandlerContextWithParams<Params>) => {
    const { id } = params

    if (!profile.is_platform_admin) {
      return apiError('FORBIDDEN', HTTP_STATUS.FORBIDDEN, {
        details: { message: 'Platform admin access required' },
      })
    }

    const { data, error } = await supabase
      .from('platform_announcements')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return apiError('NOT_FOUND', HTTP_STATUS.NOT_FOUND)
      }
      logger.error('Platform announcement GET error', { id, error: error.message })
      return apiError('DATABASE_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR)
    }

    return NextResponse.json(data)
  }
)

// PUT /api/platform/announcements/[id]
export const PUT = withApiAuthParams<Params>(
  async ({ profile, supabase, request, user, params }: ApiHandlerContextWithParams<Params>) => {
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

    const {
      title,
      content,
      announcement_type,
      target_roles,
      target_tenant_ids,
      is_active,
      is_dismissible,
      priority,
      action_url,
      action_label,
      starts_at,
      ends_at,
    } = body

    // Build update object
    const updates: Record<string, unknown> = {}
    if (title !== undefined) updates.title = title
    if (content !== undefined) updates.content = content
    if (announcement_type !== undefined) updates.announcement_type = announcement_type
    if (target_roles !== undefined) updates.target_roles = target_roles
    if (target_tenant_ids !== undefined) updates.target_tenant_ids = target_tenant_ids
    if (is_active !== undefined) updates.is_active = is_active
    if (is_dismissible !== undefined) updates.is_dismissible = is_dismissible
    if (priority !== undefined) updates.priority = priority
    if (action_url !== undefined) updates.action_url = action_url
    if (action_label !== undefined) updates.action_label = action_label
    if (starts_at !== undefined) updates.starts_at = starts_at
    if (ends_at !== undefined) updates.ends_at = ends_at
    updates.updated_at = new Date().toISOString()

    const { data, error } = await supabase
      .from('platform_announcements')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return apiError('NOT_FOUND', HTTP_STATUS.NOT_FOUND)
      }
      logger.error('Platform announcement PUT error', { id, error: error.message })
      return apiError('DATABASE_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR)
    }

    // Log platform action
    await supabase.rpc('log_platform_action', {
      p_action: 'update_announcement',
      p_category: 'system_config',
      p_target_resource_type: 'announcement',
      p_target_resource_id: id,
      p_details: { title: data.title, changes: Object.keys(updates) },
    })

    return NextResponse.json(data)
  },
  { rateLimit: 'write' }
)

// DELETE /api/platform/announcements/[id]
export const DELETE = withApiAuthParams<Params>(
  async ({ profile, supabase, user, params }: ApiHandlerContextWithParams<Params>) => {
    const { id } = params

    if (!profile.is_platform_admin) {
      return apiError('FORBIDDEN', HTTP_STATUS.FORBIDDEN, {
        details: { message: 'Platform admin access required' },
      })
    }

    // Get announcement for logging
    const { data: existing } = await supabase
      .from('platform_announcements')
      .select('title')
      .eq('id', id)
      .single()

    const { error } = await supabase
      .from('platform_announcements')
      .delete()
      .eq('id', id)

    if (error) {
      logger.error('Platform announcement DELETE error', { id, error: error.message })
      return apiError('DATABASE_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR)
    }

    // Log platform action
    await supabase.rpc('log_platform_action', {
      p_action: 'delete_announcement',
      p_category: 'system_config',
      p_target_resource_type: 'announcement',
      p_target_resource_id: id,
      p_details: { title: existing?.title },
    })

    return NextResponse.json({ success: true })
  },
  { rateLimit: 'write' }
)

// POST /api/platform/announcements/[id]/dismiss - Dismiss announcement for user
export const POST = withApiAuthParams<Params>(
  async ({ supabase, user, params }: ApiHandlerContextWithParams<Params>) => {
    const { id } = params

    // Check if announcement exists and is dismissible
    const { data: announcement, error: fetchError } = await supabase
      .from('platform_announcements')
      .select('id, is_dismissible')
      .eq('id', id)
      .single()

    if (fetchError || !announcement) {
      return apiError('NOT_FOUND', HTTP_STATUS.NOT_FOUND)
    }

    if (!announcement.is_dismissible) {
      return apiError('FORBIDDEN', HTTP_STATUS.FORBIDDEN, {
        details: { message: 'Este anuncio no puede descartarse' },
      })
    }

    // Record dismissal
    const { error } = await supabase
      .from('dismissed_announcements')
      .upsert({
        user_id: user.id,
        announcement_id: id,
        dismissed_at: new Date().toISOString(),
      })

    if (error) {
      logger.error('Dismiss announcement error', { id, userId: user.id, error: error.message })
      return apiError('DATABASE_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR)
    }

    return NextResponse.json({ success: true })
  }
)
