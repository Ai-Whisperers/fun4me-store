import Link from 'next/link'
import { Calendar, Activity, Syringe } from 'lucide-react'
import type { Pet } from './types'
import { calculateAge, getSpeciesEmoji } from './utils'

interface PetCardProps {
  pet: Pet
  clinic: string
}

export function PetCard({ pet, clinic }: PetCardProps): React.ReactElement {
  return (
    <Link
      href={`/${clinic}/portal/pets/${pet.id}`}
      className="group flex items-start gap-4 rounded-xl border border-transparent bg-[var(--bg-subtle)] p-4 transition-all hover:border-[var(--primary)] hover:shadow-md"
    >
      <div className="relative">
        {pet.photo_url ? (
          <img src={pet.photo_url} alt={pet.name} className="h-20 w-20 rounded-xl object-cover" />
        ) : (
          <div className="flex h-20 w-20 items-center justify-center rounded-xl bg-[var(--primary)] bg-opacity-10">
            <span className="text-3xl">{getSpeciesEmoji(pet.species)}</span>
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="mb-1 flex items-center gap-2">
          <h4 className="font-bold text-[var(--text-primary)] transition-colors group-hover:text-[var(--primary)]">
            {pet.name}
          </h4>
          {pet.sex && (
            <span
              className={`rounded px-1.5 py-0.5 text-xs ${
                pet.sex === 'male' ? 'bg-blue-100 text-blue-700' : 'bg-pink-100 text-pink-700'
              }`}
            >
              {pet.sex === 'male' ? '♂' : '♀'}
            </span>
          )}
        </div>
        <p className="mb-2 text-sm capitalize text-[var(--text-secondary)]">
          {pet.species} {pet.breed && `• ${pet.breed}`}
        </p>
        <div className="flex flex-wrap gap-2 text-xs">
          <span className="inline-flex items-center gap-1 rounded-md bg-white px-2 py-1 text-[var(--text-secondary)]">
            <Calendar className="h-3 w-3" />
            {calculateAge(pet.birth_date)}
          </span>
          {pet.is_neutered && (
            <span className="inline-flex items-center gap-1 rounded-md bg-white px-2 py-1 text-[var(--text-secondary)]">
              <Activity className="h-3 w-3" />
              Esterilizado
            </span>
          )}
          {pet.microchip_number && (
            <span
              className="inline-flex items-center gap-1 rounded-md bg-white px-2 py-1 text-[var(--text-secondary)]"
              title={pet.microchip_number}
            >
              <span className="flex h-3 w-3 items-center justify-center">📍</span>
              Chip
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-1 opacity-0 transition-opacity group-hover:opacity-100">
        <Link
          href={`/${clinic}/dashboard/appointments/new?pet=${pet.id}`}
          className="rounded-lg bg-white p-1.5 transition-colors hover:bg-[var(--primary)] hover:text-white"
          title="Nueva Cita"
          onClick={(e) => e.stopPropagation()}
        >
          <Calendar className="h-4 w-4" />
        </Link>
        <Link
          href={`/${clinic}/portal/pets/${pet.id}/vaccines`}
          className="rounded-lg bg-white p-1.5 transition-colors hover:bg-[var(--primary)] hover:text-white"
          title="Vacunas"
          onClick={(e) => e.stopPropagation()}
        >
          <Syringe className="h-4 w-4" />
        </Link>
      </div>
    </Link>
  )
}
