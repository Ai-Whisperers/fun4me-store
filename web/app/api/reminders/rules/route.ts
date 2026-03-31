import { NextResponse } from 'next/server'
import { withApiAuth, type ApiHandlerContext } from '@/lib/auth'
import { apiError, HTTP_STATUS } from '@/lib/api/errors'
import { logger } from '@/lib/logger'

/**
 * GET /api/reminders/rules
 * Get reminder rules for the tenant
 */
export const GET = withApiAuth(
  async ({ user, profile, supabase }: ApiHandlerContext) => {
    try {
      const { data, error } = await supabase
        .from('reminder_rules')
        .select('*')
        .eq('tenant_id', profile.tenant_id)
        .order('type')
        .order('days_offset')

      if (error) throw error

      return NextResponse.json({ data: data || [] })
    } catch (e) {
      logger.error('Error fetching reminder rules', {
        tenantId: profile.tenant_id,
        userId: user.id,
        error: e instanceof Error ? e.message : 'Unknown',
      })
      return apiError('DATABASE_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR)
    }
  },
  { roles: ['admin'] }
)

/**
 * POST /api/reminders/rules
 * Create a new reminder rule
 */
export const POST = withApiAuth(
  async ({ request, user, profile, supabase }: ApiHandlerContext) => {
    try {
      const body = await request.json()
      const { name, type, days_offset, time_of_day, channels, conditions, is_active } = body

      if (!name || !type || days_offset === undefined) {
        return apiError('MISSING_FIELDS', HTTP_STATUS.BAD_REQUEST, {
          details: { required: ['name', 'type', 'days_offset'] },
        })
      }

      const { data, error } = await supabase
        .from('reminder_rules')
        .insert({
          tenant_id: profile.tenant_id,
          name,
          type,
          days_offset,
          time_of_day: time_of_day || '09:00:00',
          channels: channels || ['sms'],
          conditions: conditions || null,
          is_active: is_active ?? true,
        })
        .select()
        .single()

      if (error) throw error

      return NextResponse.json({ data }, { status: 201 })
    } catch (e) {
      logger.error('Error creating reminder rule', {
        tenantId: profile.tenant_id,
        userId: user.id,
        error: e instanceof Error ? e.message : 'Unknown',
      })
      return apiError('DATABASE_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR)
    }
  },
  { roles: ['admin'], rateLimit: 'write' }
)

/**
 * PATCH /api/reminders/rules
 * Update a reminder rule
 */
export const PATCH = withApiAuth(
  async ({ request, user, profile, supabase }: ApiHandlerContext) => {
    try {
      const body = await request.json()
      const { id, ...updates } = body

      if (!id) {
        return apiError('MISSING_FIELDS', HTTP_STATUS.BAD_REQUEST, { details: { required: ['id'] } })
      }

      const { data, error } = await supabase
        .from('reminder_rules')
        .update(updates)
        .eq('id', id)
        .eq('tenant_id', profile.tenant_id)
        .select()
        .single()

      if (error) throw error

      return NextResponse.json({ data })
    } catch (e) {
      logger.error('Error updating reminder rule', {
        tenantId: profile.tenant_id,
        userId: user.id,
        error: e instanceof Error ? e.message : 'Unknown',
      })
      return apiError('DATABASE_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR)
    }
  },
  { roles: ['admin'], rateLimit: 'write' }
)

/**
 * DELETE /api/reminders/rules
 * Delete a reminder rule
 */
export const DELETE = withApiAuth(
  async ({ request, user, profile, supabase }: ApiHandlerContext) => {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return apiError('MISSING_FIELDS', HTTP_STATUS.BAD_REQUEST, { details: { required: ['id'] } })
    }

    try {
      const { error } = await supabase
        .from('reminder_rules')
        .delete()
        .eq('id', id)
        .eq('tenant_id', profile.tenant_id)

      if (error) throw error

      return NextResponse.json({ success: true })
    } catch (e) {
      logger.error('Error deleting reminder rule', {
        tenantId: profile.tenant_id,
        userId: user.id,
        error: e instanceof Error ? e.message : 'Unknown',
      })
      return apiError('DATABASE_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR)
    }
  },
  { roles: ['admin'], rateLimit: 'write' }
)
