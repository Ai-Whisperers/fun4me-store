'use server'

import { withActionAuth, actionError } from '@/lib/actions'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

/**
 * Server Action to assign a QR tag to a pet
 * Called directly from form action
 *
 * REF-005: Migrated to withActionAuth
 */
export const assignTag = withActionAuth(async ({ user, supabase }, formData: FormData) => {
  const tagCode = formData.get('tagCode') as string
  const petId = formData.get('petId') as string

  if (!tagCode || !petId) {
    return actionError('Código de etiqueta y mascota son requeridos')
  }

  // Verify the pet belongs to the user
  const { data: pet, error: petError } = await supabase
    .from('pets')
    .select('id, owner_id')
    .eq('id', petId)
    .single()

  if (petError || !pet) {
    return actionError('Mascota no encontrada')
  }

  if (pet.owner_id !== user.id) {
    return actionError('Esta mascota no te pertenece')
  }

  // Call the RPC to assign the tag
  const { data, error } = await supabase.rpc('assign_tag_to_pet', {
    tag_code: tagCode,
    target_pet_id: petId,
  })

  if (error) {
    return actionError(error.message)
  }

  // The RPC returns { error: '...' } or { success: true }
  if (data && data.error) {
    return actionError(data.error)
  }

  revalidatePath(`/tag/${tagCode}`)
  redirect(`/tag/${tagCode}`)
})
