# Server Action Pattern Exemplar

## Overview

Pattern for Next.js Server Actions in the veterinary platform with proper validation, auth, and multi-tenancy.

## When to Use

- **Use for**: Form submissions, mutations, data updates
- **Critical for**: Any action that modifies database

## Good Pattern

```typescript
// app/actions/pets.ts
'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

// =====================================
// SCHEMAS
// =====================================

const createPetSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido').max(100),
  species: z.enum(['dog', 'cat', 'bird', 'other'], {
    errorMap: () => ({ message: 'Selecciona una especie válida' }),
  }),
  breed: z.string().max(100).optional(),
  birth_date: z.string().datetime().optional(),
  weight_kg: z.coerce.number().positive('El peso debe ser positivo').optional(),
  notes: z.string().max(1000).optional(),
})

const updatePetSchema = createPetSchema.partial()

// =====================================
// TYPES
// =====================================

type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string; fieldErrors?: Record<string, string[]> }

// =====================================
// ACTIONS
// =====================================

export async function createPet(formData: FormData): Promise<ActionResult<{ id: string }>> {
  const supabase = await createClient()

  // 1. Authentication
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return { success: false, error: 'No autorizado. Por favor inicia sesión.' }
  }

  // 2. Get profile for tenant context
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('clinic_id')
    .eq('id', user.id)
    .single()

  if (profileError || !profile) {
    return { success: false, error: 'Perfil no encontrado.' }
  }

  // 3. Parse form data
  const rawData = {
    name: formData.get('name'),
    species: formData.get('species'),
    breed: formData.get('breed') || undefined,
    birth_date: formData.get('birth_date') || undefined,
    weight_kg: formData.get('weight_kg') || undefined,
    notes: formData.get('notes') || undefined,
  }

  // 4. Validate
  const validation = createPetSchema.safeParse(rawData)
  if (!validation.success) {
    return {
      success: false,
      error: 'Datos inválidos',
      fieldErrors: validation.error.flatten().fieldErrors as Record<string, string[]>,
    }
  }

  // 5. Insert with tenant context
  const { data: pet, error: insertError } = await supabase
    .from('pets')
    .insert({
      ...validation.data,
      owner_id: user.id,
      clinic_id: profile.clinic_id,
    })
    .select('id')
    .single()

  if (insertError) {
    console.error('[Action] createPet error:', insertError)
    return { success: false, error: 'Error al crear la mascota. Intenta de nuevo.' }
  }

  // 6. Revalidate cache
  revalidatePath('/[clinic]/pets')

  return { success: true, data: { id: pet.id } }
}

export async function updatePet(
  petId: string,
  formData: FormData
): Promise<ActionResult> {
  const supabase = await createClient()

  // Auth check
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'No autorizado' }
  }

  // Parse and validate
  const rawData = Object.fromEntries(formData.entries())
  const validation = updatePetSchema.safeParse(rawData)
  if (!validation.success) {
    return {
      success: false,
      error: 'Datos inválidos',
      fieldErrors: validation.error.flatten().fieldErrors as Record<string, string[]>,
    }
  }

  // Update (RLS ensures ownership)
  const { error } = await supabase
    .from('pets')
    .update(validation.data)
    .eq('id', petId)
    .eq('owner_id', user.id)  // Double-check ownership

  if (error) {
    console.error('[Action] updatePet error:', error)
    return { success: false, error: 'Error al actualizar' }
  }

  revalidatePath('/[clinic]/pets')
  return { success: true, data: undefined }
}

export async function deletePet(petId: string): Promise<ActionResult> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'No autorizado' }
  }

  // Soft delete or hard delete based on business rules
  const { error } = await supabase
    .from('pets')
    .delete()
    .eq('id', petId)
    .eq('owner_id', user.id)

  if (error) {
    console.error('[Action] deletePet error:', error)
    return { success: false, error: 'Error al eliminar' }
  }

  revalidatePath('/[clinic]/pets')
  return { success: true, data: undefined }
}

// Staff-only action
export async function verifyVaccine(vaccineId: string): Promise<ActionResult> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'No autorizado' }
  }

  // Check staff role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, clinic_id')
    .eq('id', user.id)
    .single()

  if (!profile || !['vet', 'admin'].includes(profile.role)) {
    return { success: false, error: 'Solo el personal puede verificar vacunas' }
  }

  // Update vaccine
  const { error } = await supabase
    .from('vaccines')
    .update({
      verified: true,
      verified_by: user.id,
      verified_at: new Date().toISOString(),
    })
    .eq('id', vaccineId)
    .eq('clinic_id', profile.clinic_id)  // Tenant check

  if (error) {
    return { success: false, error: 'Error al verificar' }
  }

  revalidatePath('/[clinic]/vaccines')
  return { success: true, data: undefined }
}
```

**Why this is good:**
- `'use server'` directive at top
- Zod schemas with Spanish error messages
- Typed return with `ActionResult`
- Authentication check first
- Profile lookup for tenant context
- FormData parsing
- Validation with field-level errors
- RLS + explicit ownership check
- Error logging for debugging
- `revalidatePath` for cache invalidation
- Role check for staff actions

## Good Pattern - Form Usage

```tsx
// components/pets/pet-form.tsx
'use client'

import { useActionState } from 'react'
import { createPet } from '@/app/actions/pets'

export function PetForm({ clinic }: { clinic: string }) {
  const [state, formAction, pending] = useActionState(
    async (prevState: any, formData: FormData) => {
      const result = await createPet(formData)
      if (result.success) {
        // Redirect or show success
        window.location.href = `/${clinic}/pets/${result.data.id}`
      }
      return result
    },
    null
  )

  return (
    <form action={formAction}>
      {state?.error && (
        <div role="alert" className="p-4 mb-4 rounded bg-red-100 text-red-700">
          {state.error}
        </div>
      )}

      <div className="mb-4">
        <label htmlFor="name" className="block mb-2 font-medium">
          Nombre *
        </label>
        <input
          id="name"
          name="name"
          required
          className="w-full px-4 py-2 border rounded"
        />
        {state?.fieldErrors?.name && (
          <p className="mt-1 text-sm text-red-600">
            {state.fieldErrors.name[0]}
          </p>
        )}
      </div>

      <button
        type="submit"
        disabled={pending}
        className="px-6 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
      >
        {pending ? 'Guardando...' : 'Guardar'}
      </button>
    </form>
  )
}
```

## Bad Pattern

```typescript
// app/actions/pets.ts
'use server'

import { supabase } from '@/lib/supabase'

export async function createPet(data: any) {
  await supabase.from('pets').insert(data)
  return { ok: true }
}
```

**Why this is bad:**
- No authentication check
- No tenant isolation
- `any` type - no validation
- Client supabase instead of server
- No error handling
- No cache revalidation
- Direct data insertion (unsafe)

## Action Patterns Reference

### File Upload Action
```typescript
export async function uploadPetPhoto(
  petId: string,
  formData: FormData
): Promise<ActionResult<{ url: string }>> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'No autorizado' }

  const file = formData.get('photo') as File
  if (!file) return { success: false, error: 'Archivo requerido' }

  // Validate file
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
    return { success: false, error: 'Solo imágenes JPG, PNG o WebP' }
  }

  if (file.size > 5 * 1024 * 1024) {
    return { success: false, error: 'Máximo 5MB' }
  }

  // Upload to Supabase Storage
  const filename = `${petId}/${Date.now()}.${file.type.split('/')[1]}`
  const { error: uploadError } = await supabase.storage
    .from('pets')
    .upload(filename, file)

  if (uploadError) {
    return { success: false, error: 'Error al subir imagen' }
  }

  const { data: { publicUrl } } = supabase.storage
    .from('pets')
    .getPublicUrl(filename)

  // Update pet record
  await supabase.from('pets').update({ photo_url: publicUrl }).eq('id', petId)

  revalidatePath('/[clinic]/pets')
  return { success: true, data: { url: publicUrl } }
}
```

### Action with Redirect
```typescript
export async function signOut(clinic: string): Promise<never> {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect(`/${clinic}`)
}
```

## Final Must-Pass Checklist

- [ ] `'use server'` at file top
- [ ] Zod schema for validation
- [ ] Spanish error messages
- [ ] Typed return `ActionResult<T>`
- [ ] Authentication check first
- [ ] Profile lookup for clinic_id
- [ ] Validation before database
- [ ] Field-level errors returned
- [ ] Error logging with context
- [ ] `revalidatePath` after mutation
- [ ] Role check for staff actions
- [ ] No `any` types
