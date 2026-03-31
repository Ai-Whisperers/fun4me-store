# FEAT-028 Pet Registration During Booking Wizard

## Priority: P2

## Category: Feature

## Status: Not Started

## Epic: [EPIC-16: User Experience](../epics/EPIC-16-user-experience.md)

## Description

If a user has no registered pets, the booking wizard shows an empty pet selection step with a link to register pets separately. This breaks the booking flow and requires users to navigate away, register a pet, then return to booking. The flow should allow inline pet registration.

### Current State

**File**: `web/components/booking/booking-wizard/PetSelection.tsx`

```typescript
// When no pets
if (!pets?.length) {
  return (
    <div className="text-center py-8">
      <p>No tienes mascotas registradas</p>
      <Link href={`/${clinic}/portal/pets/new`}>
        Registrar mascota
      </Link>
    </div>
  )
}
```

### Problems

1. User leaves booking flow to register pet
2. User may not return to complete booking
3. Poor user experience for new users
4. Conversion drop-off at this step

## Proposed Solution

### Inline Pet Registration Modal

```typescript
// web/components/booking/booking-wizard/PetSelection.tsx
const [showAddPet, setShowAddPet] = useState(false)

return (
  <div>
    {/* Existing pets */}
    {pets?.map(pet => (
      <PetCard key={pet.id} pet={pet} onClick={() => handlePetSelect(pet.id)} />
    ))}

    {/* Add new pet button */}
    <button
      onClick={() => setShowAddPet(true)}
      className="w-full border-2 border-dashed rounded-lg p-4 text-center hover:border-primary"
    >
      <Plus className="mx-auto h-8 w-8 text-gray-400" />
      <span className="mt-2 block text-sm text-gray-600">
        Agregar nueva mascota
      </span>
    </button>

    {/* Add Pet Modal */}
    <AddPetModal
      open={showAddPet}
      onClose={() => setShowAddPet(false)}
      onSuccess={(newPet) => {
        setShowAddPet(false)
        handlePetSelect(newPet.id)  // Auto-select the new pet
      }}
    />
  </div>
)
```

### Simplified Pet Form for Booking

```typescript
// web/components/booking/add-pet-modal.tsx
const quickPetSchema = z.object({
  name: z.string().min(1, 'Nombre requerido'),
  species: z.enum(['dog', 'cat', 'bird', 'rabbit', 'other']),
  breed: z.string().optional(),
  age_years: z.number().int().min(0).max(30).optional(),
  sex: z.enum(['male', 'female', 'unknown']).optional(),
})

export function AddPetModal({ open, onClose, onSuccess }) {
  const [isPending, startTransition] = useTransition()

  const handleSubmit = async (data: z.infer<typeof quickPetSchema>) => {
    startTransition(async () => {
      const result = await createPetQuick(data)
      if (result.success) {
        onSuccess(result.pet)
      } else {
        toast.error(result.error)
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Agregar Mascota</DialogTitle>
          <DialogDescription>
            Ingresa los datos básicos. Podrás completar el perfil después.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <Input name="name" label="Nombre" required />

          <Select name="species" label="Especie" required>
            <option value="dog">Perro</option>
            <option value="cat">Gato</option>
            <option value="bird">Ave</option>
            <option value="rabbit">Conejo</option>
            <option value="other">Otro</option>
          </Select>

          <Input name="breed" label="Raza (opcional)" />

          <Input name="age_years" type="number" label="Edad (años)" />

          <Select name="sex" label="Sexo">
            <option value="unknown">No sé</option>
            <option value="male">Macho</option>
            <option value="female">Hembra</option>
          </Select>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Guardando...' : 'Agregar y Continuar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
```

### Quick Create Pet Action

```typescript
// web/app/actions/create-pet-quick.ts
export const createPetQuick = withActionAuth(
  async ({ user, profile, supabase }, input: QuickPetInput) => {
    const { name, species, breed, age_years, sex } = input

    const { data: pet, error } = await supabase
      .from('pets')
      .insert({
        name,
        species,
        breed: breed || null,
        date_of_birth: age_years
          ? new Date(Date.now() - age_years * 365 * 24 * 60 * 60 * 1000).toISOString()
          : null,
        sex: sex || 'unknown',
        owner_id: user.id,
        tenant_id: profile.tenant_id,
      })
      .select()
      .single()

    if (error) {
      return { success: false, error: 'Error al crear la mascota' }
    }

    return { success: true, pet }
  }
)
```

## Implementation Steps

1. [ ] Create AddPetModal component with simplified form
2. [ ] Create createPetQuick server action
3. [ ] Update PetSelection to show "Add Pet" option
4. [ ] Auto-select newly created pet
5. [ ] Refresh pets list after creation
6. [ ] Add validation for required fields only
7. [ ] Handle loading states

## Acceptance Criteria

- [ ] User can add pet without leaving booking flow
- [ ] Modal shows simplified pet form
- [ ] Only essential fields required (name, species)
- [ ] Newly created pet auto-selected
- [ ] User continues to confirmation step
- [ ] Works for first-time users with no pets
- [ ] Full pet profile can be edited later

## Related Files

- `web/components/booking/booking-wizard/PetSelection.tsx`
- `web/components/booking/add-pet-modal.tsx` (create)
- `web/app/actions/create-pet-quick.ts` (create)

## Estimated Effort

4-6 hours

## UX Notes

- Keep form short (4-5 fields max)
- Don't require photo upload
- Age field can be approximate
- Show "complete profile later" message
- Pre-fill species based on popular choices
