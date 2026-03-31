'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { createClient } from '@/lib/supabase/client'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { Dog, Cat, PawPrint, Loader2, Plus, AlertCircle } from 'lucide-react'
import {
  classifyPetSize,
  SIZE_SHORT_LABELS,
  getSizeBadgeColor,
} from '@/lib/utils/pet-size'
import type { PetForService } from '@/lib/types/services'

interface PetSelectorProps {
  /** Called when a pet is selected */
  onSelect: (pet: PetForService) => void
  /** Currently selected pet ID */
  selectedPetId?: string
  /** Optional class name for the container */
  className?: string
}

/**
 * Pet Selector Component
 *
 * Fetches and displays the logged-in user's pets for service selection.
 * Shows pet photo, name, weight, and auto-classified size category.
 */
export function PetSelector({ onSelect, selectedPetId, className = '' }: PetSelectorProps) {
  const t = useTranslations('petSelector')
  const tPets = useTranslations('pets')
  const { clinic } = useParams<{ clinic: string }>()
  const supabase = createClient()

  const [pets, setPets] = useState<PetForService[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchPets = async () => {
      setLoading(true)
      setError(null)

      try {
        // Get current user
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser()

        if (userError || !user) {
          setError(t('loginRequired'))
          setLoading(false)
          return
        }

        // Fetch user's pets
        const { data, error: fetchError } = await supabase
          .from('pets')
          .select('id, name, species, breed, weight_kg, photo_url')
          .eq('owner_id', user.id)
          .order('name', { ascending: true })

        if (fetchError) {
          setError(t('errorLoadingPets'))
          setLoading(false)
          return
        }

        // Map to PetForService with size classification
        const petsWithSize: PetForService[] = (data || []).map((pet) => ({
          id: pet.id,
          name: pet.name,
          species: pet.species,
          breed: pet.breed,
          weight_kg: pet.weight_kg,
          photo_url: pet.photo_url,
          size_category: classifyPetSize(pet.weight_kg),
        }))

        setPets(petsWithSize)
      } catch (err) {
        setError(t('errorLoadingPets'))
        console.error('Unexpected error:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchPets()
  }, [])

  if (loading) {
    return (
      <div className={`flex items-center justify-center py-8 ${className}`}>
        <Loader2 className="h-6 w-6 animate-spin text-[var(--primary)]" />
        <span className="ml-2 text-[var(--text-secondary)]">{t('loadingPets')}</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className={`flex items-center gap-2 rounded-xl bg-red-50 p-4 text-red-700 ${className}`}>
        <AlertCircle className="h-5 w-5 shrink-0" />
        <span>{error}</span>
      </div>
    )
  }

  if (pets.length === 0) {
    return (
      <div className={`rounded-2xl bg-[var(--bg-subtle)] px-4 py-8 text-center ${className}`}>
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-white shadow-sm">
          <PawPrint className="h-8 w-8 text-gray-400" />
        </div>
        <p className="mb-4 text-[var(--text-secondary)]">{t('noPetsRegisteredAlt')}</p>
        <Link
          href={`/${clinic}/portal/pets/new`}
          className="inline-flex items-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-2 font-bold text-white transition hover:brightness-110"
        >
          <Plus className="h-4 w-4" />
          {t('registerPet')}
        </Link>
      </div>
    )
  }

  return (
    <div className={`space-y-3 ${className}`}>
      <p className="mb-2 text-sm font-medium text-[var(--text-secondary)]">
        {t('selectForService')}
      </p>

      <div className="grid gap-3">
        {pets.map((pet) => {
          const isSelected = pet.id === selectedPetId
          const sizeColor = getSizeBadgeColor(pet.size_category)

          return (
            <button
              key={pet.id}
              type="button"
              onClick={() => onSelect(pet)}
              className={`flex w-full items-center gap-4 rounded-2xl border-2 p-4 text-left transition-all ${
                isSelected
                  ? 'bg-[var(--primary)]/5 border-[var(--primary)] shadow-md'
                  : 'hover:border-[var(--primary)]/50 border-gray-200 bg-white hover:shadow-sm'
              }`}
            >
              {/* Pet Photo */}
              <div className="shrink-0">
                {pet.photo_url ? (
                  <img
                    src={pet.photo_url}
                    alt={pet.name}
                    className="h-14 w-14 rounded-full border-2 border-white object-cover shadow-sm"
                  />
                ) : (
                  <div className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-white bg-gray-100 shadow-sm">
                    {pet.species === 'dog' ? (
                      <Dog className="h-6 w-6 text-gray-400" />
                    ) : pet.species === 'cat' ? (
                      <Cat className="h-6 w-6 text-gray-400" />
                    ) : (
                      <PawPrint className="h-6 w-6 text-gray-400" />
                    )}
                  </div>
                )}
              </div>

              {/* Pet Info */}
              <div className="min-w-0 flex-grow">
                <div className="mb-1 flex items-center gap-2">
                  <span className="truncate font-bold text-[var(--text-primary)]">{pet.name}</span>
                  {/* Size Badge */}
                  <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${sizeColor}`}>
                    {SIZE_SHORT_LABELS[pet.size_category]}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
                  <span className="capitalize">
                    {pet.species === 'dog' ? tPets('dog') : pet.species === 'cat' ? tPets('cat') : pet.species}
                  </span>
                  {pet.breed && (
                    <>
                      <span className="text-gray-300">|</span>
                      <span>{pet.breed}</span>
                    </>
                  )}
                  {pet.weight_kg && (
                    <>
                      <span className="text-gray-300">|</span>
                      <span>{pet.weight_kg} kg</span>
                    </>
                  )}
                </div>
              </div>

              {/* Selection Indicator */}
              <div className="shrink-0">
                <div
                  className={`flex h-6 w-6 items-center justify-center rounded-full border-2 transition-colors ${
                    isSelected ? 'border-[var(--primary)] bg-[var(--primary)]' : 'border-gray-300'
                  }`}
                >
                  {isSelected && (
                    <svg
                      className="h-4 w-4 text-white"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={3}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  )}
                </div>
              </div>
            </button>
          )
        })}
      </div>

      {/* Link to add another pet */}
      <Link
        href={`/${clinic}/portal/pets/new`}
        className="mt-4 flex items-center gap-2 text-sm font-medium text-[var(--primary)] hover:underline"
      >
        <Plus className="h-4 w-4" />
        {t('registerAnotherPet')}
      </Link>
    </div>
  )
}
