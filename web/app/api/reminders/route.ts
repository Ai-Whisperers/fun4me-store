import { NextResponse } from 'next/server'
import { withApiAuth, type ApiHandlerContext } from '@/lib/auth'
import { apiError, HTTP_STATUS } from '@/lib/api/errors'
import { logger } from '@/lib/logger'

/**
 * GET /api/reminders
 * Get pending and recent reminders for the tenant
 */
export const GET = withApiAuth(
  async ({ request, profile, supabase }: ApiHandlerContext) => {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const type = searchParams.get('type')
    const limit = parseInt(searchParams.get('limit') || '50')

    try {
      let query = supabase
        .from('reminders')
        .select(
          `
          id, type, reference_type, reference_id, scheduled_at,
          status, attempts, error_message, created_at,
          client:profiles!reminders_client_id_fkey(id, full_name, email, phone),
          pet:pets(id, name)
        `
        )
        .eq('tenant_id', profile.tenant_id)
        .order('scheduled_at', { ascending: false })
        .limit(limit)

      if (status && status !== 'all') {
        query = query.eq('status', status)
      }

      if (type && type !== 'all') {
        query = query.eq('type', type)
      }

      const { data, error } = await query

      if (error) {
        logger.error('Error fetching reminders', {
          tenantId: profile.tenant_id,
          error: error.message,
        })
        return apiError('DATABASE_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR)
      }

      return NextResponse.json({ data: data || [] })
    } catch (e) {
      logger.error('Unexpected error fetching reminders', {
        tenantId: profile.tenant_id,
        error: e instanceof Error ? e.message : 'Unknown',
      })
      return apiError('DATABASE_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR)
    }
  },
  { roles: ['vet', 'admin'] }
)

/**
 * POST /api/reminders
 * Create a manual reminder
 */
export const POST = withApiAuth(
  async ({ request, profile, supabase }: ApiHandlerContext) => {
    try {
      const body = await request.json()
      const { client_id, pet_id, type, scheduled_at, custom_subject, custom_body } = body

      if (!client_id || !type || !scheduled_at) {
        return apiError('MISSING_FIELDS', HTTP_STATUS.BAD_REQUEST, {
          details: { required: ['client_id', 'type', 'scheduled_at'] },
        })
      }

      const { data, error } = await supabase
        .from('reminders')
        .insert({
          tenant_id: profile.tenant_id,
          client_id,
          pet_id: pet_id || null,
          type,
          scheduled_at,
          custom_subject: custom_subject || null,
          custom_body: custom_body || null,
          status: 'pending',
        })
        .select(
          `
          id, type, scheduled_at, status,
          client:profiles!reminders_client_id_fkey(id, full_name),
          pet:pets(id, name)
        `
        )
        .single()

      if (error) {
        logger.error('Error creating reminder', {
          tenantId: profile.tenant_id,
          error: error.message,
        })
        return apiError('DATABASE_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR)
      }

      return NextResponse.json({ data }, { status: 201 })
    } catch (e) {
      logger.error('Unexpected error creating reminder', {
        tenantId: profile.tenant_id,
        error: e instanceof Error ? e.message : 'Unknown',
      })
      return apiError('DATABASE_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR)
    }
  },
  { roles: ['vet', 'admin'], rateLimit: 'write' }
)
