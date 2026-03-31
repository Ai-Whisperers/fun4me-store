'use server'

import { withActionAuth } from '@/lib/auth'
import { actionSuccess, actionError } from '@/lib/errors'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { logger } from '@/lib/logger'
import { checkActionRateLimit, ACTION_RATE_LIMITS } from '@/lib/auth/action-rate-limit'

/**
 * FEAT-015: Lost Pet Management Dashboard
 * Server actions for managing lost, found, and reunited pet reports
 */

/**
 * Get lost pet reports for a clinic
 */
export const getLostPets = withActionAuth(
  async ({ supabase }, clinicSlug: string, status?: string) => {
    let query = supabase
      .from('lost_pets')
      .select(
        `
        *,
        pet:pets!inner (
          id,
          name,
          species,
          breed,
          photo_url,
          owner:profiles!pets_owner_id_fkey (
            id,
            full_name,
            phone,
            email
          )
        )
      `
      )
      .eq('tenant_id', clinicSlug)
      .order('created_at', { ascending: false })

    if (status && status !== 'all') {
      query = query.eq('status', status)
    }

    const { data, error } = await query

    if (error) {
      logger.error('Failed to get lost pets', {
        error,
        tenant: clinicSlug,
        status,
      })
      return actionError('Error al obtener reportes de mascotas perdidas')
    }

    return actionSuccess(data || [])
  }
)

/**
 * Update the status of a lost pet report
 */
export const updateLostPetStatus = withActionAuth(
  async ({ profile, supabase }, clinicSlug: string, reportId: string, newStatus: string) => {
    // Only staff can update status for now (or eventually the owner)
    const isStaff = ['vet', 'admin'].includes(profile.role)
    if (!isStaff) return actionError('No tienes permiso para actualizar este reporte')

    const { error } = await supabase
      .from('lost_pets')
      .update({
        status: newStatus,
        resolved_at: newStatus === 'reunited' ? new Date().toISOString() : null,
      })
      .eq('id', reportId)
      .eq('tenant_id', clinicSlug)

    if (error) {
      logger.error('Failed to update lost pet status', {
        error,
        tenant: clinicSlug,
        reportId,
        newStatus,
      })
      return actionError('Error al actualizar el estado del reporte')
    }

    revalidatePath(`/${clinicSlug}/dashboard/lost-pets`)
    return actionSuccess()
  }
)

/**
 * Report a found pet (public action - no auth required for lost pet reports)
 */
export async function reportFoundPet(petId: string, location?: string, contact?: string) {
  // SEC-011: Rate limit public pet reports to prevent abuse
  const rateLimitResult = await checkActionRateLimit(ACTION_RATE_LIMITS.foundPetReport.type)
  if (!rateLimitResult.success) {
    return actionError(rateLimitResult.message || 'Demasiados reportes. Espera un momento.')
  }

  const supabase = await createClient()

  try {
    // Create entry in lost_pets
    const { error } = await supabase.from('lost_pets').insert({
      pet_id: petId,
      status: 'found',
      last_seen_location: location || 'Reported via QR Scan',
      last_seen_date: new Date().toISOString(),
      finder_contact: contact,
      reported_by: null, // Public report
    })

    if (error) throw error

    revalidatePath(`/scan/${petId}`)
    return actionSuccess()
  } catch (e) {
    logger.error('Failed to report found pet', {
      error: e instanceof Error ? e : undefined,
      petId,
    })
    return actionError(e instanceof Error ? e.message : 'Error desconocido')
  }
}

/**
 * FEAT-015: Mark a lost pet as reunited with its owner
 * Sends notifications to the owner and logs the event
 */
export const markPetAsReunited = withActionAuth(
  async ({ profile, supabase }, clinicSlug: string, reportId: string, notes?: string) => {
    // Only staff can mark as reunited
    const isStaff = ['vet', 'admin'].includes(profile.role)
    if (!isStaff) return actionError('No tienes permiso para realizar esta acción')

    try {
      // Get the report with pet and owner info
      const { data: report, error: fetchError } = await supabase
        .from('lost_pets')
        .select(
          `
          id,
          status,
          pet_id,
          pet:pets!inner (
            id,
            name,
            owner_id,
            owner:profiles!pets_owner_id_fkey (
              id,
              full_name,
              email,
              phone
            )
          )
        `
        )
        .eq('id', reportId)
        .eq('tenant_id', clinicSlug)
        .single()

      if (fetchError || !report) {
        logger.error('Lost pet report not found', { reportId, tenant: clinicSlug })
        return actionError('Reporte no encontrado')
      }

      if (report.status === 'reunited') {
        return actionError('Este reporte ya está marcado como reunido')
      }

      // Update the report status
      const { error: updateError } = await supabase
        .from('lost_pets')
        .update({
          status: 'reunited',
          found_at: report.status === 'lost' ? new Date().toISOString() : undefined,
          found_by: profile.id,
          notes: notes || (report.status === 'lost' ? 'Mascota reunida con su dueño' : notes),
          updated_at: new Date().toISOString(),
        })
        .eq('id', reportId)
        .eq('tenant_id', clinicSlug)

      if (updateError) {
        logger.error('Failed to update lost pet status', { error: updateError, reportId })
        return actionError('Error al actualizar el estado')
      }

      // Send notification to owner
      const petData = report.pet as unknown
      const pet = (Array.isArray(petData) ? petData[0] : petData) as {
        id: string
        name: string
        owner_id: string
        owner: { id: string; full_name: string; email: string; phone: string | null } | null
      }
      if (pet?.owner) {
        await supabase.from('notifications').insert({
          user_id: pet.owner.id,
          title: '¡Excelentes noticias! 🎉',
          message: `${pet.name} ha sido marcado como reunido con su familia. ¡Gracias por usar nuestro servicio!`,
          type: 'pet_reunited',
          data: {
            report_id: reportId,
            pet_id: pet.id,
            pet_name: pet.name,
          },
        })

        logger.info('Pet reunited notification sent', {
          pet_id: pet.id,
          owner_id: pet.owner.id,
          report_id: reportId,
        })
      }

      // Log to audit trail
      await supabase.from('audit_logs').insert({
        tenant_id: clinicSlug,
        user_id: profile.id,
        action: 'pet_reunited',
        resource: 'lost_pets',
        resource_id: reportId,
        details: {
          pet_id: pet?.id,
          pet_name: pet?.name,
          notes,
        },
      })

      revalidatePath(`/${clinicSlug}/dashboard/lost-pets`)
      revalidatePath(`/${clinicSlug}/dashboard/lost-pets/${reportId}`)

      return actionSuccess({ message: 'Mascota marcada como reunida exitosamente' })
    } catch (e) {
      logger.error('Error marking pet as reunited', {
        error: e instanceof Error ? e : undefined,
        reportId,
      })
      return actionError('Error al marcar como reunido')
    }
  }
)

/**
 * FEAT-015: Notify pet owner when their pet is found
 * Called when someone reports finding a lost pet via QR scan
 */
export const notifyOwnerPetFound = withActionAuth(
  async (
    { supabase },
    petId: string,
    finderInfo: { name?: string; phone?: string; location?: string }
  ) => {
    try {
      // Get pet with owner info
      const { data: pet, error: petError } = await supabase
        .from('pets')
        .select(
          `
          id,
          name,
          tenant_id,
          owner:profiles!pets_owner_id_fkey (
            id,
            full_name,
            email,
            phone
          )
        `
        )
        .eq('id', petId)
        .single()

      if (petError || !pet) {
        logger.error('Pet not found for notification', { petId })
        return actionError('Mascota no encontrada')
      }

      const ownerData = pet.owner as unknown
      const owner = (Array.isArray(ownerData) ? ownerData[0] : ownerData) as {
        id: string
        full_name: string
        email: string
        phone: string | null
      } | null

      if (!owner) {
        logger.warn('Pet has no owner for notification', { petId })
        return actionError('No se encontró dueño para esta mascota')
      }

      // Create notification for owner
      await supabase.from('notifications').insert({
        user_id: owner.id,
        title: '¡Alguien encontró a tu mascota! 🐾',
        message: `${pet.name} ha sido reportado como encontrado${finderInfo.location ? ` en ${finderInfo.location}` : ''}.${finderInfo.name ? ` Reportado por: ${finderInfo.name}` : ''}${finderInfo.phone ? ` Contacto: ${finderInfo.phone}` : ''}`,
        type: 'pet_found',
        data: {
          pet_id: petId,
          pet_name: pet.name,
          finder_name: finderInfo.name,
          finder_phone: finderInfo.phone,
          finder_location: finderInfo.location,
        },
      })

      logger.info('Pet found notification sent to owner', {
        pet_id: petId,
        owner_id: owner.id,
        finder_phone: finderInfo.phone,
      })

      return actionSuccess({ message: 'Notificación enviada al dueño' })
    } catch (e) {
      logger.error('Error notifying owner of found pet', {
        error: e instanceof Error ? e : undefined,
        petId,
      })
      return actionError('Error al enviar notificación')
    }
  }
)

/**
 * FEAT-015: Report a sighting of a lost pet
 * Public action - rate limited
 */
export async function reportPetSighting(
  lostPetId: string,
  sighting: {
    location: string
    description?: string
    reporterName?: string
    reporterPhone?: string
    reporterEmail?: string
    lat?: number
    lng?: number
  }
) {
  // Rate limit public sighting reports
  const rateLimitResult = await checkActionRateLimit(ACTION_RATE_LIMITS.foundPetReport.type)
  if (!rateLimitResult.success) {
    return actionError(rateLimitResult.message || 'Demasiados reportes. Espera un momento.')
  }

  const supabase = await createClient()

  try {
    // Verify lost pet report exists
    const { data: report, error: reportError } = await supabase
      .from('lost_pets')
      .select('id, tenant_id, status, pet:pets(name, owner_id)')
      .eq('id', lostPetId)
      .single()

    if (reportError || !report) {
      return actionError('Reporte de mascota perdida no encontrado')
    }

    if (report.status === 'reunited') {
      return actionError('Esta mascota ya fue reunida con su dueño')
    }

    // Create sighting record
    const { error: insertError } = await supabase.from('pet_sightings').insert({
      lost_pet_id: lostPetId,
      sighting_location: sighting.location,
      sighting_date: new Date().toISOString(),
      description: sighting.description,
      reporter_name: sighting.reporterName,
      reporter_phone: sighting.reporterPhone,
      reporter_email: sighting.reporterEmail,
      sighting_lat: sighting.lat,
      sighting_lng: sighting.lng,
    })

    if (insertError) {
      logger.error('Failed to insert pet sighting', { error: insertError, lostPetId })
      return actionError('Error al registrar avistamiento')
    }

    // Notify owner about the sighting
    const petData = report.pet as unknown
      const pet = (Array.isArray(petData) ? petData[0] : petData) as { name: string; owner_id: string } | null
    if (pet?.owner_id) {
      await supabase.from('notifications').insert({
        user_id: pet.owner_id,
        title: `Nuevo avistamiento de ${pet.name}`,
        message: `Alguien reportó haber visto a ${pet.name} en ${sighting.location}.${sighting.reporterPhone ? ` Contacto: ${sighting.reporterPhone}` : ''}`,
        type: 'pet_sighting',
        data: {
          lost_pet_id: lostPetId,
          location: sighting.location,
          reporter_phone: sighting.reporterPhone,
        },
      })
    }

    logger.info('Pet sighting reported', {
      lost_pet_id: lostPetId,
      location: sighting.location,
    })

    return actionSuccess({ message: 'Avistamiento reportado exitosamente' })
  } catch (e) {
    logger.error('Error reporting pet sighting', {
      error: e instanceof Error ? e : undefined,
      lostPetId,
    })
    return actionError('Error al reportar avistamiento')
  }
}
