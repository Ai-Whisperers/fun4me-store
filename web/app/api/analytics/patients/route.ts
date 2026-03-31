import { NextResponse } from 'next/server'
import { withApiAuth, type ApiHandlerContext } from '@/lib/auth'
import { apiError, HTTP_STATUS } from '@/lib/api/errors'
import { logger } from '@/lib/logger'
import type { SupabaseClient } from '@supabase/supabase-js'
import { z } from 'zod'

const patientsAnalyticsQuerySchema = z.object({
  period: z.enum(['week', 'month', 'quarter', 'year']).default('month'),
})

export const dynamic = 'force-dynamic'

interface DateRange {
  start: Date
  end: Date
  previousStart: Date
  previousEnd: Date
}

/**
 * GET /api/analytics/patients
 * Fetch patient analytics data including species distribution, vaccination compliance, etc.
 * Staff only
 */
export const GET = withApiAuth(
  async ({ request, profile, supabase }: ApiHandlerContext) => {
    const { searchParams } = new URL(request.url)
    
    const queryResult = patientsAnalyticsQuerySchema.safeParse({
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
      const dateRange = getDateRange(period as 'week' | 'month' | 'quarter' | 'year')

      const [
        speciesDistribution,
        ageDistribution,
        vaccinationCompliance,
        returnVisitStats,
        lostPatients,
        newPatientsTrend,
      ] = await Promise.all([
        getSpeciesDistribution(supabase, tenantId),
        getAgeDistribution(supabase, tenantId),
        getVaccinationCompliance(supabase, tenantId),
        getReturnVisitStats(supabase, tenantId, dateRange),
        getLostPatients(supabase, tenantId),
        getNewPatientsTrend(supabase, tenantId, dateRange),
      ])

      return NextResponse.json({
        speciesDistribution,
        ageDistribution,
        vaccinationCompliance,
        returnVisitStats,
        lostPatients,
        newPatientsTrend,
      })
    } catch (error) {
      logger.error('Patient analytics error', {
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
function getDateRange(period: 'week' | 'month' | 'quarter' | 'year'): DateRange {
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

    case 'year':
      start = new Date(now.getFullYear(), 0, 1)
      start.setHours(0, 0, 0, 0)

      previousEnd = new Date(start)
      previousEnd.setDate(previousEnd.getDate() - 1)
      previousEnd.setHours(23, 59, 59, 999)

      previousStart = new Date(previousEnd.getFullYear(), 0, 1)
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
 * Get species distribution of all pets
 */
async function getSpeciesDistribution(
  supabase: SupabaseClient,
  tenantId: string
): Promise<{ species: string; count: number; percentage: number }[]> {
  const { data: pets } = await supabase
    .from('pets')
    .select('species')
    .eq('tenant_id', tenantId)

  if (!pets || pets.length === 0) {
    return []
  }

  const speciesCounts = new Map<string, number>()
  pets.forEach((pet) => {
    const species = pet.species || 'Otro'
    speciesCounts.set(species, (speciesCounts.get(species) || 0) + 1)
  })

  const total = pets.length
  const speciesLabels: Record<string, string> = {
    dog: 'Perros',
    cat: 'Gatos',
    bird: 'Aves',
    reptile: 'Reptiles',
    fish: 'Peces',
    small_mammal: 'Pequeños Mamíferos',
    other: 'Otros',
  }

  return Array.from(speciesCounts.entries())
    .map(([species, count]) => ({
      species: speciesLabels[species.toLowerCase()] || species,
      count,
      percentage: Math.round((count / total) * 100),
    }))
    .sort((a, b) => b.count - a.count)
}

/**
 * Get age distribution of pets
 */
async function getAgeDistribution(
  supabase: SupabaseClient,
  tenantId: string
): Promise<{ range: string; count: number; percentage: number }[]> {
  const { data: pets } = await supabase
    .from('pets')
    .select('date_of_birth')
    .eq('tenant_id', tenantId)
    .not('date_of_birth', 'is', null)

  if (!pets || pets.length === 0) {
    return []
  }

  const now = new Date()
  const ageRanges = new Map<string, number>()
  const ranges = [
    { key: '0-1', label: '0-1 años', min: 0, max: 1 },
    { key: '1-3', label: '1-3 años', min: 1, max: 3 },
    { key: '3-7', label: '3-7 años', min: 3, max: 7 },
    { key: '7-10', label: '7-10 años', min: 7, max: 10 },
    { key: '10+', label: '10+ años', min: 10, max: 100 },
  ]

  pets.forEach((pet) => {
    if (!pet.date_of_birth) return
    const birthDate = new Date(pet.date_of_birth)
    const ageYears = (now.getTime() - birthDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25)

    for (const range of ranges) {
      if (ageYears >= range.min && ageYears < range.max) {
        ageRanges.set(range.label, (ageRanges.get(range.label) || 0) + 1)
        break
      }
    }
  })

  const total = pets.length
  return ranges.map((range) => ({
    range: range.label,
    count: ageRanges.get(range.label) || 0,
    percentage: Math.round(((ageRanges.get(range.label) || 0) / total) * 100),
  }))
}

/**
 * Get vaccination compliance rate
 */
async function getVaccinationCompliance(
  supabase: SupabaseClient,
  tenantId: string
): Promise<{
  upToDate: number
  overdue: number
  neverVaccinated: number
  complianceRate: number
}> {
  const now = new Date().toISOString()

  // Get all pets
  const { count: totalPets } = await supabase
    .from('pets')
    .select('*', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)

  // Get pets with up-to-date vaccines
  const { data: upToDatePets } = await supabase
    .from('vaccines')
    .select('pet_id')
    .eq('tenant_id', tenantId)
    .gte('next_due_date', now)
    .eq('status', 'completed')

  const uniqueUpToDate = new Set(upToDatePets?.map((v) => v.pet_id) || []).size

  // Get pets with overdue vaccines
  const { data: overduePets } = await supabase
    .from('vaccines')
    .select('pet_id')
    .eq('tenant_id', tenantId)
    .lt('next_due_date', now)
    .eq('status', 'completed')

  const uniqueOverdue = new Set(overduePets?.map((v) => v.pet_id) || []).size

  // Get pets that have ever been vaccinated
  const { data: everVaccinated } = await supabase
    .from('vaccines')
    .select('pet_id')
    .eq('tenant_id', tenantId)

  const uniqueVaccinated = new Set(everVaccinated?.map((v) => v.pet_id) || []).size

  const total = totalPets || 1
  const neverVaccinated = total - uniqueVaccinated
  const complianceRate = Math.round((uniqueUpToDate / total) * 100)

  return {
    upToDate: uniqueUpToDate,
    overdue: uniqueOverdue,
    neverVaccinated,
    complianceRate,
  }
}

/**
 * Get return visit statistics
 */
async function getReturnVisitStats(
  supabase: SupabaseClient,
  tenantId: string,
  dateRange: DateRange
): Promise<{
  avgDaysBetweenVisits: number
  repeatVisitRate: number
  firstTimeVisitors: number
  returningVisitors: number
}> {
  // Get appointments in the period
  const { data: appointments } = await supabase
    .from('appointments')
    .select('pet_id, start_time')
    .eq('tenant_id', tenantId)
    .eq('status', 'completed')
    .gte('start_time', dateRange.start.toISOString())
    .lte('start_time', dateRange.end.toISOString())
    .order('start_time', { ascending: true })

  if (!appointments || appointments.length === 0) {
    return {
      avgDaysBetweenVisits: 0,
      repeatVisitRate: 0,
      firstTimeVisitors: 0,
      returningVisitors: 0,
    }
  }

  // Group appointments by pet
  const petVisits = new Map<string, Date[]>()
  appointments.forEach((apt) => {
    if (!apt.pet_id) return
    const visits = petVisits.get(apt.pet_id) || []
    visits.push(new Date(apt.start_time))
    petVisits.set(apt.pet_id, visits)
  })

  // Calculate metrics
  let totalDaysBetweenVisits = 0
  let visitGapCount = 0
  let returningVisitors = 0
  let firstTimeVisitors = 0

  petVisits.forEach((visits) => {
    if (visits.length > 1) {
      returningVisitors++
      for (let i = 1; i < visits.length; i++) {
        const daysBetween =
          (visits[i].getTime() - visits[i - 1].getTime()) / (1000 * 60 * 60 * 24)
        totalDaysBetweenVisits += daysBetween
        visitGapCount++
      }
    } else {
      firstTimeVisitors++
    }
  })

  const avgDaysBetweenVisits = visitGapCount > 0 ? Math.round(totalDaysBetweenVisits / visitGapCount) : 0
  const totalUniquePets = petVisits.size
  const repeatVisitRate = totalUniquePets > 0 ? Math.round((returningVisitors / totalUniquePets) * 100) : 0

  return {
    avgDaysBetweenVisits,
    repeatVisitRate,
    firstTimeVisitors,
    returningVisitors,
  }
}

/**
 * Get lost patients (inactive for more than 6 months)
 */
async function getLostPatients(
  supabase: SupabaseClient,
  tenantId: string
): Promise<{
  count: number
  percentage: number
  recentlyLost: { name: string; lastVisit: string; ownerName: string }[]
}> {
  const sixMonthsAgo = new Date()
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)

  // Get total pets
  const { count: totalPets } = await supabase
    .from('pets')
    .select('*', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)

  // Get pets with recent visits
  const { data: recentAppointments } = await supabase
    .from('appointments')
    .select('pet_id')
    .eq('tenant_id', tenantId)
    .eq('status', 'completed')
    .gte('start_time', sixMonthsAgo.toISOString())

  const activePetIds = new Set(recentAppointments?.map((a) => a.pet_id) || [])
  const lostCount = (totalPets || 0) - activePetIds.size

  // Get recently lost patients (last visit between 6-12 months ago)
  const twelveMonthsAgo = new Date()
  twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12)

  const { data: recentlyLostData } = await supabase
    .from('appointments')
    .select(`
      pet_id,
      start_time,
      pet:pets!pet_id(name, owner:profiles!owner_id(full_name))
    `)
    .eq('tenant_id', tenantId)
    .eq('status', 'completed')
    .lt('start_time', sixMonthsAgo.toISOString())
    .gte('start_time', twelveMonthsAgo.toISOString())
    .order('start_time', { ascending: false })
    .limit(10)

  // Dedupe by pet_id, keeping most recent visit
  const seenPets = new Set<string>()
  const recentlyLost = (recentlyLostData || [])
    .filter((apt) => {
      if (!apt.pet_id || seenPets.has(apt.pet_id)) return false
      seenPets.add(apt.pet_id)
      return true
    })
    .slice(0, 5)
    .map((apt) => {
      // Supabase returns nested objects, handle possible array
      const petData = apt.pet
      const pet = Array.isArray(petData) ? petData[0] : petData
      const ownerData = pet?.owner
      const owner = Array.isArray(ownerData) ? ownerData[0] : ownerData
      return {
        name: pet?.name || 'Desconocido',
        lastVisit: new Date(apt.start_time).toLocaleDateString('es-PY'),
        ownerName: owner?.full_name || 'Desconocido',
      }
    })

  return {
    count: lostCount,
    percentage: totalPets ? Math.round((lostCount / totalPets) * 100) : 0,
    recentlyLost,
  }
}

/**
 * Get new patients trend over time
 */
async function getNewPatientsTrend(
  supabase: SupabaseClient,
  tenantId: string,
  dateRange: DateRange
): Promise<{ date: string; count: number }[]> {
  const { data: pets } = await supabase
    .from('pets')
    .select('created_at')
    .eq('tenant_id', tenantId)
    .gte('created_at', dateRange.start.toISOString())
    .lte('created_at', dateRange.end.toISOString())
    .order('created_at', { ascending: true })

  if (!pets || pets.length === 0) {
    return []
  }

  // Group by week or day depending on range
  const daysDiff = Math.ceil(
    (dateRange.end.getTime() - dateRange.start.getTime()) / (1000 * 60 * 60 * 24)
  )
  const groupByWeek = daysDiff > 14

  const dateCounts = new Map<string, number>()

  pets.forEach((pet) => {
    const date = new Date(pet.created_at)
    let key: string

    if (groupByWeek) {
      // Group by ISO week
      const weekStart = new Date(date)
      weekStart.setDate(date.getDate() - date.getDay())
      key = weekStart.toISOString().split('T')[0]
    } else {
      key = date.toISOString().split('T')[0]
    }

    dateCounts.set(key, (dateCounts.get(key) || 0) + 1)
  })

  return Array.from(dateCounts.entries())
    .map(([date, count]) => ({
      date: new Date(date).toLocaleDateString('es-PY', {
        day: '2-digit',
        month: 'short',
      }),
      count,
    }))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
}
