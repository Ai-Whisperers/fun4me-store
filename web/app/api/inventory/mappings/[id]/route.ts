import { NextResponse } from 'next/server'
import { withApiAuthParams, type ApiHandlerContextWithParams } from '@/lib/auth'
import { apiError, HTTP_STATUS } from '@/lib/api/errors'
import { logger } from '@/lib/logger'
import { z } from 'zod'

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

const updateMappingSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  mapping: z.record(z.string(), z.string()).optional(),
})

type IdParams = { id: string }

// =============================================================================
// GET /api/inventory/mappings/[id] - Get a specific mapping
// =============================================================================
export const GET = withApiAuthParams<IdParams>(
  async ({ params, profile, supabase }: ApiHandlerContextWithParams<IdParams>) => {
    try {
      const { id } = params

      const { data, error } = await supabase
        .from('store_import_mappings')
        .select('*')
        .eq('id', id)
        .eq('tenant_id', profile.tenant_id)
        .single()

      if (error || !data) {
        return apiError('NOT_FOUND', HTTP_STATUS.NOT_FOUND, {
          details: { message: 'Mapeo no encontrado' },
        })
      }

      return NextResponse.json(data)
    } catch (error) {
      logger.error('Error in GET /api/inventory/mappings/[id]', {
        error: error instanceof Error ? error.message : 'Unknown error',
      })
      return apiError('SERVER_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR)
    }
  },
  { roles: ['vet', 'admin'] }
)

// =============================================================================
// PATCH /api/inventory/mappings/[id] - Update a mapping
// =============================================================================
export const PATCH = withApiAuthParams<IdParams>(
  async ({ params, profile, supabase, request }: ApiHandlerContextWithParams<IdParams>) => {
    try {
      const { id } = params
      const body = await request.json()

      // Validate input
      const validationResult = updateMappingSchema.safeParse(body)
      if (!validationResult.success) {
        return apiError('VALIDATION_ERROR', HTTP_STATUS.BAD_REQUEST, {
          details: { errors: validationResult.error.flatten().fieldErrors },
        })
      }

      const updates = validationResult.data

      // Verify the mapping exists and belongs to this tenant
      const { data: existing, error: fetchError } = await supabase
        .from('store_import_mappings')
        .select('id')
        .eq('id', id)
        .eq('tenant_id', profile.tenant_id)
        .single()

      if (fetchError || !existing) {
        return apiError('NOT_FOUND', HTTP_STATUS.NOT_FOUND, {
          details: { message: 'Mapeo no encontrado' },
        })
      }

      // Check for duplicate name if name is being updated
      if (updates.name) {
        const { data: duplicate } = await supabase
          .from('store_import_mappings')
          .select('id')
          .eq('tenant_id', profile.tenant_id)
          .eq('name', updates.name)
          .neq('id', id)
          .maybeSingle()

        if (duplicate) {
          return apiError('ALREADY_EXISTS', HTTP_STATUS.CONFLICT, {
            details: { message: 'Ya existe un mapeo con ese nombre' },
          })
        }
      }

      // Update the mapping
      const { data, error } = await supabase
        .from('store_import_mappings')
        .update(updates)
        .eq('id', id)
        .select('id, name, description, mapping, updated_at')
        .single()

      if (error) {
        logger.error('Error updating import mapping', { error: error.message })
        return apiError('DATABASE_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR, {
          details: { message: error.message },
        })
      }

      return NextResponse.json(data)
    } catch (error) {
      logger.error('Error in PATCH /api/inventory/mappings/[id]', {
        error: error instanceof Error ? error.message : 'Unknown error',
      })
      return apiError('SERVER_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR)
    }
  },
  { roles: ['vet', 'admin'], rateLimit: 'write' }
)

// =============================================================================
// DELETE /api/inventory/mappings/[id] - Delete a mapping
// =============================================================================
export const DELETE = withApiAuthParams<IdParams>(
  async ({ params, profile, supabase }: ApiHandlerContextWithParams<IdParams>) => {
    try {
      const { id } = params

      // Verify the mapping exists and belongs to this tenant
      const { data: existing, error: fetchError } = await supabase
        .from('store_import_mappings')
        .select('id, name')
        .eq('id', id)
        .eq('tenant_id', profile.tenant_id)
        .single()

      if (fetchError || !existing) {
        return apiError('NOT_FOUND', HTTP_STATUS.NOT_FOUND, {
          details: { message: 'Mapeo no encontrado' },
        })
      }

      // Delete the mapping
      const { error } = await supabase.from('store_import_mappings').delete().eq('id', id)

      if (error) {
        logger.error('Error deleting import mapping', { error: error.message })
        return apiError('DATABASE_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR, {
          details: { message: error.message },
        })
      }

      logger.info('Deleted import mapping', {
        mappingId: id,
        name: existing.name,
        tenantId: profile.tenant_id,
      })

      return NextResponse.json({ success: true })
    } catch (error) {
      logger.error('Error in DELETE /api/inventory/mappings/[id]', {
        error: error instanceof Error ? error.message : 'Unknown error',
      })
      return apiError('SERVER_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR)
    }
  },
  { roles: ['vet', 'admin'] }
)
