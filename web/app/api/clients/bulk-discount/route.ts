import { NextResponse } from 'next/server'
import { withApiAuth, type ApiHandlerContext } from '@/lib/auth'
import { apiError, HTTP_STATUS } from '@/lib/api/errors'
import { logger } from '@/lib/logger'
import { z } from 'zod'

const bulkDiscountSchema = z.object({
  client_ids: z.array(z.string().uuid()).min(1, 'Se requiere al menos un cliente'),
  discount_type: z.enum(['percentage', 'fixed_amount'], {
    message: 'Tipo de descuento inválido',
  }),
  discount_value: z.number().positive('El valor debe ser positivo'),
  valid_days: z.number().int().min(1).max(365).default(30),
  reason: z.string().min(1, 'Razón requerida').max(500),
  notify_clients: z.boolean().default(true),
})

interface BulkDiscountResult {
  success: boolean
  created: number
  failed: number
  coupons: Array<{ code: string; clientId: string }>
  errors: Array<{ clientId: string; error: string }>
}

/**
 * POST /api/clients/bulk-discount - Create personal discount coupons for selected clients
 */
export const POST = withApiAuth(
  async ({ request, user, profile, supabase }: ApiHandlerContext) => {
    try {
      const body = await request.json()
      const validation = bulkDiscountSchema.safeParse(body)

      if (!validation.success) {
        return apiError('VALIDATION_ERROR', HTTP_STATUS.BAD_REQUEST, {
          details: validation.error.flatten(),
        })
      }

      const { client_ids, discount_type, discount_value, valid_days, reason, notify_clients } =
        validation.data

      // Validate percentage range
      if (discount_type === 'percentage' && discount_value > 100) {
        return apiError('VALIDATION_ERROR', HTTP_STATUS.BAD_REQUEST, {
          details: { message: 'El porcentaje no puede ser mayor a 100%' },
        })
      }

      // Verify clients belong to tenant
      const { data: clients, error: clientsError } = await supabase
        .from('profiles')
        .select('id, email, full_name, phone')
        .in('id', client_ids)
        .eq('tenant_id', profile.tenant_id)

      if (clientsError) {
        logger.error('Error fetching clients for bulk discount', {
          tenantId: profile.tenant_id,
          error: clientsError.message,
        })
        return apiError('DATABASE_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR)
      }

      if (!clients || clients.length === 0) {
        return apiError('NOT_FOUND', HTTP_STATUS.NOT_FOUND, {
          details: { message: 'No se encontraron clientes válidos' },
        })
      }

      const now = new Date()
      const validUntil = new Date(now.getTime() + valid_days * 24 * 60 * 60 * 1000)

      const result: BulkDiscountResult = {
        success: true,
        created: 0,
        failed: 0,
        coupons: [],
        errors: [],
      }

      // Generate unique coupon code prefix based on timestamp
      const codePrefix = `SEG${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`

      // Create coupons for each client
      for (const client of clients) {
        // Generate unique code for this client
        const clientSuffix = client.id.slice(0, 6).toUpperCase()
        const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase()
        const code = `${codePrefix}-${clientSuffix}-${randomSuffix}`

        const { data: coupon, error: insertError } = await supabase
          .from('store_coupons')
          .insert({
            tenant_id: profile.tenant_id,
            code,
            name: `Descuento personal - ${client.full_name || 'Cliente'}`,
            description: reason,
            discount_type,
            discount_value,
            min_purchase_amount: 0,
            usage_limit: 1,
            usage_limit_per_user: 1,
            valid_from: now.toISOString(),
            valid_until: validUntil.toISOString(),
            is_active: true,
            created_by: user.id,
            usage_count: 0,
          })
          .select('id, code')
          .single()

        if (insertError) {
          result.failed++
          result.errors.push({
            clientId: client.id,
            error: insertError.message,
          })
          continue
        }

        result.created++
        result.coupons.push({
          code: coupon.code,
          clientId: client.id,
        })

        // Create a record linking coupon to specific user (for tracking)
        await supabase.from('notifications').insert({
          user_id: client.id,
          title: 'Nuevo descuento disponible',
          message: `Se te ha asignado un cupón de descuento: ${code}. ${discount_type === 'percentage' ? `${discount_value}% de descuento` : `Gs. ${discount_value.toLocaleString()} de descuento`}. Válido hasta ${validUntil.toLocaleDateString('es-PY')}.`,
          type: 'discount',
          read_at: null,
        })
      }

      // Log bulk action for audit
      await supabase.from('audit_logs').insert({
        tenant_id: profile.tenant_id,
        user_id: user.id,
        action: 'bulk_discount',
        resource: 'clients',
        details: {
          total_clients: client_ids.length,
          created: result.created,
          failed: result.failed,
          discount_type,
          discount_value,
          valid_days,
          reason,
        },
      })

      logger.info('Bulk discount completed', {
        tenantId: profile.tenant_id,
        userId: user.id,
        created: result.created,
        failed: result.failed,
      })

      return NextResponse.json(result)
    } catch (error) {
      logger.error('Bulk discount error', {
        tenantId: profile.tenant_id,
        error: error instanceof Error ? error.message : 'Unknown',
      })
      return apiError('SERVER_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR)
    }
  },
  { roles: ['vet', 'admin'], rateLimit: 'write' }
)
