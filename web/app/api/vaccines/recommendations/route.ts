import { NextResponse } from 'next/server'
import { withApiAuth, type ApiHandlerContext } from '@/lib/auth'
import { apiError, HTTP_STATUS } from '@/lib/api/errors'
import { logger } from '@/lib/logger'

interface VaccineProtocol {
  id: string
  vaccine_name: string
  vaccine_code: string
  species: string
  protocol_type: 'core' | 'non-core' | 'lifestyle'
  diseases_prevented: string[]
  first_dose_weeks: number | null
  booster_weeks: number[] | null
  revaccination_months: number | null
  notes: string | null
}

interface VaccineRecommendation {
  vaccine_name: string
  vaccine_code: string
  protocol_type: 'core' | 'non-core' | 'lifestyle'
  diseases_prevented: string[]
  first_dose_weeks: number | null
  notes: string | null
  status: 'missing' | 'due' | 'overdue'
  reason: string
}

/**
 * GET /api/vaccines/recommendations
 *
 * Returns missing and recommended vaccines for a pet based on species, age, and existing vaccines.
 *
 * Query parameters:
 * - species: 'dog' | 'cat' | 'rabbit' (required)
 * - age_weeks: number (optional, for age-based recommendations)
 * - existing_vaccines: comma-separated vaccine codes (optional)
 * - existing_vaccine_names: comma-separated vaccine names (optional, for matching by name)
 */
export const GET = withApiAuth(async ({ request, profile, supabase }: ApiHandlerContext) => {
  const { searchParams } = new URL(request.url)
  const species = searchParams.get('species')
  const ageWeeksParam = searchParams.get('age_weeks')
  const existingVaccinesParam = searchParams.get('existing_vaccines')
  const existingVaccineNamesParam = searchParams.get('existing_vaccine_names')

  // Validate species
  if (!species) {
    return apiError('MISSING_FIELDS', HTTP_STATUS.BAD_REQUEST, {
      details: { required: ['species'] },
    })
  }

  const validSpecies = ['dog', 'cat', 'rabbit', 'bird']
  if (!validSpecies.includes(species)) {
    return apiError('VALIDATION_ERROR', HTTP_STATUS.BAD_REQUEST, {
      details: { reason: `Especie no válida. Valores permitidos: ${validSpecies.join(', ')}` },
    })
  }

  // Parse age in weeks
  const ageWeeks = ageWeeksParam ? parseInt(ageWeeksParam, 10) : null
  if (ageWeeksParam && ageWeeks !== null && (isNaN(ageWeeks) || ageWeeks < 0)) {
    return apiError('VALIDATION_ERROR', HTTP_STATUS.BAD_REQUEST, {
      details: { field: 'age_weeks', reason: 'Debe ser un número positivo' },
    })
  }

  // Parse existing vaccine codes
  const existingVaccineCodes = existingVaccinesParam
    ? existingVaccinesParam.split(',').map((code) => code.trim().toUpperCase())
    : []

  // Parse existing vaccine names (for matching by name when code is not available)
  const existingVaccineNames = existingVaccineNamesParam
    ? existingVaccineNamesParam.split(',').map((name) => name.trim().toLowerCase())
    : []

  // Fetch all vaccine protocols for this species
  const { data: protocols, error: protocolsError } = await supabase
    .from('vaccine_protocols')
    .select('*')
    .or(`species.eq.${species},species.eq.all`)
    .is('deleted_at', null)
    .order('protocol_type', { ascending: true })

  if (protocolsError) {
    logger.error('Error fetching vaccine protocols', {
      tenantId: profile.tenant_id,
      species,
      error: protocolsError.message,
    })
    return apiError('DATABASE_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR)
  }

  // If no protocols found, return empty arrays
  if (!protocols || protocols.length === 0) {
    return NextResponse.json({
      core_vaccines: [],
      recommended_vaccines: [],
      lifestyle_vaccines: [],
      total_missing: 0,
    })
  }

  // Categorize vaccines
  const coreVaccines: VaccineRecommendation[] = []
  const recommendedVaccines: VaccineRecommendation[] = []
  const lifestyleVaccines: VaccineRecommendation[] = []

  for (const protocol of protocols as VaccineProtocol[]) {
    // Check if pet already has this vaccine (by code or by name)
    const hasVaccineByCode = existingVaccineCodes.includes(protocol.vaccine_code.toUpperCase())
    const hasVaccineByName = existingVaccineNames.some(
      (name) =>
        protocol.vaccine_name.toLowerCase().includes(name) ||
        name.includes(protocol.vaccine_name.toLowerCase())
    )

    if (hasVaccineByCode || hasVaccineByName) {
      continue // Skip vaccines the pet already has
    }

    // Determine status based on age
    let status: VaccineRecommendation['status'] = 'missing'
    let reason = 'No registrada'

    if (ageWeeks !== null && protocol.first_dose_weeks !== null) {
      if (ageWeeks >= protocol.first_dose_weeks) {
        // Pet is old enough and should have this vaccine
        const weeksPastDue = ageWeeks - protocol.first_dose_weeks
        if (weeksPastDue > 4) {
          status = 'overdue'
          reason = `Debió aplicarse a las ${protocol.first_dose_weeks} semanas (hace ${weeksPastDue} semanas)`
        } else if (weeksPastDue >= 0) {
          status = 'due'
          reason = `Corresponde ahora (${protocol.first_dose_weeks} semanas)`
        }
      } else {
        // Pet is too young
        const weeksUntilDue = protocol.first_dose_weeks - ageWeeks
        status = 'missing'
        reason = `Primera dosis a las ${protocol.first_dose_weeks} semanas (en ${weeksUntilDue} semanas)`
      }
    }

    const recommendation: VaccineRecommendation = {
      vaccine_name: protocol.vaccine_name,
      vaccine_code: protocol.vaccine_code,
      protocol_type: protocol.protocol_type,
      diseases_prevented: protocol.diseases_prevented,
      first_dose_weeks: protocol.first_dose_weeks,
      notes: protocol.notes,
      status,
      reason,
    }

    // Categorize by protocol type
    switch (protocol.protocol_type) {
      case 'core':
        coreVaccines.push(recommendation)
        break
      case 'non-core':
        recommendedVaccines.push(recommendation)
        break
      case 'lifestyle':
        lifestyleVaccines.push(recommendation)
        break
    }
  }

  // Sort by status priority: overdue > due > missing
  const statusPriority = { overdue: 0, due: 1, missing: 2 }
  const sortByStatus = (a: VaccineRecommendation, b: VaccineRecommendation) =>
    statusPriority[a.status] - statusPriority[b.status]

  coreVaccines.sort(sortByStatus)
  recommendedVaccines.sort(sortByStatus)
  lifestyleVaccines.sort(sortByStatus)

  return NextResponse.json(
    {
      core_vaccines: coreVaccines,
      recommended_vaccines: recommendedVaccines,
      lifestyle_vaccines: lifestyleVaccines,
      total_missing: coreVaccines.length + recommendedVaccines.length + lifestyleVaccines.length,
    },
    {
      headers: {
        'Cache-Control': 'private, s-maxage=60, stale-while-revalidate=120',
      },
    }
  )
})
