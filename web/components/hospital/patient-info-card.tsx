'use client'

import type { JSX } from 'react'
import { User, Phone, MapPin } from 'lucide-react'

interface PatientInfoCardProps {
  hospitalization: {
    pet: {
      species: string
      breed: string
      date_of_birth: string
      weight: number
      owner: {
        full_name: string
        phone: string
      }
    }
    kennel: {
      kennel_number: string
      kennel_type: string
      location: string
    }
  }
}

export function PatientInfoCard({ hospitalization }: PatientInfoCardProps): JSX.Element {
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

  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] p-6">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <div>
          <h3 className="mb-3 font-semibold text-[var(--text-primary)]">
            Información del Paciente
          </h3>
          <div className="space-y-2 text-sm">
            <div>
              <span className="text-[var(--text-secondary)]">Especie:</span>{' '}
              <span className="text-[var(--text-primary)]">{hospitalization.pet.species}</span>
            </div>
            <div>
              <span className="text-[var(--text-secondary)]">Raza:</span>{' '}
              <span className="text-[var(--text-primary)]">{hospitalization.pet.breed}</span>
            </div>
            <div>
              <span className="text-[var(--text-secondary)]">Edad:</span>{' '}
              <span className="text-[var(--text-primary)]">
                {calculateAge(hospitalization.pet.date_of_birth)}
              </span>
            </div>
            <div>
              <span className="text-[var(--text-secondary)]">Peso:</span>{' '}
              <span className="text-[var(--text-primary)]">{hospitalization.pet.weight} kg</span>
            </div>
          </div>
        </div>

        <div>
          <h3 className="mb-3 font-semibold text-[var(--text-primary)]">Propietario</h3>
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-[var(--text-secondary)]" />
              <span className="text-[var(--text-primary)]">
                {hospitalization.pet.owner.full_name}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-[var(--text-secondary)]" />
              <span className="text-[var(--text-primary)]">{hospitalization.pet.owner.phone}</span>
            </div>
          </div>
        </div>

        <div>
          <h3 className="mb-3 font-semibold text-[var(--text-primary)]">Ubicación</h3>
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-[var(--text-secondary)]" />
              <span className="text-[var(--text-primary)]">
                Jaula {hospitalization.kennel.kennel_number}
              </span>
            </div>
            <div>
              <span className="text-[var(--text-secondary)]">Tipo:</span>{' '}
              <span className="text-[var(--text-primary)]">
                {hospitalization.kennel.kennel_type}
              </span>
            </div>
            <div>
              <span className="text-[var(--text-secondary)]">Ubicación:</span>{' '}
              <span className="text-[var(--text-primary)]">{hospitalization.kennel.location}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
