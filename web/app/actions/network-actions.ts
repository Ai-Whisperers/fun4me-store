'use server'

import { withActionAuth } from '@/lib/actions/with-action-auth'
import { actionSuccess, actionError } from '@/lib/actions/result'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { logger } from '@/lib/logger'

// Validation schema
const requestAccessSchema = z.object({
  petId: z.string().uuid('El ID de la mascota debe ser un UUID válido'),
  clinicId: z.string().min(1, 'El ID de la clínica es obligatorio'),
})

export const requestAccess = withActionAuth<void, [string, string]>(
  async (context, petId: string, clinicId: string) => {
    // Validate input
    const validation = requestAccessSchema.safeParse({ petId, clinicId })
    if (!validation.success) {
      const fieldErrors = Object.fromEntries(
        Object.entries(validation.error.flatten().fieldErrors).map(([key, value]) => [
          key,
          value?.[0] || 'Error de validación',
        ])
      )
      return actionError('Por favor corrige los errores', fieldErrors)
    }

    const { supabase } = context

    try {
      const { data, error } = await supabase.rpc('grant_clinic_access', {
        target_pet_id: petId,
        target_clinic_id: clinicId,
      })

      if (error) {
        logger.error('Failed to grant clinic access', {
          error,
          userId: context.user.id,
          petId,
          clinicId,
        })
        return actionError(error.message)
      }

      revalidatePath(`/${clinicId}/portal/dashboard/patients`)
      return actionSuccess()
    } catch (e) {
      logger.error('Unexpected error in requestAccess', {
        error: e instanceof Error ? e : undefined,
        userId: context.user.id,
        petId,
        clinicId,
      })
      return actionError('Error interno del servidor')
    }
  },
  { requireStaff: false } // Pet owners should be able to request access
)
