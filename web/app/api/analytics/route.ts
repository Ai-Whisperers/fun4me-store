import { NextResponse } from 'next/server'
import { withApiAuth, type ApiHandlerContext } from '@/lib/auth'
import { apiError, HTTP_STATUS } from '@/lib/api/errors'
import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'
import { z } from 'zod'

const analyticsQuerySchema = z.object({
  period: z.enum(['week', 'month', 'quarter']).default('month'),
})

export const dynamic = 'force-dynamic'

interface DateRange {
  start: Date
  end: Date
  previousStart: Date
  previousEnd: Date
}

/**
 * GET /api/analytics
 * Fetch analytics data for a clinic
 * Staff only
 */
export const GET = withApiAuth(
  async ({ request, profile, supabase }: ApiHandlerContext) => {
    const { searchParams } = new URL(request.url)
    
    const queryResult = analyticsQuerySchema.safeParse({
      period: searchParams.get('period'),
    })

    if (!queryResult.success) {
      return apiError('VALIDATION_ERROR', HTTP_STATUS.BAD_REQUEST, {
        details: { issues: queryResult.error.issues },
      })
    }

    const { period } = queryResult.data
    const tenantId = profile.tenant_id

    try {
      // Calculate date ranges
      const dateRange = getDateRange(period as 'week' | 'month' | 'quarter')

      // Fetch all analytics data in parallel
      const [
        revenueData,
        appointmentData,
        clientData,
        petData,
        dailyRevenue,
        appointmentsByType,
        topServices,
      ] = await Promise.all([
        getRevenueStats(supabase, tenantId, dateRange),
        getAppointmentStats(supabase, tenantId, dateRange),
        getClientStats(supabase, tenantId, dateRange),
        getPetStats(supabase, tenantId, dateRange),
        getDailyRevenue(supabase, tenantId, dateRange),
        getAppointmentsByType(supabase, tenantId, dateRange),
        getTopServices(supabase, tenantId, dateRange),
      ])

      return NextResponse.json({
        stats: {
          revenue: revenueData,
          appointments: appointmentData,
          newClients: clientData,
          newPets: petData,
        },
        chartData: {
          revenueByDay: dailyRevenue,
          appointmentsByType,
          topServices,
        },
      })
    } catch (error) {
      logger.error('Analytics error', {
        tenantId,
        period,
        error: error instanceof Error ? error.message : 'Unknown',
      })
      return apiError('DATABASE_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR)
    }
  },
  { roles: ['vet', 'admin'] }
)

/**
 * Get date range based on period
 */
function getDateRange(period: 'week' | 'month' | 'quarter'): DateRange {
  const now = new Date()
  const end = new Date(now)
  end.setHours(23, 59, 59, 999)

  let start: Date
  let previousStart: Date
  let previousEnd: Date

  switch (period) {
    case 'week':
      start = new Date(now)
      start.setDate(now.getDate() - 6)
      start.setHours(0, 0, 0, 0)

      previousEnd = new Date(start)
      previousEnd.setDate(previousEnd.getDate() - 1)
      previousEnd.setHours(23, 59, 59, 999)

      previousStart = new Date(previousEnd)
      previousStart.setDate(previousStart.getDate() - 6)
      previousStart.setHours(0, 0, 0, 0)
      break

    case 'quarter':
      start = new Date(now)
      start.setMonth(now.getMonth() - 2)
      start.setDate(1)
      start.setHours(0, 0, 0, 0)

      previousEnd = new Date(start)
      previousEnd.setDate(previousEnd.getDate() - 1)
      previousEnd.setHours(23, 59, 59, 999)

      previousStart = new Date(previousEnd)
      previousStart.setMonth(previousStart.getMonth() - 2)
      previousStart.setDate(1)
      previousStart.setHours(0, 0, 0, 0)
      break

    case 'month':
    default:
      start = new Date(now.getFullYear(), now.getMonth(), 1)
      start.setHours(0, 0, 0, 0)

      previousEnd = new Date(start)
      previousEnd.setDate(previousEnd.getDate() - 1)
      previousEnd.setHours(23, 59, 59, 999)

      previousStart = new Date(previousEnd.getFullYear(), previousEnd.getMonth(), 1)
      previousStart.setHours(0, 0, 0, 0)
      break
  }

  return { start, end, previousStart, previousEnd }
}

/**
 * Get revenue statistics
 */
async function getRevenueStats(
  supabase: Awaited<ReturnType<typeof createClient>>,
  tenantId: string,
  dateRange: DateRange
) {
  // Current period
  const { data: currentData } = await supabase
    .from('invoices')
    .select('total')
    .eq('tenant_id', tenantId)
    .eq('status', 'paid')
    .gte('created_at', dateRange.start.toISOString())
    .lte('created_at', dateRange.end.toISOString())

  const current = currentData?.reduce((sum, inv) => sum + (inv.total || 0), 0) || 0

  // Previous period
  const { data: previousData } = await supabase
    .from('invoices')
    .select('total')
    .eq('tenant_id', tenantId)
    .eq('status', 'paid')
    .gte('created_at', dateRange.previousStart.toISOString())
    .lte('created_at', dateRange.previousEnd.toISOString())

  const previous = previousData?.reduce((sum, inv) => sum + (inv.total || 0), 0) || 0
  const change = previous > 0 ? ((current - previous) / previous) * 100 : 0

  return { current, previous, change }
}

/**
 * Get appointment statistics
 */
async function getAppointmentStats(
  supabase: Awaited<ReturnType<typeof createClient>>,
  tenantId: string,
  dateRange: DateRange
) {
  // Current period
  const { count: current } = await supabase
    .from('appointments')
    .select('*', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .gte('start_time', dateRange.start.toISOString())
    .lte('start_time', dateRange.end.toISOString())

  // Previous period
  const { count: previous } = await supabase
    .from('appointments')
    .select('*', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .gte('start_time', dateRange.previousStart.toISOString())
    .lte('start_time', dateRange.previousEnd.toISOString())

  const currentCount = current || 0
  const previousCount = previous || 0
  const change = previousCount > 0 ? ((currentCount - previousCount) / previousCount) * 100 : 0

  return { current: currentCount, previous: previousCount, change }
}

/**
 * Get new client statistics
 */
async function getClientStats(
  supabase: Awaited<ReturnType<typeof createClient>>,
  tenantId: string,
  dateRange: DateRange
) {
  // Current period
  const { count: current } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .eq('role', 'owner')
    .gte('created_at', dateRange.start.toISOString())
    .lte('created_at', dateRange.end.toISOString())

  // Previous period
  const { count: previous } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .eq('role', 'owner')
    .gte('created_at', dateRange.previousStart.toISOString())
    .lte('created_at', dateRange.previousEnd.toISOString())

  const currentCount = current || 0
  const previousCount = previous || 0
  const change = previousCount > 0 ? ((currentCount - previousCount) / previousCount) * 100 : 0

  return { current: currentCount, previous: previousCount, change }
}

/**
 * Get new pet statistics
 */
async function getPetStats(
  supabase: Awaited<ReturnType<typeof createClient>>,
  tenantId: string,
  dateRange: DateRange
) {
  // Current period
  const { count: current } = await supabase
    .from('pets')
    .select('*', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .gte('created_at', dateRange.start.toISOString())
    .lte('created_at', dateRange.end.toISOString())

  // Previous period
  const { count: previous } = await supabase
    .from('pets')
    .select('*', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .gte('created_at', dateRange.previousStart.toISOString())
    .lte('created_at', dateRange.previousEnd.toISOString())

  const currentCount = current || 0
  const previousCount = previous || 0
  const change = previousCount > 0 ? ((currentCount - previousCount) / previousCount) * 100 : 0

  return { current: currentCount, previous: previousCount, change }
}

/**
 * Get daily revenue for chart
 */
async function getDailyRevenue(
  supabase: Awaited<ReturnType<typeof createClient>>,
  tenantId: string,
  dateRange: DateRange
) {
  const { data: invoices } = await supabase
    .from('invoices')
    .select('total, created_at')
    .eq('tenant_id', tenantId)
    .eq('status', 'paid')
    .gte('created_at', dateRange.start.toISOString())
    .lte('created_at', dateRange.end.toISOString())
    .order('created_at', { ascending: true })

  if (!invoices || invoices.length === 0) {
    return []
  }

  // Group by day
  const dailyTotals = new Map<string, number>()
  const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']

  invoices.forEach((inv) => {
    const date = new Date(inv.created_at)
    const dayKey = dayNames[date.getDay()]
    dailyTotals.set(dayKey, (dailyTotals.get(dayKey) || 0) + (inv.total || 0))
  })

  // Return in order
  return dayNames
    .filter((day) => dailyTotals.has(day))
    .map((day) => ({
      date: day,
      amount: dailyTotals.get(day) || 0,
    }))
}

/**
 * Get appointments by type for pie chart
 */
async function getAppointmentsByType(
  supabase: Awaited<ReturnType<typeof createClient>>,
  tenantId: string,
  dateRange: DateRange
) {
  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899']

  const { data: appointments } = await supabase
    .from('appointments')
    .select('type')
    .eq('tenant_id', tenantId)
    .gte('start_time', dateRange.start.toISOString())
    .lte('start_time', dateRange.end.toISOString())

  if (!appointments || appointments.length === 0) {
    return []
  }

  // Count by type
  const typeCounts = new Map<string, number>()
  appointments.forEach((apt) => {
    const type = apt.type || 'Otro'
    typeCounts.set(type, (typeCounts.get(type) || 0) + 1)
  })

  // Convert to array and add colors
  return Array.from(typeCounts.entries())
    .map(([type, count], index) => ({
      type: formatAppointmentType(type),
      count,
      color: COLORS[index % COLORS.length],
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6) // Top 6
}

/**
 * Get top services by revenue
 */
async function getTopServices(
  supabase: Awaited<ReturnType<typeof createClient>>,
  tenantId: string,
  dateRange: DateRange
) {
  const { data: items } = await supabase
    .from('invoice_items')
    .select(
      `
      quantity,
      unit_price,
      total,
      service:services(id, name),
      invoice:invoices!inner(id, tenant_id, status, created_at)
    `
    )
    .eq('invoice.tenant_id', tenantId)
    .eq('invoice.status', 'paid')
    .gte('invoice.created_at', dateRange.start.toISOString())
    .lte('invoice.created_at', dateRange.end.toISOString())
    .not('service_id', 'is', null)

  if (!items || items.length === 0) {
    return []
  }

  // Aggregate by service
  const serviceStats = new Map<string, { revenue: number; count: number }>()

  items.forEach((item) => {
    const service = item.service as
      | { id: string; name: string }
      | { id: string; name: string }[]
      | null
    const serviceName = Array.isArray(service) ? service[0]?.name : service?.name
    if (!serviceName) return

    const current = serviceStats.get(serviceName) || { revenue: 0, count: 0 }
    serviceStats.set(serviceName, {
      revenue: current.revenue + (item.total || item.unit_price * item.quantity || 0),
      count: current.count + (item.quantity || 1),
    })
  })

  // Convert to array and sort
  return Array.from(serviceStats.entries())
    .map(([name, stats]) => ({
      name,
      revenue: stats.revenue,
      count: stats.count,
    }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5) // Top 5
}

/**
 * Format appointment type for display
 */
function formatAppointmentType(type: string): string {
  const typeNames: Record<string, string> = {
    consultation: 'Consulta General',
    checkup: 'Control',
    vaccination: 'Vacunación',
    surgery: 'Cirugía',
    emergency: 'Emergencia',
    grooming: 'Peluquería',
    dental: 'Dental',
    lab: 'Laboratorio',
    imaging: 'Imagen',
    other: 'Otro',
  }
  return typeNames[type.toLowerCase()] || type
}
