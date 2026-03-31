import { NextResponse } from 'next/server'
import { withApiAuth, type ApiHandlerContext } from '@/lib/auth'
import { apiError, apiSuccess, HTTP_STATUS } from '@/lib/api/errors'
import { logger } from '@/lib/logger'
import { z } from 'zod'

// Validation schema for creating/updating suppliers
const supplierSchema = z.object({
  name: z.string().min(1, 'Nombre es requerido'),
  legal_name: z.string().optional(),
  tax_id: z.string().optional(),
  contact_info: z
    .object({
      email: z.string().email().optional(),
      phone: z.string().optional(),
      address: z.string().optional(),
      city: z.string().optional(),
      country: z.string().optional(),
      contact_person: z.string().optional(),
    })
    .optional(),
  supplier_type: z.enum(['products', 'services', 'both']).default('products'),
  minimum_order_amount: z.number().min(0).optional(),
  payment_terms: z.string().optional(),
  delivery_time_days: z.number().int().min(0).optional(),
  notes: z.string().optional(),
})

/**
 * GET /api/suppliers
 * List suppliers with filters (staff only)
 */
export const GET = withApiAuth(
  async ({ request, profile, supabase }: ApiHandlerContext) => {
    try {
      const { searchParams } = new URL(request.url)
      const search = searchParams.get('search')
      const supplierType = searchParams.get('type')
      const verificationStatus = searchParams.get('status')
      const limit = parseInt(searchParams.get('limit') || '50')
      const offset = parseInt(searchParams.get('offset') || '0')

      // Build query
      let query = supabase
        .from('suppliers')
        .select('*', { count: 'exact' })
        .eq('tenant_id', profile.tenant_id)
        .eq('is_active', true)
        .order('name', { ascending: true })

      if (search) {
        query = query.or(`name.ilike.%${search}%,legal_name.ilike.%${search}%,tax_id.ilike.%${search}%`)
      }

      if (supplierType) {
        query = query.eq('supplier_type', supplierType)
      }

      if (verificationStatus) {
        query = query.eq('verification_status', verificationStatus)
      }

      query = query.range(offset, offset + limit - 1)

      const { data: suppliers, error, count } = await query

      if (error) {
        logger.error('Error fetching suppliers', {
          tenantId: profile.tenant_id,
          error: error.message,
        })
        return apiError('DATABASE_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR)
      }

      return NextResponse.json({
        suppliers,
        total: count || 0,
        limit,
        offset,
      })
    } catch (error) {
      logger.error('Suppliers GET error', {
        tenantId: profile.tenant_id,
        error: error instanceof Error ? error.message : 'Unknown',
      })
      return apiError('SERVER_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR)
    }
  },
  { roles: ['vet', 'admin'] }
)

/**
 * POST /api/suppliers
 * Create a new supplier (admin only)
 */
export const POST = withApiAuth(
  async ({ request, user, profile, supabase }: ApiHandlerContext) => {
    try {
      // Parse and validate body
      const body = await request.json()
      const validation = supplierSchema.safeParse(body)

      if (!validation.success) {
        return apiError('VALIDATION_ERROR', HTTP_STATUS.BAD_REQUEST, {
          details: validation.error.flatten(),
        })
      }

      const supplierData = validation.data

      // Create supplier
      const { data: supplier, error } = await supabase
        .from('suppliers')
        .insert({
          tenant_id: profile.tenant_id,
          name: supplierData.name,
          legal_name: supplierData.legal_name,
          tax_id: supplierData.tax_id,
          contact_info: supplierData.contact_info,
          supplier_type: supplierData.supplier_type,
          minimum_order_amount: supplierData.minimum_order_amount,
          payment_terms: supplierData.payment_terms,
          delivery_time_days: supplierData.delivery_time_days,
          notes: supplierData.notes,
          verification_status: 'pending',
          is_active: true,
          created_by: user.id,
        })
        .select()
        .single()

      if (error) {
        logger.error('Error creating supplier', {
          tenantId: profile.tenant_id,
          userId: user.id,
          error: error.message,
        })
        return apiError('DATABASE_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR)
      }

      return apiSuccess(supplier, 'Proveedor creado', HTTP_STATUS.CREATED)
    } catch (error) {
      logger.error('Suppliers POST error', {
        tenantId: profile.tenant_id,
        error: error instanceof Error ? error.message : 'Unknown',
      })
      return apiError('SERVER_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR)
    }
  },
  { roles: ['admin'], rateLimit: 'write' }
)
