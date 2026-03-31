'use client'

import type { JSX } from 'react'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Search } from 'lucide-react'
import type { Pet } from './types'

interface PetSearchStepProps {
  selectedPet: Pet | null
  onPetSelect: (pet: Pet) => void
  onNext: () => void
}

export default function PetSearchStep({
  selectedPet,
  onPetSelect,
  onNext,
}: PetSearchStepProps): JSX.Element {
  const [searchQuery, setSearchQuery] = useState('')
  const [pets, setPets] = useState<Pet[]>([])
  const [searchLoading, setSearchLoading] = useState(false)

  const supabase = createClient()

  const calculateAge = (dateOfBirth: string): string => {
    const birth = new Date(dateOfBirth)
    const now = new Date()
    const years = now.getFullYear() - birth.getFullYear()
    const months = now.getMonth() - birth.getMonth()

    if (years > 0) {
      return `${years} año${years > 1 ? 's' : ''}`
    }
    return `${months} mes${months !== 1 ? 'es' : ''}`
  }

  const searchPets = async (): Promise<void> => {
    if (!searchQuery.trim()) return

    setSearchLoading(true)
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error('No autorizado')

      const { data: profile } = await supabase
        .from('profiles')
        .select('tenant_id')
        .eq('id', user.id)
        .single()

      const { data, error } = await supabase
        .from('pets')
        .select(
          `
          id, name, species, breed, date_of_birth, weight,
          owner:profiles!pets_owner_id_fkey(full_name, phone)
        `
        )
        .eq('tenant_id', profile?.tenant_id)
        .or(`name.ilike.%${searchQuery}%,microchip_number.ilike.%${searchQuery}%`)
        .limit(10)

      if (error) throw error
      setPets((data || []) as unknown as Pet[])
    } catch (_error: unknown) {
      // Error searching pets - silently fail
    } finally {
      setSearchLoading(false)
    }
  }

  const handlePetSelect = (pet: Pet): void => {
    onPetSelect(pet)
  }

  const handleDeselect = (): void => {
    // Clear selection by triggering search to show pets list again
    setPets([])
    setSearchQuery('')
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-[var(--text-primary)]">Seleccionar Paciente</h3>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), searchPets())}
            placeholder="Buscar por nombre o microchip..."
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-default)] px-4 py-2 text-[var(--text-primary)]"
          />
          <Search className="absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-[var(--text-secondary)]" />
        </div>
        <button
          type="button"
          onClick={searchPets}
          disabled={searchLoading}
          className="rounded-lg bg-[var(--primary)] px-6 py-2 text-white hover:opacity-90 disabled:opacity-50"
        >
          Buscar
        </button>
      </div>

      {selectedPet ? (
        <div className="rounded-lg border-2 border-[var(--primary)] bg-[var(--bg-secondary)] p-4">
          <div className="flex items-start justify-between">
            <div>
              <h4 className="font-semibold text-[var(--text-primary)]">{selectedPet.name}</h4>
              <p className="text-sm text-[var(--text-secondary)]">
                {selectedPet.species} - {selectedPet.breed}
              </p>
              <p className="text-sm text-[var(--text-secondary)]">
                {calculateAge(selectedPet.date_of_birth)} • {selectedPet.weight} kg
              </p>
              <p className="mt-2 text-sm text-[var(--text-secondary)]">
                <strong>Dueño:</strong> {selectedPet.owner?.full_name}
              </p>
            </div>
            <button
              type="button"
              onClick={handleDeselect}
              className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            >
              Cambiar
            </button>
          </div>
        </div>
      ) : (
        <div className="grid max-h-96 gap-2 overflow-y-auto">
          {pets.map((pet) => (
            <button
              key={pet.id}
              type="button"
              onClick={() => handlePetSelect(pet)}
              className="rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] p-4 text-left transition-colors hover:border-[var(--primary)]"
            >
              <div className="font-medium text-[var(--text-primary)]">{pet.name}</div>
              <div className="text-sm text-[var(--text-secondary)]">
                {pet.species} - {pet.breed} • {calculateAge(pet.date_of_birth)}
              </div>
              <div className="text-sm text-[var(--text-secondary)]">
                Dueño: {pet.owner?.full_name}
              </div>
            </button>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={onNext}
        disabled={!selectedPet}
        className="w-full rounded-lg bg-[var(--primary)] py-3 text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
      >
        Continuar
      </button>
    </div>
  )
}
