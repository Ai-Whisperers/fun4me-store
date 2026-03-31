import { NextResponse } from 'next/server'
import { withApiAuth, type ApiHandlerContext } from '@/lib/auth'
import { apiError, HTTP_STATUS } from '@/lib/api/errors'
import { logger } from '@/lib/logger'
import { z } from 'zod'

const exportSchema = z.object({
  client_ids: z.array(z.string().uuid()).min(1, 'Se requiere al menos un cliente'),
  fields: z
    .array(
      z.enum([
        'full_name',
        'email',
        'phone',
        'segment',
        'total_orders',
        'total_spent',
        'avg_order_value',
        'first_order_date',
        'last_order_date',
        'days_since_last_order',
        'loyalty_points',
        'created_at',
      ])
    )
    .min(1, 'Se requiere al menos un campo'),
  format: z.enum(['csv', 'json']).default('csv'),
})

interface CustomerExportData {
  id: string
  full_name: string | null
  email: string | null
  phone: string | null
  created_at: string
  // Computed fields from analytics
  segment?: string
  total_orders?: number
  total_spent?: number
  avg_order_value?: number
  first_order_date?: string | null
  last_order_date?: string | null
  days_since_last_order?: number | null
  loyalty_points?: number
}

const FIELD_LABELS: Record<string, string> = {
  full_name: 'Nombre',
  email: 'Email',
  phone: 'Teléfono',
  segment: 'Segmento',
  total_orders: 'Total Pedidos',
  total_spent: 'Total Gastado',
  avg_order_value: 'Valor Promedio',
  first_order_date: 'Primera Compra',
  last_order_date: 'Última Compra',
  days_since_last_order: 'Días Sin Comprar',
  loyalty_points: 'Puntos',
  created_at: 'Fecha Registro',
}

const SEGMENT_LABELS: Record<string, string> = {
  vip: 'VIP',
  regular: 'Regular',
  at_risk: 'En Riesgo',
  dormant: 'Inactivo',
  new: 'Nuevo',
}

function calculateSegment(
  totalOrders: number,
  totalSpent: number,
  daysSinceLastOrder: number | null
): string {
  // VIP: High value customers (top spenders with recent activity)
  if (totalSpent > 1000000 && totalOrders >= 5) return 'vip'

  // At Risk: Previously active customers who haven't purchased recently
  if (daysSinceLastOrder !== null && daysSinceLastOrder > 60 && totalOrders >= 2) return 'at_risk'

  // Dormant: No activity for a long time
  if (daysSinceLastOrder !== null && daysSinceLastOrder > 120) return 'dormant'

  // New: Recent first-time customers
  if (totalOrders <= 1) return 'new'

  // Regular: Active returning customers
  return 'regular'
}

function generateCSV(data: CustomerExportData[], fields: string[]): string {
  // Header row
  const headers = fields.map((f) => FIELD_LABELS[f] || f)
  const lines = [headers.join(',')]

  // Data rows
  for (const row of data) {
    const values = fields.map((field) => {
      const value = row[field as keyof CustomerExportData]
      if (value === null || value === undefined) return ''

      // Handle special formatting
      if (field === 'segment') {
        return SEGMENT_LABELS[value as string] || value
      }
      if (field === 'total_spent' || field === 'avg_order_value') {
        return (value as number).toLocaleString('es-PY')
      }
      if (field.includes('date') && value) {
        return new Date(value as string).toLocaleDateString('es-PY')
      }

      // Escape CSV special characters
      const strValue = String(value)
      if (strValue.includes(',') || strValue.includes('"') || strValue.includes('\n')) {
        return `"${strValue.replace(/"/g, '""')}"`
      }
      return strValue
    })
    lines.push(values.join(','))
  }

  return lines.join('\n')
}

/**
 * POST /api/clients/export - Export client data to CSV or JSON
 */
export const POST = withApiAuth(
  async ({ request, user, profile, supabase }: ApiHandlerContext) => {
    try {
      const body = await request.json()
      const validation = exportSchema.safeParse(body)

      if (!validation.success) {
        return apiError('VALIDATION_ERROR', HTTP_STATUS.BAD_REQUEST, {
          details: validation.error.flatten(),
        })
      }

      const { client_ids, fields, format } = validation.data

      // Fetch base client data
      const { data: clients, error: clientsError } = await supabase
        .from('profiles')
        .select('id, full_name, email, phone, created_at')
        .in('id', client_ids)
        .eq('tenant_id', profile.tenant_id)

      if (clientsError) {
        logger.error('Error fetching clients for export', {
          tenantId: profile.tenant_id,
          error: clientsError.message,
        })
        return apiError('DATABASE_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR)
      }

      if (!clients || clients.length === 0) {
        return apiError('NOT_FOUND', HTTP_STATUS.NOT_FOUND, {
          details: { message: 'No se encontraron clientes' },
        })
      }

      // Check if we need order analytics
      const needsOrderAnalytics = fields.some((f) =>
        [
          'segment',
          'total_orders',
          'total_spent',
          'avg_order_value',
          'first_order_date',
          'last_order_date',
          'days_since_last_order',
        ].includes(f)
      )

      // Check if we need loyalty points
      const needsLoyalty = fields.includes('loyalty_points')

      // Fetch order analytics if needed
      const orderAnalytics: Map<
        string,
        {
          total_orders: number
          total_spent: number
          first_order_date: string | null
          last_order_date: string | null
        }
      > = new Map()

      if (needsOrderAnalytics) {
        const { data: orders } = await supabase
          .from('store_orders')
          .select('customer_id, total, created_at')
          .in('customer_id', client_ids)
          .eq('tenant_id', profile.tenant_id)
          .eq('status', 'delivered')

        if (orders) {
          // Aggregate order data per customer
          for (const order of orders) {
            const existing = orderAnalytics.get(order.customer_id)
            if (existing) {
              existing.total_orders++
              existing.total_spent += order.total || 0
              if (!existing.first_order_date || order.created_at < existing.first_order_date) {
                existing.first_order_date = order.created_at
              }
              if (!existing.last_order_date || order.created_at > existing.last_order_date) {
                existing.last_order_date = order.created_at
              }
            } else {
              orderAnalytics.set(order.customer_id, {
                total_orders: 1,
                total_spent: order.total || 0,
                first_order_date: order.created_at,
                last_order_date: order.created_at,
              })
            }
          }
        }
      }

      // Fetch loyalty points if needed
      const loyaltyPoints: Map<string, number> = new Map()
      if (needsLoyalty) {
        const { data: loyalty } = await supabase
          .from('loyalty_points')
          .select('user_id, balance')
          .in('user_id', client_ids)

        if (loyalty) {
          for (const l of loyalty) {
            loyaltyPoints.set(l.user_id, l.balance || 0)
          }
        }
      }

      // Build export data
      const now = new Date()
      const exportData: CustomerExportData[] = clients.map((client) => {
        const analytics = orderAnalytics.get(client.id)
        const daysSinceLastOrder = analytics?.last_order_date
          ? Math.floor(
              (now.getTime() - new Date(analytics.last_order_date).getTime()) / (1000 * 60 * 60 * 24)
            )
          : null

        return {
          id: client.id,
          full_name: client.full_name,
          email: client.email,
          phone: client.phone,
          created_at: client.created_at,
          segment: calculateSegment(
            analytics?.total_orders || 0,
            analytics?.total_spent || 0,
            daysSinceLastOrder
          ),
          total_orders: analytics?.total_orders || 0,
          total_spent: analytics?.total_spent || 0,
          avg_order_value:
            analytics && analytics.total_orders > 0
              ? Math.round(analytics.total_spent / analytics.total_orders)
              : 0,
          first_order_date: analytics?.first_order_date || null,
          last_order_date: analytics?.last_order_date || null,
          days_since_last_order: daysSinceLastOrder,
          loyalty_points: loyaltyPoints.get(client.id) || 0,
        }
      })

      // Log export action for audit
      await supabase.from('audit_logs').insert({
        tenant_id: profile.tenant_id,
        user_id: user.id,
        action: 'export_clients',
        resource: 'clients',
        details: {
          total_clients: client_ids.length,
          exported: exportData.length,
          fields,
          format,
        },
      })

      logger.info('Client export completed', {
        tenantId: profile.tenant_id,
        userId: user.id,
        count: exportData.length,
        format,
      })

      // Return data in requested format
      if (format === 'csv') {
        const csv = generateCSV(exportData, fields)
        const timestamp = now.toISOString().replace(/[:.]/g, '-').slice(0, 19)

        return new NextResponse(csv, {
          headers: {
            'Content-Type': 'text/csv; charset=utf-8',
            'Content-Disposition': `attachment; filename=clientes-${timestamp}.csv`,
          },
        })
      }

      // JSON format
      return NextResponse.json({
        success: true,
        count: exportData.length,
        data: exportData.map((row) => {
          const filtered: Record<string, unknown> = {}
          for (const field of fields) {
            filtered[field] = row[field as keyof CustomerExportData]
          }
          return filtered
        }),
      })
    } catch (error) {
      logger.error('Client export error', {
        tenantId: profile.tenant_id,
        error: error instanceof Error ? error.message : 'Unknown',
      })
      return apiError('SERVER_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR)
    }
  },
  { roles: ['vet', 'admin'], rateLimit: 'default' }
)
