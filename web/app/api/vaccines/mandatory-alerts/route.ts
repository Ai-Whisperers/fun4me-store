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
  first_dose_weeks: number | null
}

interface MissingVaccine {
  vaccine_name: string
  vaccine_code: string
  status: 'overdue' | 'due' | 'missing'
  days_overdue?: number
  is_mandatory: true
}

interface MandatoryVaccineAlert {
  pet_id: string
  pet_name: string
  pet_photo_url: string | null
  species: string
  birth_date: string | null
  age_weeks: number | null
  owner_id: string
  owner_name: string | null
  owner_email: string | null
  owner_phone: string | null
  vaccines: MissingVaccine[]
  urgency: 'overdue' | 'due' | 'upcoming'
  booking_url: string
  reminder_sent_at?: string | null
}

interface AlertSummary {
  total_pets: number
  overdue_count: number
  due_count: number
  upcoming_count: number
}

/**
 * GET /api/vaccines/mandatory-alerts
 *
 * Returns all pets with missing/overdue mandatory (core) vaccines for the tenant.
 * Staff-only endpoint.
 *
 * Query parameters:
 * - days: number (default 30) - lookahead for upcoming due vaccines
 *
 * Returns:
 * - alerts: MandatoryVaccineAlert[]
 * - summary: AlertSummary
 */
export const GET = withApiAuth(
  async ({ request, user, profile, supabase }: ApiHandlerContext) => {
    const tenantId = profile.tenant_id
    const { searchParams } = new URL(request.url)
    const daysLookahead = parseInt(searchParams.get('days') || '30', 10)

    // Fetch all active pets with owner info
    const { data: pets, error: petsError } = await supabase
      .from('pets')
      .select(
        `
        id,
        name,
        species,
        photo_url,
        birth_date,
        owner_id,
        profiles!pets_owner_id_fkey (
          id,
          full_name,
          email,
          phone
        )
      `
      )
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .is('deleted_at', null)
      .in('species', ['dog', 'cat']) // Only species with vaccine protocols

    if (petsError) {
      logger.error('Error fetching pets for mandatory vaccine alerts', {
        tenantId,
        userId: user.id,
        error: petsError.message,
      })
      return apiError('DATABASE_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR)
    }

    if (!pets || pets.length === 0) {
      return NextResponse.json({
        alerts: [],
        summary: { total_pets: 0, overdue_count: 0, due_count: 0, upcoming_count: 0 },
      })
    }

    // Fetch core vaccine protocols
    const { data: protocols, error: protocolsError } = await supabase
      .from('vaccine_protocols')
      .select('id, vaccine_name, vaccine_code, species, protocol_type, first_dose_weeks')
      .eq('protocol_type', 'core')
      .is('deleted_at', null)

    if (protocolsError) {
      logger.error('Error fetching vaccine protocols', {
        tenantId,
        userId: user.id,
        error: protocolsError.message,
      })
      return apiError('DATABASE_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR)
    }

    // Fetch all vaccines for these pets
    const petIds = pets.map((p) => p.id)
    const { data: existingVaccines, error: vaccinesError } = await supabase
      .from('vaccines')
      .select('pet_id, name, next_due_date, status')
      .in('pet_id', petIds)
      .is('deleted_at', null)

    if (vaccinesError) {
      logger.error('Error fetching existing vaccines', {
        tenantId,
        userId: user.id,
        error: vaccinesError.message,
      })
      return apiError('DATABASE_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR)
    }

    // Group vaccines by pet
    const vaccinesByPet = new Map<string, Array<{ name: string; next_due_date: string | null }>>()
    for (const v of existingVaccines || []) {
      if (!vaccinesByPet.has(v.pet_id)) {
        vaccinesByPet.set(v.pet_id, [])
      }
      const petVaccines = vaccinesByPet.get(v.pet_id)
      if (petVaccines) {
        petVaccines.push({ name: v.name, next_due_date: v.next_due_date })
      }
    }

    // Check for recently sent reminders
    const { data: recentReminders } = await supabase
      .from('notifications')
      .select('reference_id, created_at')
      .eq('type', 'vaccine_reminder')
      .in('reference_id', petIds)
      .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()) // Last 7 days

    const remindersByPet = new Map<string, string>()
    for (const r of recentReminders || []) {
      if (r.reference_id) {
        remindersByPet.set(r.reference_id, r.created_at)
      }
    }

    const today = new Date()
    const alerts: MandatoryVaccineAlert[] = []

    for (const pet of pets) {
      // Calculate age in weeks
      let ageWeeks: number | null = null
      if (pet.birth_date) {
        const birthDate = new Date(pet.birth_date)
        const msPerWeek = 7 * 24 * 60 * 60 * 1000
        ageWeeks = Math.floor((today.getTime() - birthDate.getTime()) / msPerWeek)
      }

      // Get protocols for this species
      const speciesProtocols = (protocols || []).filter(
        (p) => p.species === pet.species || p.species === 'all'
      ) as VaccineProtocol[]

      // Get existing vaccines for this pet
      const petVaccines = vaccinesByPet.get(pet.id) || []
      const existingVaccineNames = petVaccines.map((v) => v.name.toLowerCase())

      // Find missing/overdue core vaccines
      const missingVaccines: MissingVaccine[] = []

      for (const protocol of speciesProtocols) {
        // Check if pet has this vaccine (by name matching)
        const hasVaccine = existingVaccineNames.some(
          (name) =>
            name.includes(protocol.vaccine_name.toLowerCase()) ||
            protocol.vaccine_name.toLowerCase().includes(name) ||
            name.includes(protocol.vaccine_code.toLowerCase())
        )

        if (hasVaccine) {
          // Check if the existing vaccine is due for renewal
          const existingVaccine = petVaccines.find(
            (v) =>
              v.name.toLowerCase().includes(protocol.vaccine_name.toLowerCase()) ||
              protocol.vaccine_name.toLowerCase().includes(v.name.toLowerCase())
          )

          if (existingVaccine?.next_due_date) {
            const dueDate = new Date(existingVaccine.next_due_date)
            const daysUntilDue = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

            if (daysUntilDue < 0) {
              // Overdue
              missingVaccines.push({
                vaccine_name: protocol.vaccine_name,
                vaccine_code: protocol.vaccine_code,
                status: 'overdue',
                days_overdue: Math.abs(daysUntilDue),
                is_mandatory: true,
              })
            } else if (daysUntilDue <= daysLookahead) {
              // Due soon
              missingVaccines.push({
                vaccine_name: protocol.vaccine_name,
                vaccine_code: protocol.vaccine_code,
                status: 'due',
                days_overdue: -daysUntilDue, // Negative = days until due
                is_mandatory: true,
              })
            }
          }
          continue
        }

        // Pet doesn't have this vaccine at all
        let status: MissingVaccine['status'] = 'missing'
        let daysOverdue: number | undefined

        if (ageWeeks !== null && protocol.first_dose_weeks !== null) {
          const weeksPastDue = ageWeeks - protocol.first_dose_weeks
          if (weeksPastDue > 4) {
            status = 'overdue'
            daysOverdue = weeksPastDue * 7
          } else if (weeksPastDue >= 0) {
            status = 'due'
            daysOverdue = 0
          }
        }

        // Only include if overdue or due (not just missing in the future)
        if (status === 'overdue' || status === 'due') {
          missingVaccines.push({
            vaccine_name: protocol.vaccine_name,
            vaccine_code: protocol.vaccine_code,
            status,
            days_overdue: daysOverdue,
            is_mandatory: true,
          })
        }
      }

      // Skip pets with no actionable missing vaccines
      if (missingVaccines.length === 0) continue

      // Determine overall urgency
      const hasOverdue = missingVaccines.some((v) => v.status === 'overdue')
      const hasDue = missingVaccines.some((v) => v.status === 'due')
      const urgency: MandatoryVaccineAlert['urgency'] = hasOverdue ? 'overdue' : hasDue ? 'due' : 'upcoming'

      // Get owner info (handle the joined profile)
      const ownerProfile = pet.profiles as unknown as {
        id: string
        full_name: string | null
        email: string | null
        phone: string | null
      } | null

      alerts.push({
        pet_id: pet.id,
        pet_name: pet.name,
        pet_photo_url: pet.photo_url,
        species: pet.species,
        birth_date: pet.birth_date,
        age_weeks: ageWeeks,
        owner_id: pet.owner_id,
        owner_name: ownerProfile?.full_name || null,
        owner_email: ownerProfile?.email || null,
        owner_phone: ownerProfile?.phone || null,
        vaccines: missingVaccines,
        urgency,
        booking_url: `/${tenantId}/book?pet=${pet.id}&service=vacunacion`,
        reminder_sent_at: remindersByPet.get(pet.id) || null,
      })
    }

    // Sort: overdue first (most days overdue), then due, then upcoming
    const urgencyOrder = { overdue: 0, due: 1, upcoming: 2 }
    alerts.sort((a, b) => {
      const urgencyDiff = urgencyOrder[a.urgency] - urgencyOrder[b.urgency]
      if (urgencyDiff !== 0) return urgencyDiff

      // Within same urgency, sort by max days overdue
      const aMaxDays = Math.max(...a.vaccines.map((v) => v.days_overdue || 0))
      const bMaxDays = Math.max(...b.vaccines.map((v) => v.days_overdue || 0))
      return bMaxDays - aMaxDays
    })

    // Calculate summary
    const summary: AlertSummary = {
      total_pets: alerts.length,
      overdue_count: alerts.filter((a) => a.urgency === 'overdue').length,
      due_count: alerts.filter((a) => a.urgency === 'due').length,
      upcoming_count: alerts.filter((a) => a.urgency === 'upcoming').length,
    }

    return NextResponse.json(
      { alerts, summary },
      {
        headers: {
          'Cache-Control': 'private, s-maxage=60, stale-while-revalidate=120',
        },
      }
    )
  },
  { roles: ['vet', 'admin'] }
)
