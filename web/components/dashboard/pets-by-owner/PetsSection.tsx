import Link from 'next/link'
import { PawPrint, Plus } from 'lucide-react'
import type { Owner } from './types'
import { PetCard } from './PetCard'

interface PetsSectionProps {
  owner: Owner
  clinic: string
}

export function PetsSection({ owner, clinic }: PetsSectionProps): React.ReactElement {
  return (
    <div className="rounded-xl border border-[var(--border-color)] bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-lg font-semibold text-[var(--text-primary)]">
          <PawPrint className="h-5 w-5 text-[var(--primary)]" />
          Mascotas ({owner.pets.length})
        </h3>
        <Link
          href={`/${clinic}/dashboard/pets/new?owner=${owner.id}`}
          className="text-sm font-medium text-[var(--primary)] hover:underline"
        >
          + Agregar Mascota
        </Link>
      </div>

      {owner.pets.length === 0 ? (
        <div className="py-8 text-center">
          <PawPrint className="mx-auto mb-3 h-12 w-12 text-[var(--text-secondary)] opacity-50" />
          <p className="text-sm text-[var(--text-secondary)]">
            Este propietario no tiene mascotas registradas
          </p>
          <Link
            href={`/${clinic}/dashboard/pets/new?owner=${owner.id}`}
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
          >
            <Plus className="h-4 w-4" />
            Registrar Primera Mascota
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {owner.pets.map((pet) => (
            <PetCard key={pet.id} pet={pet} clinic={clinic} />
          ))}
        </div>
      )}
    </div>
  )
}
