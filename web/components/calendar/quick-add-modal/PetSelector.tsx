/**
 * Pet Selector Component
 *
 * Searchable pet selection with owner info display.
 */

'use client'

import type { Pet } from './types'

interface PetSelectorProps {
  pets: Pet[]
  selectedPetId: string
  searchValue: string
  onPetSelect: (petId: string) => void
  onSearchChange: (value: string) => void
}

export function PetSelector({
  pets,
  selectedPetId,
  searchValue,
  onPetSelect,
  onSearchChange,
}: PetSelectorProps) {
  // Filter pets by search
  const filteredPets = searchValue
    ? pets.filter(
        (pet) =>
          pet.name.toLowerCase().includes(searchValue.toLowerCase()) ||
          pet.owner_name?.toLowerCase().includes(searchValue.toLowerCase())
      )
    : pets.slice(0, 10) // Show first 10 by default

  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-gray-700">Mascota *</label>
      <input
        type="text"
        placeholder="Buscar por nombre o dueño..."
        value={searchValue}
        onChange={(e) => onSearchChange(e.target.value)}
        className="mb-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
      />
      <div className="max-h-32 overflow-y-auto rounded-lg border border-gray-200">
        {filteredPets.length === 0 ? (
          <p className="p-3 text-center text-sm text-gray-500">No se encontraron mascotas</p>
        ) : (
          filteredPets.map((pet) => (
            <button
              key={pet.id}
              type="button"
              onClick={() => onPetSelect(pet.id)}
              className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-gray-50 ${
                selectedPetId === pet.id ? 'bg-[var(--primary)]/10' : ''
              }`}
            >
              <span>
                <span className="font-medium">{pet.name}</span>
                <span className="ml-2 text-gray-500">({pet.species})</span>
              </span>
              {pet.owner_name && <span className="text-xs text-gray-400">{pet.owner_name}</span>}
              {selectedPetId === pet.id && (
                <svg className="h-4 w-4 text-[var(--primary)]" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              )}
            </button>
          ))
        )}
      </div>
    </div>
  )
}
