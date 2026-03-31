import { NextResponse } from 'next/server'
import { withApiAuthParams, type ApiHandlerContextWithParams } from '@/lib/auth'
import { apiError, HTTP_STATUS } from '@/lib/api/errors'
import { logger } from '@/lib/logger'

/**
 * GET /api/clients/[id]/notes - Get notes for a client
 */
export const GET = withApiAuthParams(
  async ({ params, user, profile, supabase }: ApiHandlerContextWithParams<{ id: string }>) => {
    const clientId = params.id

    try {
      const { data: notes, error } = await supabase
        .from('client_notes')
        .select(
          `
          id,
          content,
          is_private,
          created_by,
          created_at,
          updated_at,
          profiles:created_by (full_name)
        `
        )
        .eq('client_id', clientId)
        .eq('tenant_id', profile.tenant_id)
        .or(`is_private.eq.false,created_by.eq.${user.id}`)
        .order('created_at', { ascending: false })

      if (error) {
        logger.error('Error fetching client notes', {
          tenantId: profile.tenant_id,
          clientId,
          error: error.message,
        })
        return apiError('DATABASE_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR)
      }

      return NextResponse.json({
        notes: (notes || []).map((note) => ({
          ...note,
          created_by_name:
            (note.profiles as unknown as { full_name: string } | null)?.full_name || 'Usuario',
        })),
      })
    } catch (error) {
      logger.error('Error fetching client notes', {
        tenantId: profile.tenant_id,
        userId: user.id,
        clientId,
        error: error instanceof Error ? error.message : 'Unknown',
      })
      return apiError('SERVER_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR)
    }
  },
  { roles: ['vet', 'admin'] }
)

/**
 * POST /api/clients/[id]/notes - Create a note for a client
 */
export const POST = withApiAuthParams(
  async ({ request, params, user, profile, supabase }: ApiHandlerContextWithParams<{ id: string }>) => {
    const clientId = params.id
    const body = await request.json()
    const { content, is_private } = body

    if (!content) {
      return apiError('MISSING_FIELDS', HTTP_STATUS.BAD_REQUEST, {
        details: { fields: ['content'] },
      })
    }

    try {
      const { data: note, error } = await supabase
        .from('client_notes')
        .insert({
          client_id: clientId,
          tenant_id: profile.tenant_id,
          content,
          is_private: is_private || false,
          created_by: user.id,
        })
        .select()
        .single()

      if (error) {
        logger.error('Error creating client note', {
          tenantId: profile.tenant_id,
          clientId,
          error: error.message,
        })
        return apiError('DATABASE_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR)
      }

      return NextResponse.json({
        note: {
          ...note,
          created_by_name: profile.full_name || 'Usuario',
        },
      })
    } catch (error) {
      logger.error('Error creating client note', {
        tenantId: profile.tenant_id,
        userId: user.id,
        clientId,
        error: error instanceof Error ? error.message : 'Unknown',
      })
      return apiError('SERVER_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR)
    }
  },
  { roles: ['vet', 'admin'], rateLimit: 'write' }
)
