'use client'

import { useState } from 'react'
import * as Icons from 'lucide-react'

interface Pet {
  id: string
  name: string
  species: string
  breed?: string
  photo_url?: string
  owner?: {
    id: string
    full_name: string
    phone?: string
    email?: string
  }
}

interface PetSelectorProps {
  pets: Pet[]
  selectedPetId: string | null
  onSelect: (petId: string | null) => void
  disabled?: boolean
}

export function PetSelector({ pets, selectedPetId, onSelect, disabled }: PetSelectorProps) {
  const [search, setSearch] = useState('')
  const [isOpen, setIsOpen] = useState(false)

  const filteredPets = pets.filter((pet) => {
    const searchLower = search.toLowerCase()
    return (
      pet.name.toLowerCase().includes(searchLower) ||
      pet.owner?.full_name.toLowerCase().includes(searchLower) ||
      pet.species.toLowerCase().includes(searchLower)
    )
  })

  const selectedPet = pets.find((p) => p.id === selectedPetId)

  return (
    <div className="relative">
      <label className="mb-1 block text-sm font-medium text-[var(--text-primary)]">
        Mascota / Cliente *
      </label>

      {/* Selected display or search input */}
      {selectedPet && !isOpen ? (
        <div
          className="flex cursor-pointer items-center gap-3 rounded-lg border border-gray-200 bg-white p-3 hover:border-[var(--primary)]"
          onClick={() => !disabled && setIsOpen(true)}
        >
          <div className="bg-[var(--primary)]/10 flex h-10 w-10 items-center justify-center overflow-hidden rounded-lg">
            {selectedPet.photo_url ? (
              <img
                src={selectedPet.photo_url}
                alt={selectedPet.name}
                className="h-full w-full object-cover"
              />
            ) : (
              <Icons.PawPrint className="h-5 w-5 text-[var(--primary)]" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium text-[var(--text-primary)]">{selectedPet.name}</p>
            <p className="truncate text-sm text-[var(--text-secondary)]">
              {selectedPet.owner?.full_name} - {selectedPet.species}
            </p>
          </div>
          {!disabled && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onSelect(null)
                setIsOpen(true)
              }}
              className="p-1 text-gray-400 hover:text-gray-600"
            >
              <Icons.X className="h-4 w-4" />
            </button>
          )}
        </div>
      ) : (
        <div className="relative">
          <Icons.Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onFocus={() => setIsOpen(true)}
            placeholder="Buscar mascota o cliente..."
            disabled={disabled}
            className="focus:ring-[var(--primary)]/20 w-full rounded-lg border border-gray-200 py-3 pl-10 pr-4 outline-none focus:border-[var(--primary)] focus:ring-2"
          />
        </div>
      )}

      {/* Dropdown */}
      {isOpen && !disabled && (
        <div className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-lg border border-gray-200 bg-white shadow-lg">
          {filteredPets.length === 0 ? (
            <div className="p-4 text-center text-[var(--text-secondary)]">
              No se encontraron mascotas
            </div>
          ) : (
            filteredPets.map((pet) => (
              <button
                key={pet.id}
                type="button"
                onClick={() => {
                  onSelect(pet.id)
                  setSearch('')
                  setIsOpen(false)
                }}
                className="flex w-full items-center gap-3 p-3 text-left hover:bg-gray-50"
              >
                <div className="bg-[var(--primary)]/10 flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg">
                  {pet.photo_url ? (
                    <img
                      src={pet.photo_url}
                      alt={pet.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <Icons.PawPrint className="h-5 w-5 text-[var(--primary)]" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-[var(--text-primary)]">{pet.name}</p>
                  <p className="truncate text-sm text-[var(--text-secondary)]">
                    {pet.owner?.full_name} • {pet.species}
                    {pet.owner?.phone && ` • ${pet.owner.phone}`}
                  </p>
                </div>
              </button>
            ))
          )}
        </div>
      )}

      {/* Hidden input for form submission */}
      <input type="hidden" name="pet_id" value={selectedPetId || ''} />

      {/* Click outside to close */}
      {isOpen && <div className="fixed inset-0 z-0" onClick={() => setIsOpen(false)} />}
    </div>
  )
}
