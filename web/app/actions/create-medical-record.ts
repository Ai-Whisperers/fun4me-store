'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { logger } from '@/lib/logger'

// TICKET-TYPE-002: Define proper state interface for server actions
interface ActionState {
  error?: string
  success?: boolean
}

export async function createMedicalRecord(
  prevState: ActionState | null,
  formData: FormData
): Promise<ActionState> {
  const supabase = await createClient()

  // 1. Auth Check
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Debe iniciar sesión' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, tenant_id')
    .eq('id', user.id)
    .single()

  if (!profile || (profile.role !== 'vet' && profile.role !== 'admin')) {
    return { error: 'Acceso denegado. Solo personal médico.' }
  }

  const clinic = formData.get('clinic') as string
  const petId = formData.get('petId') as string
  const type = formData.get('type') as string
  const title = formData.get('title') as string
  const diagnosis = formData.get('diagnosis') as string
  const notes = formData.get('notes') as string

  if (!title || !type) {
    return { error: 'Título y Tipo son obligatorios' }
  }

  try {
    const { error } = await supabase.from('medical_records').insert({
      tenant_id: profile.tenant_id,
      pet_id: petId,
      performed_by: user.id,
      type,
      title,
      diagnosis,
      notes,
      attachments: [], // Todo: Handle file uploads
    })

    if (error) throw error
  } catch (error) {
    logger.error('Failed to create medical record', {
      error: error instanceof Error ? error : undefined,
      userId: user.id,
      tenant: profile.tenant_id,
      petId,
    })
    const message = error instanceof Error ? error.message : 'Error al guardar registro'
    return { error: message }
  }

  revalidatePath(`/${clinic}/portal/pets/${petId}`)
  redirect(`/${clinic}/portal/pets/${petId}`)
}
