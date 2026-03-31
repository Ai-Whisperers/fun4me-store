'use server'

import { withActionAuth, actionError } from '@/lib/actions'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { ActionResult, FieldErrors } from '@/lib/types/action-result'
import { sendConfirmationEmail } from '@/lib/notifications/service'
import { generateBookingRequestEmail } from '@/lib/email/templates'
import { ERROR_MESSAGES } from '@/lib/constants'
import { logger } from '@/lib/logger'
import { rateLimitByUser } from '@/lib/rate-limit'

/**
 * REF-005: Migrated to withActionAuth
 */

/**
 * Schema for booking request creation
 * Note: No date/time required - customer submits preferences only
 */
const createBookingRequestSchema = z.object({
  clinic: z.string().min(1, ERROR_MESSAGES.CLINIC_IDENTIFICATION_FAILED),
  pet_id: z
    .string()
    .min(1, ERROR_MESSAGES.REQUIRED_PET_SELECTION)
    .uuid(ERROR_MESSAGES.INVALID_PET_ID),
  service_ids: z
    .array(z.string().uuid('ID de servicio inválido'))
    .min(1, 'Debes seleccionar al menos un servicio')
    .max(5, 'No puedes reservar más de 5 servicios a la vez'),
  notes: z
    .string()
    .max(1000, ERROR_MESSAGES.LONG_NOTES)
    .optional()
    .nullable()
    .transform((val) => val?.trim() || null),
  // Optional preferences
  preferred_date_start: z
    .string()
    .nullable()
    .optional()
    .refine(
      (val) => {
        if (!val) return true
        const date = new Date(val)
        return !isNaN(date.getTime())
      },
      { message: 'Fecha de inicio inválida' }
    ),
  preferred_date_end: z
    .string()
    .nullable()
    .optional()
    .refine(
      (val) => {
        if (!val) return true
        const date = new Date(val)
        return !isNaN(date.getTime())
      },
      { message: 'Fecha de fin inválida' }
    ),
  preferred_time_of_day: z.enum(['morning', 'afternoon', 'any']).optional().default('any'),
})

export type BookingRequestInput = z.infer<typeof createBookingRequestSchema>

/**
 * Create a booking request (customer submits, clinic will schedule)
 * This replaces the direct appointment creation from the customer booking wizard
 */
export const createBookingRequest = withActionAuth(
  async (
    { user, profile, supabase },
    input: BookingRequestInput
  ): Promise<ActionResult<{ appointment_id: string }>> => {
    // SEC-027: Rate limit booking requests (5 per hour per user)
    const rateLimitResult = await rateLimitByUser(user.id, 'booking')
    if (!rateLimitResult.success) {
      return {
        success: false,
        error: rateLimitResult.error || 'Demasiadas solicitudes. Intente más tarde.',
      }
    }

    // Validate
    const validation = createBookingRequestSchema.safeParse(input)

    if (!validation.success) {
      const fieldErrors: FieldErrors = {}
      for (const issue of validation.error.issues) {
        const fieldName = issue.path[0] as string
        if (!fieldErrors[fieldName]) {
          fieldErrors[fieldName] = issue.message
        }
      }

      return {
        success: false,
        error: ERROR_MESSAGES.REVIEW_FIELDS,
        fieldErrors,
      }
    }

    const {
      clinic,
      pet_id,
      service_ids,
      notes,
      preferred_date_start,
      preferred_date_end,
      preferred_time_of_day,
    } = validation.data

    // Verify Pet Ownership
    const { data: pet } = await supabase
      .from('pets')
      .select('id, name, owner_id, tenant_id')
      .eq('id', pet_id)
      .single()

    if (!pet) {
      return {
        success: false,
        error: ERROR_MESSAGES.PET_NOT_FOUND,
        fieldErrors: {
          pet_id: ERROR_MESSAGES.PET_NOT_FOUND,
        },
      }
    }

    if (pet.owner_id !== user.id) {
      return {
        success: false,
        error: ERROR_MESSAGES.UNAUTHORIZED_PET_ACCESS,
        fieldErrors: {
          pet_id: ERROR_MESSAGES.UNAUTHORIZED_PET_ACCESS,
        },
      }
    }

    // Validate services exist and belong to the correct tenant
    const { data: services, error: servicesError } = await supabase
      .from('services')
      .select('id, name, duration_minutes')
      .eq('tenant_id', pet.tenant_id)
      .in('id', service_ids)

    if (servicesError || !services || services.length !== service_ids.length) {
      logger.warn('Invalid service IDs in booking request', {
        userId: user.id,
        tenantId: pet.tenant_id,
        requestedIds: service_ids,
        foundCount: services?.length || 0,
      })
      return {
        success: false,
        error: 'Uno o más servicios seleccionados no están disponibles',
        fieldErrors: {
          service_ids: 'Servicios inválidos o no disponibles',
        },
      }
    }

    // Check for existing pending requests for same pet (prevent duplicates)
    const { data: existingRequests } = await supabase
      .from('appointments')
      .select('id')
      .eq('pet_id', pet_id)
      .eq('scheduling_status', 'pending_scheduling')
      .neq('status', 'cancelled')

    if (existingRequests && existingRequests.length > 0) {
      return {
        success: false,
        error: `${pet.name} ya tiene una solicitud de cita pendiente. Por favor espera a que la clínica te contacte.`,
        fieldErrors: {
          pet_id: 'Ya existe una solicitud pendiente',
        },
      }
    }

    const serviceNames = services.map((s) => s.name).join(', ')
    const totalDuration = services.reduce((sum, s) => sum + (s.duration_minutes || 30), 0)

    // Call atomic booking request RPC
    const { data: result, error: rpcError } = await supabase.rpc('create_booking_request', {
      p_tenant_id: pet.tenant_id,
      p_pet_id: pet_id,
      p_service_ids: service_ids,
      p_notes: notes,
      p_preferred_date_start: preferred_date_start || null,
      p_preferred_date_end: preferred_date_end || null,
      p_preferred_time_of_day: preferred_time_of_day,
      p_created_by: user.id,
    })

    if (rpcError) {
      // AUDIT-107: Handle unique constraint violation (duplicate pending booking)
      if (rpcError.code === '23505') {
        logger.warn('Duplicate pending booking attempt blocked by constraint', {
          userId: user.id,
          tenantId: pet.tenant_id,
          petId: pet_id,
        })
        return {
          success: false,
          error: `${pet.name} ya tiene una solicitud de cita pendiente. Actualiza la página para verla.`,
          fieldErrors: {
            pet_id: 'Ya existe una solicitud pendiente',
          },
        }
      }

      logger.error('Failed to create booking request (RPC error)', {
        error: rpcError,
        userId: user.id,
        tenantId: pet.tenant_id,
        petId: pet_id,
        serviceIds: service_ids,
        errorCode: rpcError.code,
      })

      return actionError(ERROR_MESSAGES.GENERIC_APPOINTMENT_ERROR)
    }

    // Handle atomic function result
    if (!result?.success) {
      logger.error('Failed to create booking request (atomic)', {
        result,
        userId: user.id,
        tenantId: pet.tenant_id,
        petId: pet_id,
        serviceIds: service_ids,
      })

      return actionError(result?.error || ERROR_MESSAGES.GENERIC_APPOINTMENT_ERROR)
    }

    // Get clinic name for email
    const { data: tenant } = await supabase
      .from('tenants')
      .select('name')
      .eq('id', pet.tenant_id)
      .single()
    const clinicDisplayName = tenant?.name || clinic

    // Send "Request Received" Email
    try {
      const userEmail = user.email || 'correo_desconocido@example.com'
      const userName = profile.full_name || user.email || 'Usuario'

      // Format preferences for email
      let preferencesText = ''
      if (preferred_date_start || preferred_date_end) {
        if (preferred_date_start && preferred_date_end) {
          preferencesText += `Fechas preferidas: ${preferred_date_start} - ${preferred_date_end}\n`
        } else if (preferred_date_start) {
          preferencesText += `Fecha preferida: desde ${preferred_date_start}\n`
        }
      }
      if (preferred_time_of_day && preferred_time_of_day !== 'any') {
        preferencesText +=
          preferred_time_of_day === 'morning'
            ? 'Horario preferido: Por la mañana\n'
            : 'Horario preferido: Por la tarde\n'
      }

      await sendConfirmationEmail({
        to: userEmail,
        subject: `Solicitud de Cita Recibida - ${pet.name} en ${clinicDisplayName}`,
        body: generateBookingRequestEmail({
          userName: userName,
          petName: pet.name,
          services: serviceNames,
          estimatedDuration: totalDuration,
          preferences: preferencesText || null,
          notes: notes || null,
          clinicName: clinicDisplayName,
        }),
      })
    } catch (emailError: unknown) {
      logger.error('Failed to send booking request email', {
        error: emailError instanceof Error ? emailError : undefined,
        userId: user.id,
        tenantId: pet.tenant_id,
        petId: pet_id,
        serviceIds: service_ids,
      })
      // Continue even if email fails
    }

    revalidatePath(`/${clinic}/portal/dashboard`)

    return {
      success: true,
      message: 'Solicitud de cita enviada exitosamente',
      data: {
        appointment_id: result.appointment_id,
      },
    }
  }
)
