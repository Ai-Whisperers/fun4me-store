'use server'

import { withActionAuth, actionError, actionSuccess } from '@/lib/actions'
import { revalidatePath } from 'next/cache'
import { FieldErrors } from '@/lib/types/action-result'
import { z } from 'zod'
import { logger } from '@/lib/logger'

/**
 * REF-005: Migrated to withActionAuth
 */

// Validation schema for staff invite
const inviteStaffSchema = z.object({
  email: z
    .string()
    .min(1, 'El correo electrónico es obligatorio')
    .email('Ingresa un correo electrónico válido (ej: veterinario@clinica.com)')
    .max(100, 'El correo no puede exceder 100 caracteres')
    .transform((val) => val.toLowerCase().trim()),

  role: z.enum(['vet', 'admin'], {
    message: 'Selecciona un cargo válido (Veterinario o Administrador)',
  }),
})

export const inviteStaff = withActionAuth(
  async ({ user, profile, supabase }, formData: FormData) => {
    const clinic = formData.get('clinic') as string

    // Extract form data
    const rawData = {
      email: formData.get('email') as string,
      role: formData.get('role') as string,
    }

    // Validate
    const validation = inviteStaffSchema.safeParse(rawData)

    if (!validation.success) {
      const fieldErrors: FieldErrors = {}
      for (const issue of validation.error.issues) {
        const fieldName = issue.path[0] as string
        if (!fieldErrors[fieldName]) {
          fieldErrors[fieldName] = issue.message
        }
      }

      return {
        success: false as const,
        error: 'Por favor, revisa los campos marcados en rojo.',
        fieldErrors,
      }
    }

    const validData = validation.data

    // Check if email already exists in profiles for this clinic
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id, full_name, role')
      .eq('email', validData.email)
      .single()

    if (existingProfile) {
      const roleText =
        existingProfile.role === 'vet'
          ? 'veterinario'
          : existingProfile.role === 'admin'
            ? 'administrador'
            : 'propietario'
      return {
        success: false as const,
        error: 'Este correo ya está registrado.',
        fieldErrors: {
          email: `"${existingProfile.full_name}" ya tiene una cuenta como ${roleText}. No es necesario invitarlo de nuevo.`,
        },
      }
    }

    // Check if already invited
    const { data: existingInvite } = await supabase
      .from('clinic_invites')
      .select('id, role, created_at')
      .eq('email', validData.email)
      .eq('tenant_id', profile.tenant_id)
      .single()

    if (existingInvite) {
      const inviteDate = new Date(existingInvite.created_at).toLocaleDateString()
      const roleText = existingInvite.role === 'vet' ? 'veterinario' : 'administrador'
      return {
        success: false as const,
        error: 'Este correo ya tiene una invitación pendiente.',
        fieldErrors: {
          email: `Ya se invitó a este correo como ${roleText} el ${inviteDate}. Puedes reenviar la invitación desde la lista de pendientes.`,
        },
      }
    }

    // Create invite
    const { error: insertError } = await supabase.from('clinic_invites').insert({
      tenant_id: profile.tenant_id,
      email: validData.email,
      role: validData.role,
      invited_by: user.id,
    })

    if (insertError) {
      logger.error('Failed to invite staff', {
        error: insertError,
        userId: user.id,
        tenant: profile.tenant_id,
        errorCode: insertError.code,
      })

      if (insertError.code === '23505') {
        return {
          success: false as const,
          error: 'Este correo ya tiene una invitación pendiente.',
          fieldErrors: {
            email: 'Ya existe una invitación para este correo electrónico.',
          },
        }
      }

      return actionError('No se pudo crear la invitación. Por favor, intenta de nuevo.')
    }

    revalidatePath(`/${clinic}/portal/team`)
    return actionSuccess()
  },
  { requireAdmin: true }
)

export const removeInvite = withActionAuth(
  async ({ profile, supabase }, formData: FormData) => {
    const id = formData.get('id') as string
    const clinic = formData.get('clinic') as string

    if (profile.tenant_id !== clinic) {
      return actionError('No tienes acceso a esta clínica.')
    }

    // Delete invite by ID with tenant filter for extra safety
    const { error: deleteError } = await supabase
      .from('clinic_invites')
      .delete()
      .eq('id', id)
      .eq('tenant_id', clinic)

    if (deleteError) {
      logger.error('Failed to delete staff invite', {
        error: deleteError,
        tenant: clinic,
        inviteId: id,
      })
      return actionError('No se pudo eliminar la invitación. Por favor, intenta de nuevo.')
    }

    revalidatePath(`/${clinic}/dashboard/team`)
    revalidatePath(`/${clinic}/portal/team`)
    return actionSuccess()
  },
  { requireAdmin: true }
)
