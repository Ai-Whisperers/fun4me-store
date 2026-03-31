import { NextResponse } from 'next/server'
import { withApiAuthParams, type ApiHandlerContextWithParams } from '@/lib/auth'
import { apiError, HTTP_STATUS } from '@/lib/api/errors'
import { logger } from '@/lib/logger'

/**
 * GET /api/clients/[id]/tags - Get tags for a client
 */
export const GET = withApiAuthParams(
  async ({ params, user, profile, supabase }: ApiHandlerContextWithParams<{ id: string }>) => {
    const clientId = params.id

    try {
      const { data: tags, error } = await supabase
        .from('client_tags')
        .select('tag_id, tag_name, tag_color, tag_icon')
        .eq('client_id', clientId)
        .eq('tenant_id', profile.tenant_id)

      if (error) {
        logger.error('Error fetching client tags', {
          tenantId: profile.tenant_id,
          clientId,
          error: error.message,
        })
        return apiError('DATABASE_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR)
      }

      return NextResponse.json({
        tags: (tags || []).map((t) => ({
          id: t.tag_id,
          name: t.tag_name,
          color: t.tag_color,
          icon: t.tag_icon,
        })),
      })
    } catch (error) {
      logger.error('Error fetching client tags', {
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
 * POST /api/clients/[id]/tags - Add a tag to a client
 */
export const POST = withApiAuthParams(
  async ({ request, params, user, profile, supabase }: ApiHandlerContextWithParams<{ id: string }>) => {
    const clientId = params.id
    const body = await request.json()
    const { tagId } = body

    if (!tagId) {
      return apiError('MISSING_FIELDS', HTTP_STATUS.BAD_REQUEST, {
        details: { fields: ['tagId'] },
      })
    }

    try {
      const { error } = await supabase.from('client_tags').insert({
        client_id: clientId,
        tag_id: tagId,
        tenant_id: profile.tenant_id,
        created_by: user.id,
      })

      if (error) {
        logger.error('Error adding client tag', {
          tenantId: profile.tenant_id,
          clientId,
          tagId,
          error: error.message,
        })
        return apiError('DATABASE_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR)
      }

      return NextResponse.json({ success: true })
    } catch (error) {
      logger.error('Error adding client tag', {
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

/**
 * DELETE /api/clients/[id]/tags - Remove a tag from a client
 */
export const DELETE = withApiAuthParams(
  async ({ request, params, user, profile, supabase }: ApiHandlerContextWithParams<{ id: string }>) => {
    const clientId = params.id
    const body = await request.json()
    const { tagId } = body

    if (!tagId) {
      return apiError('MISSING_FIELDS', HTTP_STATUS.BAD_REQUEST, {
        details: { fields: ['tagId'] },
      })
    }

    try {
      const { error } = await supabase
        .from('client_tags')
        .delete()
        .eq('client_id', clientId)
        .eq('tag_id', tagId)
        .eq('tenant_id', profile.tenant_id)

      if (error) {
        logger.error('Error removing client tag', {
          tenantId: profile.tenant_id,
          clientId,
          tagId,
          error: error.message,
        })
        return apiError('DATABASE_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR)
      }

      return NextResponse.json({ success: true })
    } catch (error) {
      logger.error('Error removing client tag', {
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
