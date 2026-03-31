import { NextResponse } from 'next/server'
import { withApiAuthParams, type ApiHandlerContextWithParams } from '@/lib/auth'
import { apiError, HTTP_STATUS } from '@/lib/api/errors'
import { logger } from '@/lib/logger'
import { z } from 'zod'

const verifySchema = z.object({
  status: z.enum(['verified', 'rejected']),
  notes: z.string().optional(),
})

/**
 * POST /api/suppliers/[id]/verify
 * Verify or reject a supplier
 */
export const POST = withApiAuthParams(
  async ({ request, params, user, profile, supabase }: ApiHandlerContextWithParams<{ id: string }>) => {
    const supplierId = params.id

    try {
      // Parse and validate body
      const body = await request.json()
      const validation = verifySchema.safeParse(body)

      if (!validation.success) {
        return apiError('VALIDATION_ERROR', HTTP_STATUS.BAD_REQUEST, {
          details: { errors: validation.error.flatten().fieldErrors },
        })
      }

      // Check supplier exists and belongs to tenant
      const { data: existing } = await supabase
        .from('suppliers')
        .select('id, verification_status')
        .eq('id', supplierId)
        .eq('tenant_id', profile.tenant_id)
        .single()

      if (!existing) {
        return apiError('NOT_FOUND', HTTP_STATUS.NOT_FOUND, {
          details: { resource: 'supplier' },
        })
      }

      // Update verification status
      const updateData: Record<string, unknown> = {
        verification_status: validation.data.status,
        verified_by: user.id,
        verified_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      if (validation.data.notes) {
        updateData.verification_notes = validation.data.notes
      }

      const { data: supplier, error } = await supabase
        .from('suppliers')
        .update(updateData)
        .eq('id', supplierId)
        .eq('tenant_id', profile.tenant_id)
        .select()
        .single()

      if (error) {
        logger.error('Error verifying supplier', {
          tenantId: profile.tenant_id,
          supplierId,
          error: error.message,
        })
        return apiError('DATABASE_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR)
      }

      return NextResponse.json({
        success: true,
        supplier,
        message:
          validation.data.status === 'verified'
            ? 'Proveedor verificado exitosamente'
            : 'Proveedor rechazado',
      })
    } catch (e) {
      logger.error('Supplier verify POST error', {
        tenantId: profile.tenant_id,
        supplierId,
        userId: user.id,
        error: e instanceof Error ? e.message : 'Unknown',
      })
      return apiError('SERVER_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR)
    }
  },
  { roles: ['admin'], rateLimit: 'write' }
)
