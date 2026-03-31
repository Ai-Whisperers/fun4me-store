import { NextResponse } from 'next/server'
import { withApiAuth, type ApiHandlerContext } from '@/lib/auth'
import { apiError, HTTP_STATUS } from '@/lib/api/errors'
import { logger } from '@/lib/logger'
import type { SupabaseClient } from '@supabase/supabase-js'
import { analyticsExportQuerySchema } from '@/lib/schemas/analytics'

export const dynamic = 'force-dynamic'

type ExportType = 'revenue' | 'appointments' | 'clients' | 'services' | 'inventory' | 'customers'

interface ExportConfig {
  title: string
  getQuery: (
    supabase: SupabaseClient,
    tenantId: string,
    startDate: string,
    endDate: string
  ) => Promise<{ data: Record<string, unknown>[] | null; error: unknown }>
  columns: { key: string; header: string; format?: (value: unknown) => string }[]
}

const formatCurrency = (value: unknown): string => {
  const num = typeof value === 'number' ? value : parseFloat(String(value)) || 0
  return `Gs ${num.toLocaleString('es-PY')}`
}

const formatDate = (value: unknown): string => {
  if (!value) return ''
  return new Date(String(value)).toLocaleDateString('es-PY')
}

const formatDateTime = (value: unknown): string => {
  if (!value) return ''
  return new Date(String(value)).toLocaleString('es-PY')
}

/**
 * GET /api/analytics/export
 * Export analytics data in CSV or PDF format
 */
export const GET = withApiAuth(
  async ({ request, user, profile, supabase }: ApiHandlerContext) => {
    const { searchParams } = new URL(request.url)

    // Validate query parameters
    const queryValidation = analyticsExportQuerySchema.safeParse({
      type: searchParams.get('type'),
      format: searchParams.get('format'),
      startDate: searchParams.get('startDate'),
      endDate: searchParams.get('endDate'),
    })

    if (!queryValidation.success) {
      return apiError('VALIDATION_ERROR', HTTP_STATUS.BAD_REQUEST, {
        details: { issues: queryValidation.error.issues },
      })
    }

    const { type, format } = queryValidation.data
    const startDate = queryValidation.data.startDate || getDefaultStartDate()
    const endDate = queryValidation.data.endDate || new Date().toISOString().split('T')[0]

    try {
      const tenantId = profile.tenant_id

      // Get export config based on type
      const config = getExportConfig(type)
      if (!config) {
        return apiError('VALIDATION_ERROR', HTTP_STATUS.BAD_REQUEST, {
          details: { message: 'Tipo de exportación no válido' },
        })
      }

      // Fetch data
      const { data, error } = await config.getQuery(supabase, tenantId, startDate, endDate)

      if (error) {
        logger.error('Export query error', {
          tenantId: profile.tenant_id,
          userId: user.id,
          exportType: type,
          error: error instanceof Error ? error.message : String(error),
        })
        return apiError('DATABASE_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR)
      }

      if (!data || data.length === 0) {
        return apiError('NOT_FOUND', HTTP_STATUS.NOT_FOUND, {
          details: { message: 'No hay datos para exportar' },
        })
      }

      // Generate CSV
      if (format === 'csv') {
        const csv = generateCSV(data, config.columns)
        return new NextResponse(csv, {
          headers: {
            'Content-Type': 'text/csv; charset=utf-8',
            'Content-Disposition': `attachment; filename="${type}-${startDate}-${endDate}.csv"`,
          },
        })
      }

      // Return JSON data for client-side PDF generation
      if (format === 'pdf' || format === 'json') {
        return NextResponse.json({
          type,
          title: config.title,
          columns: config.columns.map((col) => ({ key: col.key, header: col.header })),
          data,
          period: { startDate, endDate },
        })
      }

      return apiError('VALIDATION_ERROR', HTTP_STATUS.BAD_REQUEST, {
        details: { message: 'Formato no soportado' },
      })
    } catch (error) {
      logger.error('Export error', {
        tenantId: profile.tenant_id,
        userId: user.id,
        error: error instanceof Error ? error.message : 'Unknown',
      })
      return apiError('SERVER_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR)
    }
  },
  { roles: ['vet', 'admin'] }
)

function getDefaultStartDate(): string {
  const date = new Date()
  date.setMonth(date.getMonth() - 1)
  return date.toISOString().split('T')[0]
}

function getExportConfig(type: ExportType): ExportConfig | null {
  const configs: Record<ExportType, ExportConfig> = {
    revenue: {
      title: 'Ingresos',
      getQuery: async (supabase, tenantId, startDate, endDate) => {
        return supabase
          .from('invoices')
          .select('invoice_number, client:profiles!client_id(full_name), total, status, created_at')
          .eq('tenant_id', tenantId)
          .gte('created_at', startDate)
          .lte('created_at', endDate + 'T23:59:59')
          .order('created_at', { ascending: false })
      },
      columns: [
        { key: 'invoice_number', header: 'Nro. Factura' },
        { key: 'client.full_name', header: 'Cliente' },
        { key: 'total', header: 'Total', format: formatCurrency },
        { key: 'status', header: 'Estado' },
        { key: 'created_at', header: 'Fecha', format: formatDateTime },
      ],
    },
    appointments: {
      title: 'Citas',
      getQuery: async (supabase, tenantId, startDate, endDate) => {
        return supabase
          .from('appointments')
          .select(`
            id,
            start_time,
            end_time,
            status,
            pet:pets!pet_id(name, species),
            service:services!service_id(name),
            vet:profiles!vet_id(full_name)
          `)
          .eq('tenant_id', tenantId)
          .gte('start_time', startDate)
          .lte('start_time', endDate + 'T23:59:59')
          .order('start_time', { ascending: false })
      },
      columns: [
        { key: 'start_time', header: 'Fecha/Hora', format: formatDateTime },
        { key: 'pet.name', header: 'Mascota' },
        { key: 'pet.species', header: 'Especie' },
        { key: 'service.name', header: 'Servicio' },
        { key: 'vet.full_name', header: 'Veterinario' },
        { key: 'status', header: 'Estado' },
      ],
    },
    clients: {
      title: 'Clientes',
      getQuery: async (supabase, tenantId, startDate, endDate) => {
        return supabase
          .from('profiles')
          .select('full_name, email, phone, created_at')
          .eq('tenant_id', tenantId)
          .eq('role', 'owner')
          .gte('created_at', startDate)
          .lte('created_at', endDate + 'T23:59:59')
          .order('created_at', { ascending: false })
      },
      columns: [
        { key: 'full_name', header: 'Nombre' },
        { key: 'email', header: 'Email' },
        { key: 'phone', header: 'Teléfono' },
        { key: 'created_at', header: 'Fecha Registro', format: formatDate },
      ],
    },
    services: {
      title: 'Servicios',
      getQuery: async (supabase, tenantId) => {
        return supabase
          .from('services')
          .select('name, category, base_price, duration_minutes, is_active')
          .eq('tenant_id', tenantId)
          .order('name')
      },
      columns: [
        { key: 'name', header: 'Servicio' },
        { key: 'category', header: 'Categoría' },
        { key: 'base_price', header: 'Precio Base', format: formatCurrency },
        { key: 'duration_minutes', header: 'Duración (min)' },
        { key: 'is_active', header: 'Activo' },
      ],
    },
    inventory: {
      title: 'Inventario',
      getQuery: async (supabase, tenantId) => {
        return supabase
          .from('store_products')
          .select(`
            sku,
            name,
            base_price,
            is_active,
            inventory:store_inventory(stock_quantity, reorder_point)
          `)
          .eq('tenant_id', tenantId)
          .order('name')
      },
      columns: [
        { key: 'sku', header: 'SKU' },
        { key: 'name', header: 'Producto' },
        { key: 'base_price', header: 'Precio', format: formatCurrency },
        { key: 'inventory.stock_quantity', header: 'Stock' },
        { key: 'inventory.reorder_point', header: 'Punto Reorden' },
        { key: 'is_active', header: 'Activo' },
      ],
    },
    customers: {
      title: 'Segmentación de Clientes',
      getQuery: async (supabase, tenantId) => {
        // This would ideally call the customer segmentation RPC
        return supabase
          .from('profiles')
          .select(`
            full_name,
            email,
            phone,
            created_at
          `)
          .eq('tenant_id', tenantId)
          .eq('role', 'owner')
          .order('full_name')
      },
      columns: [
        { key: 'full_name', header: 'Cliente' },
        { key: 'email', header: 'Email' },
        { key: 'phone', header: 'Teléfono' },
        { key: 'created_at', header: 'Cliente desde', format: formatDate },
      ],
    },
  }

  return configs[type] || null
}

function generateCSV(
  data: Record<string, unknown>[],
  columns: ExportConfig['columns']
): string {
  // Header row
  const headers = columns.map((col) => col.header).join(',')

  // Data rows
  const rows = data.map((row) => {
    return columns
      .map((col) => {
        // Handle nested keys like "client.full_name"
        const value = getNestedValue(row, col.key)
        const formatted = col.format ? col.format(value) : String(value ?? '')
        // Escape quotes and wrap in quotes if contains comma
        const escaped = formatted.replace(/"/g, '""')
        return escaped.includes(',') || escaped.includes('\n') || escaped.includes('"')
          ? `"${escaped}"`
          : escaped
      })
      .join(',')
  })

  return [headers, ...rows].join('\n')
}

function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  return path.split('.').reduce((current: unknown, key) => {
    if (current && typeof current === 'object' && key in current) {
      return (current as Record<string, unknown>)[key]
    }
    return undefined
  }, obj)
}
