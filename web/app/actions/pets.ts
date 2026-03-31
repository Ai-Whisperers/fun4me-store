'use server'

import { withActionAuth } from '@/lib/auth'
import { actionSuccess, actionError } from '@/lib/errors'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { logger } from '@/lib/logger'

const updatePetSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido').max(100).optional(),
  species: z.enum(['dog', 'cat']).optional(),
  breed: z.string().max(100).optional(),
  weight_kg: z.number().positive().nullable().optional(),
  microchip_id: z.string().max(50).nullable().optional(),
  diet_category: z.string().nullable().optional(),
  diet_notes: z.string().nullable().optional(),
  sex: z.enum(['male', 'female', 'unknown']).optional(),
  is_neutered: z.boolean().optional(),
  color: z.string().max(100).nullable().optional(),
  temperament: z.string().nullable().optional(),
  allergies: z.string().nullable().optional(),
  existing_conditions: z.string().nullable().optional(),
  birth_date: z.string().nullable().optional(),
})

/**
 * Get pets for the current user (pet owner) with enhanced data
 */
export const getOwnerPets = withActionAuth(
  async ({ user, profile: _profile, supabase }, clinicSlug: string, query?: string) => {
    // Fetch pets with vaccines
    let supabaseQuery = supabase
      .from('pets')
      .select(
        `
        id,
        name,
        species,
        breed,
        birth_date,
        photo_url,
        weight_kg,
        allergies,
        chronic_conditions,
        tenant_id,
        owner_id,
        vaccines (
          id,
          name,
          next_due_date,
          status
        )
      `
      )
      .eq('owner_id', user.id)
      .eq('tenant_id', clinicSlug)
      .is('deleted_at', null)
      .order('name', { ascending: true })

    if (query) {
      supabaseQuery = supabaseQuery.ilike('name', `%${query}%`)
    }

    const { data: pets, error } = await supabaseQuery

    if (error) {
      logger.error('Error fetching owner pets', {
        tenantId: clinicSlug,
        userId: user.id,
        searchQuery: query,
        error: error.message,
      })
      return actionError('Error al obtener las mascotas')
    }

    if (!pets || pets.length === 0) {
      return actionSuccess([])
    }

    // Fetch next upcoming appointment for each pet
    const petIds = pets.map((p) => p.id)
    const now = new Date().toISOString()

    const { data: appointments } = await supabase
      .from('appointments')
      .select(
        `
        id,
        pet_id,
        start_time,
        status,
        services (name)
      `
      )
      .in('pet_id', petIds)
      .eq('tenant_id', clinicSlug)
      .gte('start_time', now)
      .in('status', ['scheduled', 'confirmed'])
      .order('start_time', { ascending: true })

    // Create a map of pet_id -> next appointment
    type AppointmentItem = NonNullable<typeof appointments>[number]
    const nextAppointmentMap: Record<string, AppointmentItem> = {}
    if (appointments) {
      for (const apt of appointments) {
        if (!nextAppointmentMap[apt.pet_id]) {
          nextAppointmentMap[apt.pet_id] = apt
        }
      }
    }

    // Fetch last completed appointment for each pet
    const { data: lastVisits } = await supabase
      .from('appointments')
      .select('pet_id, start_time')
      .in('pet_id', petIds)
      .eq('tenant_id', clinicSlug)
      .eq('status', 'completed')
      .order('start_time', { ascending: false })

    // Create a map of pet_id -> last visit date
    const lastVisitMap: Record<string, string> = {}
    if (lastVisits) {
      for (const visit of lastVisits) {
        if (!lastVisitMap[visit.pet_id]) {
          lastVisitMap[visit.pet_id] = visit.start_time
        }
      }
    }

    // Enhance pets with appointment data
    const enhancedPets = pets.map((pet) => ({
      ...pet,
      next_appointment: nextAppointmentMap[pet.id] || null,
      last_visit_date: lastVisitMap[pet.id] || null,
    }))

    return actionSuccess(enhancedPets)
  }
)

/**
 * Get detailed pet profile for owner or staff
 */
export const getPetProfile = withActionAuth(
  async ({ user, profile, supabase }, clinicSlug: string, petId: string) => {
    // Fetch full pet profile with related data
    // Note: medical_records and prescriptions tables don't exist yet
    const { data: pet, error } = await supabase
      .from('pets')
      .select(
        `
        *,
        vaccines (*),
        vaccine_reactions (*),
        profiles:owner_id (full_name, email, phone)
      `
      )
      .eq('id', petId)
      .eq('tenant_id', clinicSlug)
      .is('deleted_at', null)
      .single()

    if (error || !pet) {
      logger.error('Error fetching pet profile', {
        petId,
        tenantId: clinicSlug,
        error: error?.message,
      })
      return actionError('Mascota no encontrada')
    }

    // Authorization: Check if user is pet owner or staff
    const isStaff = ['vet', 'admin'].includes(profile.role)
    const isOwner = pet.owner_id === user.id

    if (!isStaff && !isOwner) {
      return actionError('No tienes permiso para ver esta mascota')
    }

    // Add empty arrays for missing tables to maintain compatibility
    return actionSuccess({
      ...pet,
      medical_records: [],
      prescriptions: [],
    })
  }
)

export const updatePet = withActionAuth(
  async ({ user, profile, supabase }, petId: string, formData: FormData) => {
    // Verify ownership or staff access
    const { data: pet } = await supabase
      .from('pets')
      .select('owner_id, tenant_id')
      .eq('id', petId)
      .is('deleted_at', null)
      .single()

    if (!pet) {
      return actionError('Mascota no encontrada')
    }

    const isStaff = ['vet', 'admin'].includes(profile.role)
    const isOwner = pet.owner_id === user.id
    const sameTenant = profile.tenant_id === pet.tenant_id

    if (!isOwner && !(isStaff && sameTenant)) {
      return actionError('No tienes permiso para editar esta mascota')
    }

    // Get clinic for revalidation
    const clinic = formData.get('clinic') as string

    // Parse and validate form data
    const rawData = {
      name: (formData.get('name') as string) || undefined,
      species: (formData.get('species') as string) || undefined,
      breed: (formData.get('breed') as string) || undefined,
      weight_kg: formData.get('weight_kg') ? parseFloat(formData.get('weight_kg') as string) : null,
      microchip_id: (formData.get('microchip_id') as string) || null,
      diet_category: (formData.get('diet_category') as string) || null,
      diet_notes: (formData.get('diet_notes') as string) || null,
      sex: (formData.get('sex') as string) || undefined,
      is_neutered: formData.get('is_neutered') === 'on' || formData.get('is_neutered') === 'true',
      color: (formData.get('color') as string) || null,
      temperament: (formData.get('temperament') as string) || null,
      allergies: (formData.get('allergies') as string) || null,
      existing_conditions: (formData.get('existing_conditions') as string) || null,
      birth_date: (formData.get('birth_date') as string) || null,
    }

    const validation = updatePetSchema.safeParse(rawData)
    if (!validation.success) {
      const firstError = validation.error.issues?.[0]
      return actionError(firstError?.message || 'Error de validación')
    }

    // Handle photo upload if provided
    const photo = formData.get('photo') as File
    let photoUrl = formData.get('existing_photo_url') as string | null

    if (photo && photo instanceof File && photo.size > 0) {
      const fileExt = photo.name.split('.').pop()
      const fileName = `${user.id}/${Date.now()}.${fileExt}`

      const { error: uploadError } = await supabase.storage.from('pets').upload(fileName, photo)

      if (uploadError) {
        logger.error('Error uploading pet photo', {
          tenantId: pet.tenant_id,
          userId: user.id,
          petId,
          fileName,
          error: uploadError.message,
        })
        return actionError('No se pudo subir la foto. Por favor intente de nuevo.')
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from('pets').getPublicUrl(fileName)
      photoUrl = publicUrl
    }

    // Handle photo removal
    const removePhoto = formData.get('remove_photo') === 'true'
    if (removePhoto) {
      photoUrl = null
    }

    // Prepare updates
    const updates: Record<string, unknown> = {
      ...validation.data,
      photo_url: photoUrl,
    }

    // Convert allergies string to array format for the database
    // The allergies column is an ARRAY type in PostgreSQL
    if (updates.allergies !== undefined) {
      const allergiesStr = updates.allergies as string | null
      if (allergiesStr && allergiesStr.trim()) {
        // Split by comma and trim each value
        updates.allergies = allergiesStr
          .split(',')
          .map((a) => a.trim())
          .filter((a) => a.length > 0)
      } else {
        updates.allergies = null
      }
    }

    // Map microchip_id (form field) to microchip_number (database column)
    if (updates.microchip_id !== undefined) {
      updates.microchip_number = updates.microchip_id
      delete updates.microchip_id
    }

    // Map existing_conditions (form field) to chronic_conditions (database column as array)
    if (updates.existing_conditions !== undefined) {
      const conditionsStr = updates.existing_conditions as string | null
      updates.chronic_conditions = conditionsStr ? [conditionsStr] : []
      delete updates.existing_conditions
    }

    // Remove undefined values
    Object.keys(updates).forEach((key) => {
      if (updates[key] === undefined) {
        delete updates[key]
      }
    })

    const { error } = await supabase.from('pets').update(updates).eq('id', petId)

    if (error) {
      logger.error('Error updating pet', {
        petId,
        tenantId: pet.tenant_id,
        userId: user.id,
        error: error.message,
        code: error.code,
        details: error.details,
      })
      return actionError('Error al guardar los cambios')
    }

    if (clinic) {
      revalidatePath(`/${clinic}/portal/pets/${petId}`)
      revalidatePath(`/${clinic}/portal/dashboard`)
    }

    return actionSuccess()
  }
)

export const deletePet = withActionAuth(async ({ user, supabase }, petId: string) => {
  // Verify ownership - only owners can delete their pets
  const { data: pet } = await supabase
    .from('pets')
    .select('owner_id, tenant_id')
    .eq('id', petId)
    .is('deleted_at', null)
    .single()

  if (!pet) {
    return actionError('Mascota no encontrada')
  }

  if (pet.owner_id !== user.id) {
    return actionError('Solo el dueño puede eliminar esta mascota')
  }

  // Soft delete
  const { error } = await supabase
    .from('pets')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', petId)

  if (error) {
    return actionError('Error al eliminar la mascota')
  }

  return actionSuccess()
})
