/**
 * Platform Settings API
 *
 * GET /api/platform/settings - List all settings
 * PUT /api/platform/settings - Update a setting
 */

import { NextResponse } from 'next/server'
import { withApiAuth, type ApiHandlerContext } from '@/lib/auth/api-wrapper'
import { apiError, HTTP_STATUS } from '@/lib/api/errors'
import { logger } from '@/lib/logger'

// GET /api/platform/settings - List all settings
export const GET = withApiAuth(async ({ profile, supabase }: ApiHandlerContext) => {
  // Verify platform admin
  if (!profile.is_platform_admin) {
    return apiError('FORBIDDEN', HTTP_STATUS.FORBIDDEN, {
      details: { message: 'Platform admin access required' },
    })
  }

  const { data, error } = await supabase
    .from('platform_settings')
    .select('*')
    .order('key')

  if (error) {
    logger.error('Platform settings GET error', { error: error.message })
    return apiError('DATABASE_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR)
  }

  return NextResponse.json(data || [])
})

// PUT /api/platform/settings - Update a setting
export const PUT = withApiAuth(
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

    const { key, value } = body

    if (!key) {
      return apiError('MISSING_FIELDS', HTTP_STATUS.BAD_REQUEST, {
        details: { required: ['key'] },
      })
    }

    // Upsert the setting
    const { data, error } = await supabase
      .from('platform_settings')
      .upsert({
        key,
        value,
        updated_by: user.id,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) {
      logger.error('Platform settings PUT error', { key, error: error.message })
      return apiError('DATABASE_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR)
    }

    // Log platform action
    await supabase.rpc('log_platform_action', {
      p_action: 'update_setting',
      p_category: 'system_config',
      p_target_resource_type: 'setting',
      p_target_resource_id: key,
      p_details: { key, value },
    })

    return NextResponse.json(data)
  },
  { rateLimit: 'write' }
)
