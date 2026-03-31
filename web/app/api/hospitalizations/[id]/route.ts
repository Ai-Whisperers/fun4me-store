import { NextResponse } from 'next/server'
import { withApiAuthParams, type ApiHandlerContextWithParams } from '@/lib/auth'
import { apiError, HTTP_STATUS } from '@/lib/api/errors'
import { logger } from '@/lib/logger'

/**
 * GET /api/hospitalizations/[id] - Get hospitalization by ID
 */
export const GET = withApiAuthParams(
  async ({ params, profile, supabase }: ApiHandlerContextWithParams<{ id: string }>) => {
    const hospitalizationId = params.id

    // Get hospitalization with all related data
    const { data: hospitalization, error } = await supabase
      .from('hospitalizations')
      .select(
        `
        *,
        pet:pets!inner(
          id, name, species, breed, date_of_birth, weight, microchip_number,
          owner:profiles!pets_owner_id_fkey(id, full_name, email, phone)
        ),
        kennel:kennels(id, kennel_number, kennel_type, size, location, features),
        admitted_by:profiles!hospitalizations_admitted_by_fkey(id, full_name),
        discharged_by:profiles!hospitalizations_discharged_by_fkey(id, full_name),
        vitals:hospitalization_vitals(
          id, recorded_at, temperature, heart_rate, respiratory_rate,
          weight, blood_pressure_systolic, blood_pressure_diastolic,
          mucous_membrane_color, capillary_refill_time, pain_score, notes,
          recorded_by:profiles!hospitalization_vitals_recorded_by_fkey(full_name)
        ),
        treatments:hospitalization_treatments(
          id, treatment_type, medication_name, dosage, route, frequency,
          scheduled_time, administered_at, administered_by_id, status, notes,
          administered_by:profiles!hospitalization_treatments_administered_by_id_fkey(full_name)
        ),
        feedings:hospitalization_feedings(
          id, feeding_time, food_type, amount_offered, amount_consumed,
          appetite_level, notes,
          fed_by:profiles!hospitalization_feedings_fed_by_fkey(full_name)
        ),
        transfers:kennel_transfers(
          id, from_kennel:kennels!kennel_transfers_from_kennel_id_fkey(kennel_number, location),
          to_kennel:kennels!kennel_transfers_to_kennel_id_fkey(kennel_number, location),
          transfer_date, reason,
          transferred_by:profiles!kennel_transfers_transferred_by_fkey(full_name)
        ),
        visits:hospitalization_visits(
          id, visitor_name, visit_start, visit_end, notes,
          authorized_by:profiles!hospitalization_visits_authorized_by_fkey(full_name)
        )
      `
      )
      .eq('id', hospitalizationId)
      .eq('pet.tenant_id', profile.tenant_id)
      .single()

    if (error) {
      logger.error('Error fetching hospitalization', {
        tenantId: profile.tenant_id,
        hospitalizationId,
        error: error.message,
      })
      return apiError('NOT_FOUND', HTTP_STATUS.NOT_FOUND, {
        details: { resource: 'hospitalization' },
      })
    }

    return NextResponse.json(hospitalization)
  },
  { roles: ['vet', 'admin'] }
)
