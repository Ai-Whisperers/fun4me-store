'use server'

import { withActionAuth, actionError } from '@/lib/actions'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { FieldErrors } from '@/lib/types/action-result'
import { z } from 'zod'
import { logger } from '@/lib/logger'
import { createClient } from '@/lib/supabase/server'

/**
 * REF-005: Migrated to withActionAuth
 */

// Validation schema with detailed Spanish error messages
const createPetSchema = z.object({
  name: z
    .string()
    .min(1, 'El nombre de tu mascota es obligatorio')
    .min(2, 'El nombre debe tener al menos 2 caracteres')
    .max(50, 'El nombre no puede exceder 50 caracteres')
    .regex(
      /^[a-zA-ZáéíóúüñÁÉÍÓÚÜÑ\s'-]+$/,
      'El nombre solo puede contener letras, espacios, apóstrofes y guiones'
    ),

  species: z.enum(['dog', 'cat'], {
    message: 'Debes seleccionar si es perro o gato',
  }),

  breed: z
    .string()
    .max(100, 'La raza no puede exceder 100 caracteres')
    .optional()
    .transform((val) => val || null),

  weight: z
    .string()
    .optional()
    .transform((val) => {
      if (!val || val === '') return null
      const num = parseFloat(val)
      return isNaN(num) ? null : num
    })
    .refine((val) => val === null || (val > 0 && val <= 500), {
      message: 'El peso debe estar entre 0.1 y 500 kg',
    }),

  sex: z.enum(['male', 'female'], {
    message: 'Debes indicar si tu mascota es macho o hembra',
  }),

  is_neutered: z
    .string()
    .nullable()
    .optional()
    .transform((val) => val === 'on'),

  color: z
    .string()
    .max(100, 'La descripción del color no puede exceder 100 caracteres')
    .optional()
    .transform((val) => val || null),

  temperament: z
    .enum(['unknown', 'friendly', 'shy', 'aggressive', 'calm'], {
      message: 'Selecciona un temperamento válido',
    })
    .optional()
    .default('unknown'),

  allergies: z
    .string()
    .max(500, 'Las alergias no pueden exceder 500 caracteres')
    .optional()
    .transform((val) => val || null),

  existing_conditions: z
    .string()
    .max(1000, 'Las condiciones preexistentes no pueden exceder 1000 caracteres')
    .optional()
    .transform((val) => val || null),

  microchip_id: z
    .string()
    .max(50, 'El ID del microchip no puede exceder 50 caracteres')
    .optional()
    .transform((val) => val || null),

  diet_category: z
    .enum(['', 'balanced', 'wet', 'raw', 'mixed', 'prescription'])
    .optional()
    .transform((val) => val || null),

  diet_notes: z
    .string()
    .max(500, 'Las notas de dieta no pueden exceder 500 caracteres')
    .optional()
    .transform((val) => val || null),

  date_of_birth: z
    .string()
    .optional()
    .transform((val) => val || null)
    .refine(
      (val) => {
        if (!val) return true
        const date = new Date(val)
        const now = new Date()
        return date <= now
      },
      { message: 'La fecha de nacimiento no puede ser en el futuro' }
    )
    .refine(
      (val) => {
        if (!val) return true
        const date = new Date(val)
        const minDate = new Date()
        minDate.setFullYear(minDate.getFullYear() - 40) // Max 40 years old
        return date >= minDate
      },
      { message: 'La fecha de nacimiento parece incorrecta (más de 40 años)' }
    ),
})

export const createPet = withActionAuth(async ({ user, supabase }, formData: FormData) => {
  // Get clinic from form
  const clinic = formData.get('clinic') as string

  if (!clinic) {
    return actionError(
      'No se pudo identificar la clínica. Por favor, recarga la página e intenta de nuevo.'
    )
  }

  // Extract form data
  const rawData = {
    name: formData.get('name') as string,
    species: formData.get('species') as string,
    breed: formData.get('breed') as string,
    weight: formData.get('weight') as string,
    sex: formData.get('sex') as string,
    is_neutered: formData.get('is_neutered') as string,
    color: formData.get('color') as string,
    temperament: formData.get('temperament') as string,
    allergies: formData.get('allergies') as string,
    existing_conditions: formData.get('existing_conditions') as string,
    microchip_id: formData.get('microchip_id') as string,
    diet_category: formData.get('diet_category') as string,
    diet_notes: formData.get('diet_notes') as string,
    date_of_birth: formData.get('date_of_birth') as string,
  }

  // Validate with Zod
  const validation = createPetSchema.safeParse(rawData)

  if (!validation.success) {
    const fieldErrors: FieldErrors = {}

    for (const issue of validation.error.issues) {
      const fieldName = issue.path[0] as string
      // Only keep the first error per field
      if (!fieldErrors[fieldName]) {
        fieldErrors[fieldName] = issue.message
      }
    }

    logger.error('Validation failed', { fieldErrors, issues: validation.error.issues })

    return {
      success: false as const,
      error:
        'Por favor, revisa los campos marcados en rojo y corrige los errores antes de continuar.',
      fieldErrors,
    }
  }

  const validData = validation.data

  // Handle Photo Upload
  const photo = formData.get('photo') as File
  let photoUrl = null

  if (photo && photo.size > 0) {
    // Validate file size (5MB max)
    const maxSize = 5 * 1024 * 1024
    if (photo.size > maxSize) {
      return {
        success: false as const,
        error: 'La foto es demasiado grande.',
        fieldErrors: {
          photo: `La foto debe pesar menos de 5MB. Tu archivo pesa ${(photo.size / 1024 / 1024).toFixed(1)}MB.`,
        },
      }
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
    if (!allowedTypes.includes(photo.type)) {
      return {
        success: false as const,
        error: 'Formato de imagen no soportado.',
        fieldErrors: {
          photo: 'Solo se permiten imágenes JPG, PNG, GIF o WebP. Por favor, elige otro archivo.',
        },
      }
    }

    const fileExt = photo.name.split('.').pop()?.toLowerCase() || 'jpg'
    const fileName = `${user.id}/${Date.now()}.${fileExt}`

    const { error: uploadError } = await supabase.storage.from('pets').upload(fileName, photo)

    if (uploadError) {
      logger.error('Failed to upload pet photo', {
        error: uploadError,
        userId: user.id,
        tenant: clinic,
      })

      // Provide helpful error message based on error type
      let photoErrorMessage = 'No se pudo subir la foto. '
      if (uploadError.message.includes('exceeded')) {
        photoErrorMessage += 'El archivo es demasiado grande.'
      } else if (uploadError.message.includes('type')) {
        photoErrorMessage += 'El formato de imagen no es válido.'
      } else {
        photoErrorMessage += 'Por favor, intenta con otra imagen o continúa sin foto.'
      }

      return {
        success: false as const,
        error: photoErrorMessage,
        fieldErrors: { photo: photoErrorMessage },
      }
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from('pets').getPublicUrl(fileName)
    photoUrl = publicUrl
  }

  // Prepare payload - ONLY include columns that exist in the pets table
  // Columns that DON'T exist in DB: temperament, diet_category, diet_notes
  const petPayload = {
    owner_id: user.id,
    tenant_id: clinic,
    name: validData.name,
    species: validData.species,
    breed: validData.breed,
    color: validData.color,
    sex: validData.sex,
    birth_date: validData.date_of_birth,
    is_neutered: validData.is_neutered,
    weight_kg: validData.weight,
    microchip_number: validData.microchip_id,
    photo_url: photoUrl,
    // Convert comma-separated allergies to array
    allergies: validData.allergies
      ? validData.allergies
          .split(',')
          .map((a) => a.trim())
          .filter((a) => a.length > 0)
      : [],
    // Store existing conditions as array in chronic_conditions
    chronic_conditions: validData.existing_conditions ? [validData.existing_conditions] : [],
    // Store temperament and diet info in notes field as workaround
    notes:
      [
        validData.temperament && validData.temperament !== 'unknown'
          ? `Temperamento: ${validData.temperament}`
          : null,
        validData.diet_category ? `Dieta: ${validData.diet_category}` : null,
        validData.diet_notes ? `Notas dieta: ${validData.diet_notes}` : null,
      ]
        .filter(Boolean)
        .join('. ') || null,
  }

  // Use service_role to bypass RLS (auth already verified above)
  const serviceSupabase = await createClient('service_role')

  // Verify profile exists (FK requirement)
  const { data: profileExists } = await serviceSupabase
    .from('profiles')
    .select('id')
    .eq('id', user.id)
    .maybeSingle()

  if (!profileExists) {
    return actionError(
      'Tu perfil no está configurado correctamente. Por favor, cierra sesión y vuelve a iniciar.'
    )
  }

  // Insert pet and get the ID back
  const { data: newPet, error: insertError } = await serviceSupabase
    .from('pets')
    .insert(petPayload)
    .select('id')
    .single()

  if (insertError) {
    logger.error('Failed to create pet', {
      error: insertError.message,
      code: insertError.code,
    })

    if (insertError.code === '23505') {
      return actionError('Ya existe una mascota con este microchip registrado.')
    }

    return actionError('No se pudo guardar la mascota. Por favor, intenta de nuevo.')
  }

  // If weight was provided, create initial weight history record for growth chart
  if (validData.weight && newPet?.id) {
    const { error: weightError } = await serviceSupabase.from('pet_weight_history').insert({
      pet_id: newPet.id,
      tenant_id: clinic,
      weight_kg: validData.weight,
      recorded_by: user.id,
      notes: 'Peso inicial al registrar mascota',
    })

    if (weightError) {
      // Log but don't fail - the pet was created successfully
      logger.warn('Failed to create initial weight history', {
        petId: newPet.id,
        error: weightError.message,
      })
    }
  }

  revalidatePath(`/${clinic}/portal/dashboard`)
  redirect(`/${clinic}/portal/dashboard`)
})
