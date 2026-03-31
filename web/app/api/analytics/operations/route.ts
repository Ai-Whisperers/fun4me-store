import { NextResponse } from 'next/server'
import { withApiAuth, type ApiHandlerContext } from '@/lib/auth'
import { apiError, HTTP_STATUS } from '@/lib/api/errors'
import { logger } from '@/lib/logger'
import type { SupabaseClient } from '@supabase/supabase-js'
import { z } from 'zod'

const operationsAnalyticsQuerySchema = z.object({
  period: z.enum(['week', 'month', 'quarter']).default('month'),
})

export const dynamic = 'force-dynamic'

interface DateRange {
  start: Date
  end: Date
}

/**
 * GET /api/analytics/operations
 * Fetch operational analytics data including no-show rates, peak hours, etc.
 * Staff only
 */
export const GET = withApiAuth(
  async ({ request, profile, supabase }: ApiHandlerContext) => {
    const { searchParams } = new URL(request.url)
    
    const queryResult = operationsAnalyticsQuerySchema.safeParse({
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
      const dateRange = getDateRange(period as 'week' | 'month' | 'quarter')

      const [
        appointmentMetrics,
        peakHoursData,
        vetUtilization,
        serviceDurationAccuracy,
        appointmentsByDayOfWeek,
      ] = await Promise.all([
        getAppointmentMetrics(supabase, tenantId, dateRange),
        getPeakHoursData(supabase, tenantId, dateRange),
        getVetUtilization(supabase, tenantId, dateRange),
        getServiceDurationAccuracy(supabase, tenantId, dateRange),
        getAppointmentsByDayOfWeek(supabase, tenantId, dateRange),
      ])

      return NextResponse.json({
        appointmentMetrics,
        peakHoursData,
        vetUtilization,
        serviceDurationAccuracy,
        appointmentsByDayOfWeek,
      })
    } catch (error) {
      logger.error('Operations analytics error', {
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

  switch (period) {
    case 'week':
      start = new Date(now)
      start.setDate(now.getDate() - 6)
      start.setHours(0, 0, 0, 0)
      break

    case 'quarter':
      start = new Date(now)
      start.setMonth(now.getMonth() - 2)
      start.setDate(1)
      start.setHours(0, 0, 0, 0)
      break

    case 'month':
    default:
      start = new Date(now.getFullYear(), now.getMonth(), 1)
      start.setHours(0, 0, 0, 0)
      break
  }

  return { start, end }
}

/**
 * Get appointment metrics (completion, no-show, cancellation rates)
 */
async function getAppointmentMetrics(
  supabase: SupabaseClient,
  tenantId: string,
  dateRange: DateRange
): Promise<{
  total: number
  completed: number
  noShows: number
  cancelled: number
  completionRate: number
  noShowRate: number
  cancellationRate: number
}> {
  const { data: appointments } = await supabase
    .from('appointments')
    .select('status')
    .eq('tenant_id', tenantId)
    .gte('start_time', dateRange.start.toISOString())
    .lte('start_time', dateRange.end.toISOString())

  if (!appointments || appointments.length === 0) {
    return {
      total: 0,
      completed: 0,
      noShows: 0,
      cancelled: 0,
      completionRate: 0,
      noShowRate: 0,
      cancellationRate: 0,
    }
  }

  const total = appointments.length
  const completed = appointments.filter((a) => a.status === 'completed').length
  const noShows = appointments.filter((a) => a.status === 'no_show').length
  const cancelled = appointments.filter((a) => a.status === 'cancelled').length

  return {
    total,
    completed,
    noShows,
    cancelled,
    completionRate: Math.round((completed / total) * 100),
    noShowRate: Math.round((noShows / total) * 100),
    cancellationRate: Math.round((cancelled / total) * 100),
  }
}

/**
 * Get peak hours heatmap data
 */
async function getPeakHoursData(
  supabase: SupabaseClient,
  tenantId: string,
  dateRange: DateRange
): Promise<{ hour: number; dayOfWeek: number; count: number }[]> {
  const { data: appointments } = await supabase
    .from('appointments')
    .select('start_time')
    .eq('tenant_id', tenantId)
    .in('status', ['scheduled', 'completed', 'checked_in'])
    .gte('start_time', dateRange.start.toISOString())
    .lte('start_time', dateRange.end.toISOString())

  if (!appointments || appointments.length === 0) {
    return []
  }

  // Create a map for hour/day combinations
  const heatmapData = new Map<string, number>()

  appointments.forEach((apt) => {
    const date = new Date(apt.start_time)
    const hour = date.getHours()
    const dayOfWeek = date.getDay() // 0 = Sunday
    const key = `${dayOfWeek}-${hour}`

    heatmapData.set(key, (heatmapData.get(key) || 0) + 1)
  })

  // Convert to array format suitable for heatmap
  const result: { hour: number; dayOfWeek: number; count: number }[] = []

  // Business hours: 7am to 8pm
  for (let day = 0; day < 7; day++) {
    for (let hour = 7; hour <= 20; hour++) {
      const key = `${day}-${hour}`
      result.push({
        hour,
        dayOfWeek: day,
        count: heatmapData.get(key) || 0,
      })
    }
  }

  return result
}

/**
 * Get vet utilization rates
 */
async function getVetUtilization(
  supabase: SupabaseClient,
  tenantId: string,
  dateRange: DateRange
): Promise<{ vetId: string; vetName: string; appointments: number; totalMinutes: number; utilizationRate: number }[]> {
  // Get all vets
  const { data: vets } = await supabase
    .from('profiles')
    .select('id, full_name')
    .eq('tenant_id', tenantId)
    .in('role', ['vet', 'admin'])

  if (!vets || vets.length === 0) {
    return []
  }

  // Get appointments per vet
  const { data: appointments } = await supabase
    .from('appointments')
    .select('vet_id, start_time, end_time, status')
    .eq('tenant_id', tenantId)
    .eq('status', 'completed')
    .gte('start_time', dateRange.start.toISOString())
    .lte('start_time', dateRange.end.toISOString())

  // Calculate utilization per vet
  const vetAppointments = new Map<string, { count: number; totalMinutes: number }>()

  appointments?.forEach((apt) => {
    if (!apt.vet_id) return

    const start = new Date(apt.start_time)
    const end = new Date(apt.end_time)
    const durationMinutes = (end.getTime() - start.getTime()) / (1000 * 60)

    const current = vetAppointments.get(apt.vet_id) || { count: 0, totalMinutes: 0 }
    vetAppointments.set(apt.vet_id, {
      count: current.count + 1,
      totalMinutes: current.totalMinutes + durationMinutes,
    })
  })

  // Calculate available hours in the period (assuming 8-hour workday, 5 days/week)
  const daysDiff = Math.ceil(
    (dateRange.end.getTime() - dateRange.start.getTime()) / (1000 * 60 * 60 * 24)
  )
  const workDays = Math.floor(daysDiff * (5 / 7))
  const availableMinutesPerVet = workDays * 8 * 60

  return vets.map((vet) => {
    const data = vetAppointments.get(vet.id) || { count: 0, totalMinutes: 0 }
    const utilizationRate =
      availableMinutesPerVet > 0
        ? Math.min(100, Math.round((data.totalMinutes / availableMinutesPerVet) * 100))
        : 0

    return {
      vetId: vet.id,
      vetName: vet.full_name || 'Sin nombre',
      appointments: data.count,
      totalMinutes: Math.round(data.totalMinutes),
      utilizationRate,
    }
  }).sort((a, b) => b.utilizationRate - a.utilizationRate)
}

/**
 * Get service duration accuracy
 */
async function getServiceDurationAccuracy(
  supabase: SupabaseClient,
  tenantId: string,
  dateRange: DateRange
): Promise<{
  avgActualDuration: number
  avgExpectedDuration: number
  accuracyRate: number
  overtimeAppointments: number
  undertimeAppointments: number
}> {
  const { data: appointments } = await supabase
    .from('appointments')
    .select(`
      start_time,
      end_time,
      service:services!service_id(duration_minutes)
    `)
    .eq('tenant_id', tenantId)
    .eq('status', 'completed')
    .gte('start_time', dateRange.start.toISOString())
    .lte('start_time', dateRange.end.toISOString())

  if (!appointments || appointments.length === 0) {
    return {
      avgActualDuration: 0,
      avgExpectedDuration: 0,
      accuracyRate: 0,
      overtimeAppointments: 0,
      undertimeAppointments: 0,
    }
  }

  let totalActual = 0
  let totalExpected = 0
  let overtimeCount = 0
  let undertimeCount = 0
  let validCount = 0

  appointments.forEach((apt) => {
    // Supabase returns nested objects as single item, handle possible array
    const serviceData = apt.service
    const service = Array.isArray(serviceData) ? serviceData[0] : serviceData
    if (!service?.duration_minutes) return

    const start = new Date(apt.start_time)
    const end = new Date(apt.end_time)
    const actualMinutes = (end.getTime() - start.getTime()) / (1000 * 60)
    const expectedMinutes = service.duration_minutes

    totalActual += actualMinutes
    totalExpected += expectedMinutes
    validCount++

    // More than 15% over expected = overtime
    if (actualMinutes > expectedMinutes * 1.15) {
      overtimeCount++
    }
    // More than 15% under expected = undertime
    if (actualMinutes < expectedMinutes * 0.85) {
      undertimeCount++
    }
  })

  const avgActual = validCount > 0 ? Math.round(totalActual / validCount) : 0
  const avgExpected = validCount > 0 ? Math.round(totalExpected / validCount) : 0
  const accuracyRate =
    avgExpected > 0 ? Math.round((1 - Math.abs(avgActual - avgExpected) / avgExpected) * 100) : 0

  return {
    avgActualDuration: avgActual,
    avgExpectedDuration: avgExpected,
    accuracyRate: Math.max(0, accuracyRate),
    overtimeAppointments: overtimeCount,
    undertimeAppointments: undertimeCount,
  }
}

/**
 * Get appointments by day of week
 */
async function getAppointmentsByDayOfWeek(
  supabase: SupabaseClient,
  tenantId: string,
  dateRange: DateRange
): Promise<{ day: string; appointments: number; revenue: number }[]> {
  const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']

  const { data: appointments } = await supabase
    .from('appointments')
    .select('start_time')
    .eq('tenant_id', tenantId)
    .in('status', ['scheduled', 'completed', 'checked_in'])
    .gte('start_time', dateRange.start.toISOString())
    .lte('start_time', dateRange.end.toISOString())

  const { data: invoices } = await supabase
    .from('invoices')
    .select('created_at, total')
    .eq('tenant_id', tenantId)
    .eq('status', 'paid')
    .gte('created_at', dateRange.start.toISOString())
    .lte('created_at', dateRange.end.toISOString())

  const dayAppointments = new Map<number, number>()
  const dayRevenue = new Map<number, number>()

  appointments?.forEach((apt) => {
    const day = new Date(apt.start_time).getDay()
    dayAppointments.set(day, (dayAppointments.get(day) || 0) + 1)
  })

  invoices?.forEach((inv) => {
    const day = new Date(inv.created_at).getDay()
    dayRevenue.set(day, (dayRevenue.get(day) || 0) + (inv.total || 0))
  })

  return dayNames.map((name, index) => ({
    day: name,
    appointments: dayAppointments.get(index) || 0,
    revenue: dayRevenue.get(index) || 0,
  }))
}
