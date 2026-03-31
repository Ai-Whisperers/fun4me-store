'use server'

import { withActionAuth, actionError } from '@/lib/actions'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { logger } from '@/lib/logger'

export const createMedicalRecord = withActionAuth(
  async ({ profile, user, supabase }, formData: FormData) => {
    const clinic = formData.get('clinic') as string
    const petId = formData.get('pet_id') as string
    const title = formData.get('title') as string
    const type = formData.get('type') as string
    const diagnosis = formData.get('diagnosis') as string
    const notes = formData.get('notes') as string

    // Get Vitals
    const vitals = {
      weight: formData.get('weight') ? Number(formData.get('weight')) : null,
      temp: formData.get('temp') ? Number(formData.get('temp')) : null,
      hr: formData.get('hr') ? Number(formData.get('hr')) : null,
      rr: formData.get('rr') ? Number(formData.get('rr')) : null,
    }

    // Get Files
    const files = formData.getAll('attachments') as File[]
    const uploadedUrls: string[] = []

    for (const file of files) {
      if (file.size > 0) {
        const fileExt = file.name.split('.').pop()
        const fileName = `${petId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`

        const { error: uploadError } = await supabase.storage.from('records').upload(fileName, file)

        if (uploadError) {
          logger.error('Error uploading medical record attachment', {
            tenantId: profile.tenant_id,
            userId: user.id,
            petId,
            fileName,
            error: uploadError.message,
          })
          continue // Skip failed uploads but continue
        }

        const {
          data: { publicUrl },
        } = supabase.storage.from('records').getPublicUrl(fileName)

        uploadedUrls.push(publicUrl)
      }
    }

    // Verify pet belongs to the same tenant
    const { data: pet } = await supabase.from('pets').select('tenant_id').eq('id', petId).single()

    if (!pet) {
      return actionError('Mascota no encontrada.')
    }

    if (pet.tenant_id !== profile.tenant_id) {
      return actionError('No tienes acceso a esta mascota.')
    }

    // Insert Record
    const { error } = await supabase.from('medical_records').insert({
      pet_id: petId,
      tenant_id: profile.tenant_id,
      performed_by: user.id,
      type,
      title,
      diagnosis,
      notes,
      vitals: vitals, // Save JSONB
      attachments: uploadedUrls, // Save URLs
      created_at: new Date().toISOString(),
    })

    if (error) {
      logger.error('Error creating medical record', {
        tenantId: profile.tenant_id,
        userId: user.id,
        petId,
        recordType: type,
        error: error.message,
      })
      return actionError('Failed to create record')
    }

    revalidatePath(`/${clinic}/portal/pets/${petId}`)
    redirect(`/${clinic}/portal/pets/${petId}`)
  },
  { requireStaff: true }
)
