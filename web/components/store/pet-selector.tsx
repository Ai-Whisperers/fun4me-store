'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { PawPrint, ChevronDown, Loader2, AlertCircle, Plus } from 'lucide-react'
import Link from 'next/link'

export interface Pet {
  id: string
  name: string
  species: string
  breed?: string
  image_url?: string
}

interface PetSelectorProps {
  /** Currently selected pet ID */
  selectedPetId?: string | null
  /** Callback when pet is selected (petId, optionally the full pet object) */
  onSelect: (petId: string | null, pet?: Pet) => void
  /** Clinic slug for pet fetching and links */
  clinic: string
  /** Whether selection is required */
  required?: boolean
  /** Label text */
  label?: string
  /** Help text shown below selector */
  helpText?: string
  /** Custom class name */
  className?: string
  /** Disable the selector */
  disabled?: boolean
}

/**
 * Pet selector dropdown for checkout.
 * Used when cart contains prescription items that require pet association.
 *
 * FEAT-013: Store Prescription Verification
 */
export function PetSelector({
  selectedPetId,
  onSelect,
  clinic,
  required = false,
  label,
  helpText,
  className = '',
  disabled = false,
}: PetSelectorProps) {
  const t = useTranslations('petSelector')
  const [pets, setPets] = useState<Pet[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isOpen, setIsOpen] = useState(false)

  const displayLabel = label ?? t('label')

  const selectedPet = pets.find((p) => p.id === selectedPetId)

  // Fetch user's pets
  useEffect(() => {
    const fetchPets = async () => {
      try {
        setIsLoading(true)
        setError(null)

        const response = await fetch(`/api/pets?clinic=${clinic}`)
        if (!response.ok) {
          throw new Error(t('errorLoadingPets'))
        }

        const data = await response.json()
        setPets(data.pets || data || [])
      } catch (e) {
        setError(e instanceof Error ? e.message : t('errorLoadingPets'))
      } finally {
        setIsLoading(false)
      }
    }

    fetchPets()
  }, [clinic])

  const handleSelect = (petId: string | null, pet?: Pet) => {
    onSelect(petId, pet)
    setIsOpen(false)
  }

  const getSpeciesIcon = (species: string) => {
    // Could be extended with specific icons per species
    return <PawPrint className="h-4 w-4" />
  }

  if (isLoading) {
    return (
      <div className={`rounded-xl border border-gray-200 bg-gray-50 p-4 ${className}`}>
        <div className="flex items-center gap-2 text-[var(--text-secondary)]">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm">{t('loadingPets')}</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={`rounded-xl border border-red-200 bg-red-50 p-4 ${className}`}>
        <div className="flex items-center gap-2 text-red-700">
          <AlertCircle className="h-4 w-4" />
          <span className="text-sm">{error}</span>
        </div>
      </div>
    )
  }

  if (pets.length === 0) {
    return (
      <div className={`rounded-xl border border-amber-200 bg-amber-50 p-4 ${className}`}>
        <div className="flex items-start gap-3">
          <PawPrint className="mt-0.5 h-5 w-5 text-amber-600" />
          <div>
            <p className="font-medium text-amber-800">{t('noPetsRegistered')}</p>
            <p className="mt-1 text-sm text-amber-700">
              {t('prescriptionRequired')}
            </p>
            <Link
              href={`/${clinic}/portal/pets/new`}
              className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-amber-700 hover:text-amber-900"
            >
              <Plus className="h-4 w-4" />
              {t('addPet')}
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={className}>
      {/* Label */}
      <label className="mb-2 block text-sm font-medium text-[var(--text-primary)]">
        {displayLabel}
        {required && <span className="ml-1 text-red-500">*</span>}
      </label>

      {/* Dropdown */}
      <div className="relative">
        <button
          type="button"
          onClick={() => !disabled && setIsOpen(!isOpen)}
          disabled={disabled}
          className={`flex w-full items-center justify-between rounded-xl border bg-white px-4 py-3 text-left transition ${
            isOpen ? 'border-[var(--primary)] ring-2 ring-[var(--primary)]/20' : 'border-gray-200'
          } ${disabled ? 'cursor-not-allowed opacity-60' : 'hover:border-gray-300'} ${
            required && !selectedPetId ? 'border-amber-300' : ''
          }`}
          aria-haspopup="listbox"
          aria-expanded={isOpen}
        >
          {selectedPet ? (
            <div className="flex items-center gap-3">
              {selectedPet.image_url ? (
                <img
                  src={selectedPet.image_url}
                  alt={selectedPet.name}
                  className="h-8 w-8 rounded-full object-cover"
                />
              ) : (
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--primary)]/10">
                  {getSpeciesIcon(selectedPet.species)}
                </div>
              )}
              <div>
                <span className="font-medium text-[var(--text-primary)]">{selectedPet.name}</span>
                {selectedPet.breed && (
                  <span className="ml-2 text-sm text-[var(--text-secondary)]">
                    ({selectedPet.breed})
                  </span>
                )}
              </div>
            </div>
          ) : (
            <span className="text-[var(--text-secondary)]">{t('selectPet')}</span>
          )}
          <ChevronDown
            className={`h-5 w-5 text-[var(--text-secondary)] transition ${isOpen ? 'rotate-180' : ''}`}
          />
        </button>

        {/* Dropdown menu */}
        {isOpen && (
          <div className="absolute z-20 mt-1 w-full rounded-xl border border-gray-200 bg-white py-1 shadow-lg">
            {/* Option to clear selection */}
            {!required && selectedPetId && (
              <button
                type="button"
                onClick={() => handleSelect(null, undefined)}
                className="flex w-full items-center gap-3 px-4 py-2 text-left text-sm text-[var(--text-secondary)] hover:bg-gray-50"
              >
                {t('noSelection')}
              </button>
            )}

            {/* Pet options */}
            {pets.map((pet) => (
              <button
                key={pet.id}
                type="button"
                onClick={() => handleSelect(pet.id, pet)}
                className={`flex w-full items-center gap-3 px-4 py-2 text-left hover:bg-gray-50 ${
                  pet.id === selectedPetId ? 'bg-[var(--primary)]/5' : ''
                }`}
              >
                {pet.image_url ? (
                  <img
                    src={pet.image_url}
                    alt={pet.name}
                    className="h-8 w-8 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--primary)]/10">
                    {getSpeciesIcon(pet.species)}
                  </div>
                )}
                <div>
                  <span className="font-medium text-[var(--text-primary)]">{pet.name}</span>
                  <div className="text-xs text-[var(--text-secondary)]">
                    {pet.species}
                    {pet.breed && ` - ${pet.breed}`}
                  </div>
                </div>
                {pet.id === selectedPetId && (
                  <span className="ml-auto text-[var(--primary)]">✓</span>
                )}
              </button>
            ))}

            {/* Add new pet link */}
            <div className="border-t border-gray-100 px-4 py-2">
              <Link
                href={`/${clinic}/portal/pets/new`}
                className="flex items-center gap-2 text-sm text-[var(--primary)] hover:underline"
              >
                <Plus className="h-4 w-4" />
                {t('addNewPet')}
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* Help text */}
      {helpText && <p className="mt-1.5 text-xs text-[var(--text-secondary)]">{helpText}</p>}

      {/* Required warning */}
      {required && !selectedPetId && (
        <p className="mt-1.5 text-xs text-amber-600">
          {t('prescriptionWarning')}
        </p>
      )}
    </div>
  )
}
