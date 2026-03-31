import { NextResponse } from 'next/server'
import { withApiAuthParams, type ApiHandlerContextWithParams } from '@/lib/auth'
import { apiError, HTTP_STATUS } from '@/lib/api/errors'
import { logger } from '@/lib/logger'

type IdParams = { id: string }

// =============================================================================
// POST /api/inventory/mappings/[id]/use - Record usage of a mapping
// =============================================================================
// This endpoint is called when a mapping is used for an import to track
// usage statistics and order mappings by popularity
export const POST = withApiAuthParams<IdParams>(
  async ({ params, profile, supabase }: ApiHandlerContextWithParams<IdParams>) => {
    try {
      const { id } = params

      // Verify the mapping exists and belongs to this tenant
      const { data: existing, error: fetchError } = await supabase
        .from('store_import_mappings')
        .select('id, usage_count')
        .eq('id', id)
        .eq('tenant_id', profile.tenant_id)
        .single()

      if (fetchError || !existing) {
        return apiError('NOT_FOUND', HTTP_STATUS.NOT_FOUND, {
          details: { message: 'Mapeo no encontrado' },
        })
      }

      // Increment usage count and update last_used_at
      const { data, error } = await supabase
        .from('store_import_mappings')
        .update({
          usage_count: (existing.usage_count || 0) + 1,
          last_used_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select('id, usage_count, last_used_at')
        .single()

      if (error) {
        logger.error('Error updating mapping usage', { error: error.message })
        return apiError('DATABASE_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR, {
          details: { message: error.message },
        })
      }

      return NextResponse.json({
        success: true,
        usage_count: data.usage_count,
        last_used_at: data.last_used_at,
      })
    } catch (error) {
      logger.error('Error in POST /api/inventory/mappings/[id]/use', {
        error: error instanceof Error ? error.message : 'Unknown error',
      })
      return apiError('SERVER_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR)
    }
  },
  { roles: ['vet', 'admin'], rateLimit: 'write' }
)
