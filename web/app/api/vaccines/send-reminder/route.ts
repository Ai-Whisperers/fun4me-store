import { NextResponse } from 'next/server'
import { withApiAuth, type ApiHandlerContext } from '@/lib/auth'
import { apiError, HTTP_STATUS } from '@/lib/api/errors'
import { logger } from '@/lib/logger'
import { z } from 'zod'

const SendReminderSchema = z.object({
  pet_ids: z.array(z.string().uuid()).min(1, 'Se requiere al menos una mascota'),
})

/**
 * POST /api/vaccines/send-reminder
 *
 * Creates in-app notifications for pet owners about missing mandatory vaccines.
 * Staff-only endpoint (vet/admin).
 *
 * Body:
 * - pet_ids: string[] - Array of pet UUIDs to send reminders for
 *
 * Returns:
 * - created: number - Number of notifications created
 * - skipped: number - Number skipped (recent reminder already sent)
 * - errors: string[] - Any error messages
 */
export const POST = withApiAuth(
  async ({ request, user, profile, supabase }: ApiHandlerContext) => {
    const tenantId = profile.tenant_id

    // Parse and validate request body
    let body: unknown
    try {
      body = await request.json()
    } catch (_error: unknown) {
      return apiError('INVALID_FORMAT', HTTP_STATUS.BAD_REQUEST)
    }

    const parseResult = SendReminderSchema.safeParse(body)
    if (!parseResult.success) {
      return apiError('VALIDATION_ERROR', HTTP_STATUS.BAD_REQUEST, {
        details: { message: parseResult.error.issues[0].message },
      })
    }

    const { pet_ids } = parseResult.data

    // Fetch pets with owners (validate they belong to this tenant)
    const { data: pets, error: petsError } = await supabase
      .from('pets')
      .select(
        `
        id,
        name,
        species,
        birth_date,
        owner_id,
        profiles!pets_owner_id_fkey (
          id,
          full_name
        )
      `
      )
      .eq('tenant_id', tenantId)
      .in('id', pet_ids)
      .eq('is_active', true)
      .is('deleted_at', null)

    if (petsError) {
      logger.error('Error fetching pets for vaccine reminders', {
        tenantId,
        userId: user.id,
        error: petsError.message,
      })
      return apiError('DATABASE_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR)
    }

    if (!pets || pets.length === 0) {
      return apiError('NOT_FOUND', HTTP_STATUS.NOT_FOUND, {
        details: { resource: 'pets' },
      })
    }

    // Fetch core vaccine protocols
    const { data: protocols } = await supabase
      .from('vaccine_protocols')
      .select('vaccine_name, vaccine_code, species, first_dose_weeks')
      .eq('protocol_type', 'core')
      .is('deleted_at', null)

    // Fetch existing vaccines for these pets
    const { data: existingVaccines } = await supabase
      .from('vaccines')
      .select('pet_id, name')
      .in('pet_id', pet_ids)
      .is('deleted_at', null)

    const vaccinesByPet = new Map<string, string[]>()
    for (const v of existingVaccines || []) {
      if (!vaccinesByPet.has(v.pet_id)) {
        vaccinesByPet.set(v.pet_id, [])
      }
      const petVaccines = vaccinesByPet.get(v.pet_id)
      if (petVaccines) {
        petVaccines.push(v.name.toLowerCase())
      }
    }

    // Check for recent reminders (last 24 hours) to avoid spam
    const { data: recentReminders } = await supabase
      .from('notifications')
      .select('reference_id')
      .eq('type', 'vaccine_reminder')
      .in('reference_id', pet_ids)
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())

    const recentlyRemindedPets = new Set((recentReminders || []).map((r) => r.reference_id))

    const today = new Date()
    const notifications: Array<{
      user_id: string
      tenant_id: string
      type: string
      title: string
      message: string
      priority: string
      reference_type: string
      reference_id: string
      action_url: string
      channels: string[]
    }> = []

    const errors: string[] = []
    let skipped = 0

    for (const pet of pets) {
      // Skip if reminder was sent in last 24 hours
      if (recentlyRemindedPets.has(pet.id)) {
        skipped++
        continue
      }

      // Calculate missing vaccines
      const petVaccineNames = vaccinesByPet.get(pet.id) || []
      const speciesProtocols = (protocols || []).filter(
        (p) => p.species === pet.species || p.species === 'all'
      )

      const missingVaccines: string[] = []

      // Calculate age in weeks
      let ageWeeks: number | null = null
      if (pet.birth_date) {
        const birthDate = new Date(pet.birth_date)
        const msPerWeek = 7 * 24 * 60 * 60 * 1000
        ageWeeks = Math.floor((today.getTime() - birthDate.getTime()) / msPerWeek)
      }

      for (const protocol of speciesProtocols) {
        const hasVaccine = petVaccineNames.some(
          (name) =>
            name.includes(protocol.vaccine_name.toLowerCase()) ||
            protocol.vaccine_name.toLowerCase().includes(name)
        )

        if (!hasVaccine) {
          // Check if pet is old enough to need this vaccine
          if (ageWeeks !== null && protocol.first_dose_weeks !== null) {
            if (ageWeeks >= protocol.first_dose_weeks) {
              missingVaccines.push(protocol.vaccine_name)
            }
          } else {
            // If we don't know age, include the vaccine
            missingVaccines.push(protocol.vaccine_name)
          }
        }
      }

      if (missingVaccines.length === 0) {
        skipped++
        continue
      }

      // Get owner info
      const ownerProfile = pet.profiles as unknown as {
        id: string
        full_name: string | null
      } | null

      if (!ownerProfile?.id) {
        errors.push(`Mascota ${pet.name}: Sin dueño registrado`)
        continue
      }

      // Create notification
      const vaccineList =
        missingVaccines.length <= 3
          ? missingVaccines.join(', ')
          : `${missingVaccines.slice(0, 2).join(', ')} y ${missingVaccines.length - 2} más`

      notifications.push({
        user_id: ownerProfile.id,
        tenant_id: tenantId,
        type: 'vaccine_reminder',
        title: 'Vacunas Obligatorias Pendientes',
        message: `${pet.name} necesita: ${vaccineList}. Agenda una cita para proteger a tu mascota.`,
        priority: 'high',
        reference_type: 'pet',
        reference_id: pet.id,
        action_url: `/${tenantId}/portal/pets/${pet.id}#vaccines`,
        channels: ['in_app'],
      })
    }

    // Batch insert notifications
    let created = 0
    if (notifications.length > 0) {
      const { error: insertError, data: insertedData } = await supabase
        .from('notifications')
        .insert(notifications)
        .select('id')

      if (insertError) {
        logger.error('Error inserting vaccine reminder notifications', {
          tenantId,
          userId: user.id,
          notificationCount: notifications.length,
          error: insertError.message,
        })
        return apiError('DATABASE_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR)
      }

      created = insertedData?.length || 0
    }

    return NextResponse.json({
      created,
      skipped,
      errors: errors.length > 0 ? errors : undefined,
    })
  },
  { roles: ['vet', 'admin'], rateLimit: 'write' }
)
