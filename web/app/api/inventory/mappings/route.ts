import { NextResponse } from 'next/server'
import { withApiAuth, type ApiHandlerContext } from '@/lib/auth'
import { apiError, HTTP_STATUS } from '@/lib/api/errors'
import { logger } from '@/lib/logger'
import { z } from 'zod'

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

const createMappingSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido').max(100),
  description: z.string().max(500).optional(),
  mapping: z.record(z.string(), z.string()),
})

// =============================================================================
// GET /api/inventory/mappings - List saved mappings for the clinic
// =============================================================================
export const GET = withApiAuth(
  async ({ profile, supabase }) => {
    try {
      const { data, error } = await supabase
        .from('store_import_mappings')
        .select('id, name, description, mapping, usage_count, last_used_at, created_at')
        .eq('tenant_id', profile.tenant_id)
        .order('usage_count', { ascending: false })
        .order('last_used_at', { ascending: false, nullsFirst: false })

      if (error) {
        logger.error('Error fetching import mappings', { error: error.message })
        return apiError('DATABASE_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR, {
          details: { message: error.message },
        })
      }

      return NextResponse.json({
        mappings: data || [],
        count: data?.length || 0,
      })
    } catch (error) {
      logger.error('Error in GET /api/inventory/mappings', {
        error: error instanceof Error ? error.message : 'Unknown error',
      })
      return apiError('SERVER_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR)
    }
  },
  { roles: ['vet', 'admin'] }
)

// =============================================================================
// POST /api/inventory/mappings - Create a new mapping
// =============================================================================
export const POST = withApiAuth(
  async ({ profile, supabase, request }: ApiHandlerContext) => {
    try {
      const body = await request.json()

      // Validate input
      const validationResult = createMappingSchema.safeParse(body)
      if (!validationResult.success) {
        return apiError('VALIDATION_ERROR', HTTP_STATUS.BAD_REQUEST, {
          details: { errors: validationResult.error.flatten().fieldErrors },
        })
      }

      const { name, description, mapping } = validationResult.data

      // Check for duplicate name
      const { data: existing } = await supabase
        .from('store_import_mappings')
        .select('id')
        .eq('tenant_id', profile.tenant_id)
        .eq('name', name)
        .maybeSingle()

      if (existing) {
        return apiError('ALREADY_EXISTS', HTTP_STATUS.CONFLICT, {
          details: { message: 'Ya existe un mapeo con ese nombre' },
        })
      }

      // Create the mapping
      const { data, error } = await supabase
        .from('store_import_mappings')
        .insert({
          tenant_id: profile.tenant_id,
          name,
          description,
          mapping,
          created_by: profile.id,
        })
        .select('id, name, description, mapping, created_at')
        .single()

      if (error) {
        logger.error('Error creating import mapping', { error: error.message })
        return apiError('DATABASE_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR, {
          details: { message: error.message },
        })
      }

      logger.info('Created import mapping', {
        mappingId: data.id,
        name: data.name,
        tenantId: profile.tenant_id,
      })

      return NextResponse.json(data, { status: 201 })
    } catch (error) {
      logger.error('Error in POST /api/inventory/mappings', {
        error: error instanceof Error ? error.message : 'Unknown error',
      })
      return apiError('SERVER_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR)
    }
  },
  { roles: ['vet', 'admin'], rateLimit: 'write' }
)
