import { NextResponse } from 'next/server'
import { withApiAuth, type ApiHandlerContext } from '@/lib/auth'
import { apiError, HTTP_STATUS } from '@/lib/api/errors'
import { logger } from '@/lib/logger'
import { barcodeLookupQuerySchema } from '@/lib/schemas/inventory'

/**
 * GET /api/inventory/barcode-lookup
 * Look up a product by barcode within the user's tenant
 *
 * Query params:
 * - barcode: The barcode to search for (required)
 * - clinic: The clinic/tenant ID (required)
 */
export const GET = withApiAuth(
  async ({ request, user, profile, supabase }: ApiHandlerContext) => {
    // Validate query params
    const { searchParams } = new URL(request.url)
    const queryValidation = barcodeLookupQuerySchema.safeParse({
      barcode: searchParams.get('barcode'),
      clinic: searchParams.get('clinic'),
    })

    if (!queryValidation.success) {
      return apiError('VALIDATION_ERROR', HTTP_STATUS.BAD_REQUEST, {
        details: { issues: queryValidation.error.issues },
      })
    }

    const { barcode, clinic } = queryValidation.data

    // Verify tenant matches
    if (profile.tenant_id !== clinic) {
      return apiError('FORBIDDEN', HTTP_STATUS.FORBIDDEN)
    }

    try {
      // Use the database function for optimized lookup
      const { data, error } = await supabase.rpc('find_product_by_barcode', {
        p_tenant_id: clinic,
        p_barcode: barcode.trim(),
      })

      if (error) {
        logger.error('Barcode lookup error', {
          tenantId: profile.tenant_id,
          userId: user.id,
          barcode,
          error: error.message,
        })
        return apiError('DATABASE_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR)
      }

      // The function returns a table, check if we got any results
      if (!data || data.length === 0) {
        return apiError('NOT_FOUND', HTTP_STATUS.NOT_FOUND, {
          details: { resource: 'product' },
        })
      }

      // Return the first (and should be only) result
      return NextResponse.json(data[0])
    } catch (e) {
      logger.error('Barcode lookup exception', {
        tenantId: profile.tenant_id,
        userId: user.id,
        error: e instanceof Error ? e.message : 'Unknown',
      })
      return apiError('SERVER_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR)
    }
  },
  { roles: ['vet', 'admin'] }
)
