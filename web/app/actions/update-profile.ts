'use server'

import { withActionAuth, actionError, type FieldErrors } from '@/lib/actions'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { logger } from '@/lib/logger'

// Validation schema with detailed Spanish error messages
const updateProfileSchema = z.object({
  full_name: z
    .string()
    .min(1, 'El nombre completo es obligatorio')
    .min(2, 'El nombre debe tener al menos 2 caracteres')
    .max(100, 'El nombre no puede exceder 100 caracteres')
    .regex(/^[a-zA-ZáéíóúüñÁÉÍÓÚÜÑ\s'-]+$/, 'El nombre solo puede contener letras y espacios'),

  phone: z
    .string()
    .optional()
    .transform((val) => val?.trim() || null)
    .refine(
      (val) => {
        if (!val) return true
        // Allow various phone formats
        const cleaned = val.replace(/[\s\-().]/g, '')
        return /^\+?[0-9]{6,15}$/.test(cleaned)
      },
      { message: 'Ingresa un número de teléfono válido (ej: +595 981 123456)' }
    ),

  secondary_phone: z
    .string()
    .optional()
    .transform((val) => val?.trim() || null)
    .refine(
      (val) => {
        if (!val) return true
        const cleaned = val.replace(/[\s\-().]/g, '')
        return /^\+?[0-9]{6,15}$/.test(cleaned)
      },
      { message: 'Ingresa un número de teléfono válido' }
    ),

  address: z
    .string()
    .max(200, 'La dirección no puede exceder 200 caracteres')
    .optional()
    .transform((val) => val?.trim() || null),

  city: z
    .string()
    .max(100, 'La ciudad no puede exceder 100 caracteres')
    .optional()
    .transform((val) => val?.trim() || null),
})

export const updateProfile = withActionAuth(
  async ({ user, supabase }, prevState: unknown, formData: FormData) => {
    const clinic = formData.get('clinic') as string

    if (!clinic) {
      return actionError(
        'No se pudo identificar la clínica. Por favor, recarga la página e intenta de nuevo.'
      )
    }

    // Extract and validate form data
    const rawData = {
      full_name: formData.get('full_name') as string,
      phone: formData.get('phone') as string,
      secondary_phone: formData.get('secondary_phone') as string,
      address: formData.get('address') as string,
      city: formData.get('city') as string,
    }

    const validation = updateProfileSchema.safeParse(rawData)

    if (!validation.success) {
      const fieldErrors: FieldErrors = {}
      for (const issue of validation.error.issues) {
        const fieldName = issue.path[0] as string
        if (!fieldErrors[fieldName]) {
          fieldErrors[fieldName] = issue.message
        }
      }

      return actionError(
        'Por favor, revisa los campos marcados en rojo y corrige los errores.',
        fieldErrors
      )
    }

    const validData = validation.data

    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        full_name: validData.full_name,
        phone: validData.phone,
        secondary_phone: validData.secondary_phone,
        address: validData.address,
        city: validData.city,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id)

    if (updateError) {
      logger.error('Failed to update profile', {
        error: updateError,
        userId: user.id,
        tenant: clinic,
        errorCode: updateError.code,
      })

      let userMessage = 'No se pudo actualizar tu perfil. '

      if (updateError.code === '23505') {
        if (updateError.message.includes('phone')) {
          return actionError('Este número de teléfono ya está registrado.', {
            phone: 'Este número ya está siendo usado por otra cuenta.',
          })
        }
        userMessage += 'Algunos datos ya están en uso.'
      } else if (updateError.code === '42501') {
        userMessage += 'No tienes permiso para realizar esta acción.'
      } else {
        userMessage += 'Por favor, intenta de nuevo en unos minutos.'
      }

      return actionError(userMessage)
    }

    revalidatePath(`/${clinic}/portal/profile`)
    redirect(`/${clinic}/portal/profile?success=profile_updated`)
  }
)
