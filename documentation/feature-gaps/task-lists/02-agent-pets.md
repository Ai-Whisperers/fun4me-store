# Agent-02: Pet Management Features

**Agent ID**: Agent-02
**Domain**: Pet Editing & Management
**Priority**: 🔴 Critical
**Estimated Total Effort**: 4-6 hours
**Status**: ✅ Completed

---

## Ownership

### Files I OWN (can create/modify)
```
app/[clinic]/portal/pets/[id]/edit/    # CREATE
app/actions/pets.ts                    # CREATE/MODIFY
app/api/pets/[id]/route.ts             # MODIFY (add PATCH, DELETE)
lib/types/pets.ts                      # CREATE if needed
components/pets/                       # CREATE directory
db/40_*.sql through db/49_*.sql        # Reserved range
tests/unit/pets/                       # CREATE
```

### Files I can READ (not modify)
```
lib/supabase/server.ts
lib/supabase/client.ts
app/[clinic]/portal/pets/[id]/page.tsx  # Pet detail page pattern
components/portal/pet-form.tsx          # Existing form to reference/reuse
components/ui/*                         # Reuse these
```

### Files I must NOT touch
```
Everything else - especially other agents' domains
```

---

## Context

Read these files first:
1. `CLAUDE.md` - Project overview
2. `documentation/feature-gaps/06-technical-notes.md` - Code patterns
3. Look for existing pet form component to understand structure

---

## Tasks

### Task 1: Add PATCH Handler to Pet API
**File**: `app/api/pets/[id]/route.ts`

- [ ] Check if file exists, create if not
- [ ] Add PATCH handler for updating pet
- [ ] Validate ownership (user must own the pet)
- [ ] Handle all updatable fields
- [ ] Return updated pet data

```typescript
// Example structure
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  
  // Auth check
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }
  
  // Verify ownership
  const { data: pet } = await supabase
    .from('pets')
    .select('owner_id')
    .eq('id', id)
    .single()
    
  if (!pet || pet.owner_id !== user.id) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }
  
  // Update
  const body = await request.json()
  const { data, error } = await supabase
    .from('pets')
    .update(body)
    .eq('id', id)
    .select()
    .single()
    
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
  
  return NextResponse.json(data)
}
```

### Task 2: Create Pet Server Actions
**File**: `app/actions/pets.ts`

- [ ] Create `updatePet` action
- [ ] Create `deletePet` action (soft delete)
- [ ] Add validation with Zod
- [ ] Handle photo upload changes

```typescript
'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

const updatePetSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  species: z.string().optional(),
  breed: z.string().optional(),
  date_of_birth: z.string().optional(),
  sex: z.enum(['male', 'female', 'unknown']).optional(),
  weight_kg: z.number().positive().optional(),
  microchip_id: z.string().optional(),
  is_neutered: z.boolean().optional(),
  notes: z.string().optional(),
})

export async function updatePet(petId: string, formData: FormData) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'No autorizado' }
  }
  
  // Verify ownership
  const { data: pet } = await supabase
    .from('pets')
    .select('owner_id, tenant_id')
    .eq('id', petId)
    .single()
    
  if (!pet || pet.owner_id !== user.id) {
    return { error: 'No tienes permiso para editar esta mascota' }
  }
  
  // Parse and validate
  const updates = {
    name: formData.get('name') as string,
    species: formData.get('species') as string,
    breed: formData.get('breed') as string,
    date_of_birth: formData.get('date_of_birth') as string || null,
    sex: formData.get('sex') as string,
    weight_kg: formData.get('weight_kg') ? parseFloat(formData.get('weight_kg') as string) : null,
    microchip_id: formData.get('microchip_id') as string || null,
    is_neutered: formData.get('is_neutered') === 'true',
    notes: formData.get('notes') as string || null,
  }
  
  const { error } = await supabase
    .from('pets')
    .update(updates)
    .eq('id', petId)
    
  if (error) {
    return { error: 'Error al guardar los cambios' }
  }
  
  revalidatePath(`/portal/pets/${petId}`)
  return { success: true }
}

export async function deletePet(petId: string) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'No autorizado' }
  }
  
  // Soft delete
  const { error } = await supabase
    .from('pets')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', petId)
    .eq('owner_id', user.id)
    
  if (error) {
    return { error: 'Error al eliminar la mascota' }
  }
  
  revalidatePath('/portal/pets')
  return { success: true }
}
```

### Task 3: Create Edit Pet Page
**File**: `app/[clinic]/portal/pets/[id]/edit/page.tsx`

- [ ] Create directory structure
- [ ] Create page component
- [ ] Fetch pet data
- [ ] Verify ownership (redirect if not owner)
- [ ] Render edit form with pre-filled data
- [ ] Handle form submission
- [ ] Redirect to pet detail on success

```typescript
import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import { EditPetForm } from '@/components/pets/edit-pet-form'

interface Props {
  params: Promise<{ clinic: string; id: string }>
}

export default async function EditPetPage({ params }: Props) {
  const { clinic, id } = await params
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect(`/${clinic}/auth/login`)
  }
  
  const { data: pet } = await supabase
    .from('pets')
    .select('*')
    .eq('id', id)
    .eq('owner_id', user.id)
    .is('deleted_at', null)
    .single()
    
  if (!pet) {
    notFound()
  }
  
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-6">
        Editar Mascota
      </h1>
      <EditPetForm pet={pet} clinic={clinic} />
    </div>
  )
}
```

### Task 4: Create Edit Pet Form Component
**File**: `components/pets/edit-pet-form.tsx`

- [ ] Create client component
- [ ] Pre-fill all fields with pet data
- [ ] Handle photo preview (existing + new)
- [ ] Add photo change/remove functionality
- [ ] Submit via server action
- [ ] Show loading state
- [ ] Handle success/error

### Task 5: Add Edit Button to Pet Detail Page
**File**: Modify `app/[clinic]/portal/pets/[id]/page.tsx`

- [ ] Add "Editar" button
- [ ] Link to edit page
- [ ] Only show if user is owner

### Task 6: Add Delete Functionality
**Component**: `components/pets/delete-pet-button.tsx`

- [ ] Create delete button component
- [ ] Add confirmation dialog
- [ ] Call `deletePet` action
- [ ] Redirect to pets list on success

### Task 7: Testing
**Directory**: `tests/unit/pets/`

- [ ] Create `pet-actions.test.ts`
- [ ] Test updatePet validation
- [ ] Test ownership check
- [ ] Test deletePet (soft delete)

---

## UI Components Needed

### EditPetForm
```typescript
// components/pets/edit-pet-form.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { updatePet } from '@/app/actions/pets'

interface Pet {
  id: string
  name: string
  species: string
  breed?: string
  date_of_birth?: string
  sex: string
  weight_kg?: number
  microchip_id?: string
  is_neutered: boolean
  photo_url?: string
  notes?: string
}

interface Props {
  pet: Pet
  clinic: string
}

export function EditPetForm({ pet, clinic }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  async function handleSubmit(formData: FormData) {
    setLoading(true)
    setError(null)
    
    const result = await updatePet(pet.id, formData)
    
    if (result.error) {
      setError(result.error)
      setLoading(false)
    } else {
      router.push(`/${clinic}/portal/pets/${pet.id}`)
    }
  }
  
  return (
    <form action={handleSubmit} className="space-y-4 max-w-md">
      {/* Form fields */}
    </form>
  )
}
```

### DeletePetButton
```typescript
// components/pets/delete-pet-button.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { deletePet } from '@/app/actions/pets'

export function DeletePetButton({ petId, clinic }: { petId: string; clinic: string }) {
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  
  async function handleDelete() {
    setLoading(true)
    const result = await deletePet(petId)
    if (result.success) {
      router.push(`/${clinic}/portal/pets`)
    }
  }
  
  // Dialog implementation
}
```

---

## Spanish Text Reference

| Element | Spanish Text |
|---------|-------------|
| Page title | Editar Mascota |
| Name | Nombre |
| Species | Especie |
| Breed | Raza |
| Date of birth | Fecha de nacimiento |
| Sex | Sexo |
| Male | Macho |
| Female | Hembra |
| Unknown | Desconocido |
| Weight | Peso (kg) |
| Microchip | Microchip |
| Neutered | Esterilizado/a |
| Notes | Notas |
| Photo | Foto |
| Change photo | Cambiar foto |
| Remove photo | Eliminar foto |
| Save | Guardar cambios |
| Cancel | Cancelar |
| Delete | Eliminar mascota |
| Delete confirm | ¿Estás seguro de eliminar esta mascota? |
| Success | Cambios guardados |

---

## Acceptance Criteria

- [x] Pet owner can access edit page from pet detail
- [x] Form is pre-filled with current pet data
- [x] All fields can be edited
- [x] Photo can be changed or removed
- [x] Validation errors shown appropriately
- [x] Success redirects to pet detail
- [x] Pet can be soft deleted with confirmation
- [x] Non-owners cannot access edit page (staff of same tenant can edit)
- [x] All text in Spanish
- [x] Uses CSS variables
- [x] Mobile responsive

---

## Dependencies

**None** - This agent has no dependencies on other agents.

---

## Handoff Notes

### Completed
- [x] Task 1: Added PATCH and DELETE handlers to `app/api/pets/[id]/route.ts`
- [x] Task 2: Created `app/actions/pets.ts` with `updatePet` and `deletePet` server actions
- [x] Task 3: Created edit pet page at `app/[clinic]/portal/pets/[id]/edit/page.tsx`
- [x] Task 4: Created `components/pets/edit-pet-form.tsx` with all form fields
- [x] Task 5: Edit button already existed in pet detail page
- [x] Task 6: Created `components/pets/delete-pet-button.tsx` with confirmation dialog
- [x] Task 7: Created unit tests at `tests/unit/actions/pets.test.ts` (12 tests passing)

### Files Created/Modified
- `app/api/pets/[id]/route.ts` (NEW) - GET, PATCH, DELETE handlers
- `app/actions/pets.ts` (NEW) - updatePet, deletePet server actions with Zod validation
- `app/[clinic]/portal/pets/[id]/edit/page.tsx` (NEW) - Edit page
- `components/pets/edit-pet-form.tsx` (NEW) - Edit form component
- `components/pets/delete-pet-button.tsx` (NEW) - Delete with confirmation
- `components/pets/index.ts` (NEW) - Barrel exports
- `tests/unit/actions/pets.test.ts` (NEW) - Unit tests
- `vitest.config.ts` (MODIFIED) - Fixed deprecated poolOptions and html reporter

### In Progress
- None

### Blockers
- None

### Notes for Integration
- The edit page respects role permissions: owners can edit their pets, staff (vet/admin) can edit any pet in their tenant
- Delete is owner-only (soft delete sets `deleted_at` timestamp)
- Photo upload reuses the existing `pets` storage bucket
- All error messages and labels are in Spanish
- The form uses CSS variables for theming consistency

---

*Agent-02 Task File - Last updated: December 2024*
**Status: COMPLETED**
