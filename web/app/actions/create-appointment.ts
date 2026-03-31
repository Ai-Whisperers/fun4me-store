'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { ActionResult, FieldErrors } from '@/lib/types/action-result'
import { sendConfirmationEmail } from '@/lib/notifications/service'
import { generateAppointmentConfirmationEmail } from '@/lib/email/templates'
import { ERROR_MESSAGES } from '@/lib/constants'
import { logger } from '@/lib/logger'

const createAppointmentSchema = z.object({
  clinic: z.string().min(1, ERROR_MESSAGES.CLINIC_IDENTIFICATION_FAILED),
  pet_id: z
    .string()
    .min(1, ERROR_MESSAGES.REQUIRED_PET_SELECTION)
    .uuid(ERROR_MESSAGES.INVALID_PET_ID),

  start_time: z
    .string()
    .min(1, ERROR_MESSAGES.REQUIRED_DATETIME)
    .refine(
      (val) => {
        const date = new Date(val)
        return !isNaN(date.getTime())
      },
      { message: ERROR_MESSAGES.INVALID_DATETIME }
    )
    .refine(
      (val) => {
        const date = new Date(val)
        const now = new Date()
        now.setMinutes(now.getMinutes() + 15) // At least 15 minutes in the future
        return date >= now
      },
      { message: ERROR_MESSAGES.APPOINTMENT_TOO_SOON }
    ),

  reason: z
    .string()
    .min(1, ERROR_MESSAGES.REQUIRED_REASON)
    .min(3, ERROR_MESSAGES.SHORT_REASON)
    .max(200, ERROR_MESSAGES.LONG_REASON),

  notes: z
    .string()
    .max(1000, ERROR_MESSAGES.LONG_NOTES)
    .optional()
    .transform((val) => val?.trim() || null),
})

export async function createAppointment(
  prevState: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const supabase = await createClient()

  // Auth Check
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) {
    return {
      success: false,
      error: ERROR_MESSAGES.LOGIN_REQUIRED,
    }
  }

  const clinic = formData.get('clinic') as string

  // Extract form data
  const rawData = {
    clinic: clinic,
    pet_id: formData.get('pet_id') as string,
    start_time: formData.get('start_time') as string,
    reason: formData.get('reason') as string,
    notes: formData.get('notes') as string,
  }

  // Validate
  const validation = createAppointmentSchema.safeParse(rawData)

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

  const { pet_id, start_time, reason, notes } = validation.data

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

  // Calculate End Time (Default 30 mins)
  const start = new Date(start_time)
  const end = new Date(start.getTime() + 30 * 60000)

  // Check for Same Pet multiple appointments on same day (Business Rule)
  // This check stays here as it's a business rule, not a race condition concern
  const { data: existingAppointments } = await supabase
    .from('appointments')
    .select('id, start_time')
    .eq('pet_id', pet_id)
    .neq('status', 'cancelled')
    .gte('start_time', new Date().toISOString())

  if (existingAppointments && existingAppointments.length > 0) {
    const sameDay = existingAppointments.find((apt) => {
      const aptDate = new Date(apt.start_time)
      return aptDate.toDateString() === start.toDateString()
    })

    if (sameDay) {
      const existingTime = new Date(sameDay.start_time).toLocaleTimeString('es-PY', {
        hour: '2-digit',
        minute: '2-digit',
      })
      return {
        success: false,
        error: ERROR_MESSAGES.APPOINTMENT_ON_SAME_DAY(pet.name, existingTime),
        fieldErrors: {
          start_time: ERROR_MESSAGES.APPOINTMENT_ON_SAME_DAY(pet.name, existingTime).split('. ')[1],
        },
      }
    }
  }

  // Atomic appointment creation with advisory lock to prevent race conditions
  // This replaces the separate overlap check + INSERT pattern
  const { data: result, error: rpcError } = await supabase.rpc('create_appointment_atomic', {
    p_tenant_id: pet.tenant_id,
    p_pet_id: pet_id,
    p_start_time: start.toISOString(),
    p_end_time: end.toISOString(),
    p_reason: reason,
    p_notes: notes,
    p_created_by: user.id,
  })

  if (rpcError) {
    logger.error('Failed to create appointment (RPC error)', {
      error: rpcError,
      userId: user.id,
      tenantId: pet.tenant_id,
      petId: pet_id,
      errorCode: rpcError.code,
    })

    return {
      success: false,
      error: ERROR_MESSAGES.GENERIC_APPOINTMENT_ERROR,
    }
  }

  // Handle atomic function result
  if (!result?.success) {
    const errorCode = result?.error_code

    if (errorCode === 'slot_taken' || errorCode === 'vet_busy') {
      return {
        success: false,
        error: result?.error || ERROR_MESSAGES.SLOT_ALREADY_TAKEN,
        fieldErrors: {
          start_time: ERROR_MESSAGES.SLOT_ALREADY_TAKEN,
        },
      }
    }

    logger.error('Failed to create appointment (atomic)', {
      result,
      userId: user.id,
      tenantId: pet.tenant_id,
      petId: pet_id,
    })

    return {
      success: false,
      error: result?.error || ERROR_MESSAGES.GENERIC_APPOINTMENT_ERROR,
    }
  }

  // Get clinic name for email (not just the slug)
  const { data: tenant } = await supabase
    .from('tenants')
    .select('name')
    .eq('id', pet.tenant_id)
    .single()
  const clinicDisplayName = tenant?.name || clinic

  // Send Confirmation Email
  try {
    const userEmail = user.email || 'correo_desconocido@example.com' // Fallback if email is not available
    const userName = user.user_metadata?.full_name || user.email // Fallback for name

    await sendConfirmationEmail({
      to: userEmail,
      subject: `Confirmación de Cita para ${pet.name} en ${clinicDisplayName}`,
      body: generateAppointmentConfirmationEmail({
        userName: userName,
        petName: pet.name,
        reason: reason,
        dateTime: new Date(start.toISOString()).toLocaleString('es-PY', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        }),
        clinicName: clinicDisplayName,
      }),
    })
  } catch (emailError: unknown) {
    logger.error('Failed to send appointment confirmation email', {
      error: emailError instanceof Error ? emailError : undefined,
      userId: user.id,
      tenantId: pet.tenant_id,
      petId: pet_id,
    })
    // Continue with the appointment process even if email sending fails
  }

  revalidatePath(`/${clinic}/portal/dashboard`)
  redirect(`/${clinic}/portal/dashboard?success=appointment_created`)
}

/**
 * Create appointment from JSON input (used by booking store)
 * Returns ActionResult without redirecting
 */
export async function createAppointmentJson(input: {
  clinic: string
  pet_id: string
  start_time: string
  reason: string
  notes?: string | null
}): Promise<ActionResult> {
  const supabase = await createClient()

  // Auth Check
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) {
    return {
      success: false,
      error: ERROR_MESSAGES.LOGIN_REQUIRED,
    }
  }

  // Validate
  const validation = createAppointmentSchema.safeParse(input)

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

  const { clinic, pet_id, start_time, reason, notes } = validation.data

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

  // Calculate End Time (Default 30 mins)
  const start = new Date(start_time)
  const end = new Date(start.getTime() + 30 * 60000)

  // Check for Same Pet multiple appointments on same day (Business Rule)
  const { data: existingAppointments } = await supabase
    .from('appointments')
    .select('id, start_time')
    .eq('pet_id', pet_id)
    .neq('status', 'cancelled')
    .gte('start_time', new Date().toISOString())

  if (existingAppointments && existingAppointments.length > 0) {
    const sameDay = existingAppointments.find((apt) => {
      const aptDate = new Date(apt.start_time)
      return aptDate.toDateString() === start.toDateString()
    })

    if (sameDay) {
      const existingTime = new Date(sameDay.start_time).toLocaleTimeString('es-PY', {
        hour: '2-digit',
        minute: '2-digit',
      })
      return {
        success: false,
        error: ERROR_MESSAGES.APPOINTMENT_ON_SAME_DAY(pet.name, existingTime),
        fieldErrors: {
          start_time: ERROR_MESSAGES.APPOINTMENT_ON_SAME_DAY(pet.name, existingTime).split('. ')[1],
        },
      }
    }
  }

  // Atomic appointment creation with advisory lock to prevent race conditions
  const { data: result, error: rpcError } = await supabase.rpc('create_appointment_atomic', {
    p_tenant_id: pet.tenant_id,
    p_pet_id: pet_id,
    p_start_time: start.toISOString(),
    p_end_time: end.toISOString(),
    p_reason: reason,
    p_notes: notes,
    p_created_by: user.id,
  })

  if (rpcError) {
    logger.error('Failed to create appointment (JSON RPC error)', {
      error: rpcError,
      userId: user.id,
      tenantId: pet.tenant_id,
      petId: pet_id,
      errorCode: rpcError.code,
    })

    return {
      success: false,
      error: ERROR_MESSAGES.GENERIC_APPOINTMENT_ERROR,
    }
  }

  // Handle atomic function result
  if (!result?.success) {
    const errorCode = result?.error_code

    if (errorCode === 'slot_taken' || errorCode === 'vet_busy') {
      return {
        success: false,
        error: result?.error || ERROR_MESSAGES.SLOT_ALREADY_TAKEN,
        fieldErrors: {
          start_time: ERROR_MESSAGES.SLOT_ALREADY_TAKEN,
        },
      }
    }

    logger.error('Failed to create appointment (JSON atomic)', {
      result,
      userId: user.id,
      tenantId: pet.tenant_id,
      petId: pet_id,
    })

    return {
      success: false,
      error: result?.error || ERROR_MESSAGES.GENERIC_APPOINTMENT_ERROR,
    }
  }

  // Get clinic name for email (not just the slug)
  const { data: tenant } = await supabase
    .from('tenants')
    .select('name')
    .eq('id', pet.tenant_id)
    .single()
  const clinicDisplayName = tenant?.name || clinic

  // Send Confirmation Email (Epic 3.5)
  let emailFailed = false
  try {
    const userEmail = user.email || 'correo_desconocido@example.com'
    const userName = user.user_metadata?.full_name || user.email

    await sendConfirmationEmail({
      to: userEmail,
      subject: `Confirmación de Cita para ${pet.name} en ${clinicDisplayName}`,
      body: generateAppointmentConfirmationEmail({
        userName: userName,
        petName: pet.name,
        reason: reason,
        dateTime: new Date(start.toISOString()).toLocaleString('es-PY', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        }),
        clinicName: clinicDisplayName,
      }),
    })
  } catch (emailError) {
    emailFailed = true
    logger.error('Failed to send appointment confirmation email (JSON)', {
      error: emailError instanceof Error ? emailError : undefined,
      userId: user.id,
      tenantId: pet.tenant_id,
      petId: pet_id,
    })
  }

  revalidatePath(`/${clinic}/portal/dashboard`)

  // Epic 3.5: Notify user if email failed
  return {
    success: true,
    message: emailFailed 
      ? 'Cita creada exitosamente. Nota: No pudimos enviar el correo de confirmación, pero tu cita está guardada.'
      : 'Cita creada exitosamente',
    warning: emailFailed ? 'No se pudo enviar el correo de confirmación' : undefined,
  }
}

/**
 * Schema for multi-service appointment creation
 */
const createMultiServiceAppointmentSchema = z.object({
  clinic: z.string().min(1, ERROR_MESSAGES.CLINIC_IDENTIFICATION_FAILED),
  pet_id: z
    .string()
    .min(1, ERROR_MESSAGES.REQUIRED_PET_SELECTION)
    .uuid(ERROR_MESSAGES.INVALID_PET_ID),
  start_time: z
    .string()
    .min(1, ERROR_MESSAGES.REQUIRED_DATETIME)
    .refine(
      (val) => {
        const date = new Date(val)
        return !isNaN(date.getTime())
      },
      { message: ERROR_MESSAGES.INVALID_DATETIME }
    )
    .refine(
      (val) => {
        const date = new Date(val)
        const now = new Date()
        now.setMinutes(now.getMinutes() + 15)
        return date >= now
      },
      { message: ERROR_MESSAGES.APPOINTMENT_TOO_SOON }
    ),
  service_ids: z
    .array(z.string().uuid('ID de servicio inválido'))
    .min(1, 'Debes seleccionar al menos un servicio')
    .max(5, 'No puedes reservar más de 5 servicios a la vez'),
  notes: z
    .string()
    .max(1000, ERROR_MESSAGES.LONG_NOTES)
    .optional()
    .transform((val) => val?.trim() || null),
})

/**
 * Create multiple sequential appointments for multi-service booking
 * Returns ActionResult without redirecting
 */
export async function createMultiServiceAppointmentJson(input: {
  clinic: string
  pet_id: string
  start_time: string
  service_ids: string[]
  notes?: string | null
}): Promise<ActionResult<{ booking_group_id: string; appointment_ids: string[] }>> {
  const supabase = await createClient()

  // Auth Check
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) {
    return {
      success: false,
      error: ERROR_MESSAGES.LOGIN_REQUIRED,
    }
  }

  // Validate
  const validation = createMultiServiceAppointmentSchema.safeParse(input)

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

  const { clinic, pet_id, start_time, service_ids, notes } = validation.data

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
    logger.warn('Invalid service IDs in multi-service booking', {
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

  // Check for Same Pet multiple appointments on same day (Business Rule)
  const start = new Date(start_time)
  const { data: existingAppointments } = await supabase
    .from('appointments')
    .select('id, start_time')
    .eq('pet_id', pet_id)
    .neq('status', 'cancelled')
    .gte('start_time', new Date().toISOString())

  if (existingAppointments && existingAppointments.length > 0) {
    const sameDay = existingAppointments.find((apt) => {
      const aptDate = new Date(apt.start_time)
      return aptDate.toDateString() === start.toDateString()
    })

    if (sameDay) {
      const existingTime = new Date(sameDay.start_time).toLocaleTimeString('es-PY', {
        hour: '2-digit',
        minute: '2-digit',
      })
      return {
        success: false,
        error: ERROR_MESSAGES.APPOINTMENT_ON_SAME_DAY(pet.name, existingTime),
        fieldErrors: {
          start_time: ERROR_MESSAGES.APPOINTMENT_ON_SAME_DAY(pet.name, existingTime).split('. ')[1],
        },
      }
    }
  }

  const serviceNames = services?.map((s) => s.name).join(', ') || 'Servicios'
  const totalDuration = services?.reduce((sum, s) => sum + (s.duration_minutes || 30), 0) || 30

  // Call atomic multi-service booking RPC
  const { data: result, error: rpcError } = await supabase.rpc('create_multi_service_booking', {
    p_tenant_id: pet.tenant_id,
    p_pet_id: pet_id,
    p_start_time: start.toISOString(),
    p_service_ids: service_ids,
    p_notes: notes,
    p_created_by: user.id,
  })

  if (rpcError) {
    logger.error('Failed to create multi-service booking (RPC error)', {
      error: rpcError,
      userId: user.id,
      tenantId: pet.tenant_id,
      petId: pet_id,
      serviceIds: service_ids,
      errorCode: rpcError.code,
    })

    return {
      success: false,
      error: ERROR_MESSAGES.GENERIC_APPOINTMENT_ERROR,
    }
  }

  // Handle atomic function result
  if (!result?.success) {
    const errorCode = result?.error_code

    if (errorCode === 'slot_taken' || errorCode === 'vet_busy') {
      return {
        success: false,
        error: result?.error || ERROR_MESSAGES.SLOT_ALREADY_TAKEN,
        fieldErrors: {
          start_time: ERROR_MESSAGES.SLOT_ALREADY_TAKEN,
        },
      }
    }

    if (errorCode === 'same_pet_same_day') {
      return {
        success: false,
        error: result?.error || `${pet.name} ya tiene una cita programada para este día`,
        fieldErrors: {
          start_time: 'Ya existe una cita para este día',
        },
      }
    }

    logger.error('Failed to create multi-service booking (atomic)', {
      result,
      userId: user.id,
      tenantId: pet.tenant_id,
      petId: pet_id,
      serviceIds: service_ids,
    })

    return {
      success: false,
      error: result?.error || ERROR_MESSAGES.GENERIC_APPOINTMENT_ERROR,
    }
  }

  // Calculate end time for email
  const endTime = new Date(start.getTime() + totalDuration * 60000)

  // Get clinic name for email (not just the slug)
  const { data: tenant } = await supabase
    .from('tenants')
    .select('name')
    .eq('id', pet.tenant_id)
    .single()
  const clinicDisplayName = tenant?.name || clinic

  // Send Confirmation Email for the group (Epic 3.5)
  let emailFailed = false
  try {
    const userEmail = user.email || 'correo_desconocido@example.com'
    const userName = user.user_metadata?.full_name || user.email

    const dateTimeStr = start.toLocaleString('es-PY', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })

    const endTimeStr = endTime.toLocaleTimeString('es-PY', {
      hour: '2-digit',
      minute: '2-digit',
    })

    await sendConfirmationEmail({
      to: userEmail,
      subject: `Confirmación de Citas para ${pet.name} en ${clinicDisplayName}`,
      body: generateAppointmentConfirmationEmail({
        userName: userName,
        petName: pet.name,
        reason: serviceNames,
        dateTime: `${dateTimeStr} - ${endTimeStr} (${totalDuration} min)`,
        clinicName: clinicDisplayName,
      }),
    })
  } catch (emailError: unknown) {
    emailFailed = true
    logger.error('Failed to send multi-service confirmation email', {
      error: emailError instanceof Error ? emailError : undefined,
      userId: user.id,
      tenantId: pet.tenant_id,
      petId: pet_id,
      serviceIds: service_ids,
    })
  }

  revalidatePath(`/${clinic}/portal/dashboard`)

  // Epic 3.5: Notify user if email failed
  const baseMessage = service_ids.length > 1 ? 'Citas creadas exitosamente' : 'Cita creada exitosamente'
  return {
    success: true,
    message: emailFailed 
      ? `${baseMessage}. Nota: No pudimos enviar el correo de confirmación, pero tus citas están guardadas.`
      : baseMessage,
    warning: emailFailed ? 'No se pudo enviar el correo de confirmación' : undefined,
    data: {
      booking_group_id: result.booking_group_id,
      appointment_ids: result.appointment_ids,
    },
  }
}
