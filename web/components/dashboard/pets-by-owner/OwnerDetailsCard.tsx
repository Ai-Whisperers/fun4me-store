import Link from 'next/link'
import { Mail, Phone, MapPin, Clock, CheckCircle, AlertCircle, Plus, FileText } from 'lucide-react'
import type { Owner } from './types'
import { formatDate, isClientActive } from './utils'

interface OwnerDetailsCardProps {
  owner: Owner
  clinic: string
}

export function OwnerDetailsCard({ owner, clinic }: OwnerDetailsCardProps): React.ReactElement {
  const isActive = isClientActive(owner.last_visit)

  return (
    <div className="rounded-xl border border-[var(--border-color)] bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="flex items-start gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--primary)] bg-opacity-10">
            <span className="text-2xl font-bold text-[var(--primary)]">
              {owner.full_name.charAt(0).toUpperCase()}
            </span>
          </div>
          <div>
            <div className="mb-1 flex items-center gap-2">
              <h2 className="text-xl font-bold text-[var(--text-primary)]">{owner.full_name}</h2>
              {isActive ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-[var(--status-success-bg)] px-2 py-0.5 text-xs font-medium text-[var(--status-success)]">
                  <CheckCircle className="h-3 w-3" />
                  Activo
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-[var(--status-warning-bg)] px-2 py-0.5 text-xs font-medium text-[var(--status-warning)]">
                  <AlertCircle className="h-3 w-3" />
                  Inactivo
                </span>
              )}
            </div>
            <p className="text-sm text-[var(--text-secondary)]">
              Cliente desde {formatDate(owner.created_at)}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            href={`/${clinic}/dashboard/appointments/new?client=${owner.id}`}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--primary)] px-3 py-1.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
          >
            <Plus className="h-4 w-4" />
            Nueva Cita
          </Link>
          <Link
            href={`/${clinic}/dashboard/clients/${owner.id}`}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border-color)] bg-[var(--bg-subtle)] px-3 py-1.5 text-sm font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--border-color)]"
          >
            <FileText className="h-4 w-4" />
            Ver Ficha
          </Link>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 border-t border-[var(--border-color)] pt-6 sm:grid-cols-2 lg:grid-cols-4">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-blue-50 p-2">
            <Mail className="h-4 w-4 text-blue-600" />
          </div>
          <div>
            <p className="text-xs text-[var(--text-secondary)]">Email</p>
            <p className="truncate text-sm font-medium text-[var(--text-primary)]">{owner.email}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-green-50 p-2">
            <Phone className="h-4 w-4 text-green-600" />
          </div>
          <div>
            <p className="text-xs text-[var(--text-secondary)]">Teléfono</p>
            <p className="text-sm font-medium text-[var(--text-primary)]">
              {owner.phone || 'No registrado'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-purple-50 p-2">
            <MapPin className="h-4 w-4 text-purple-600" />
          </div>
          <div>
            <p className="text-xs text-[var(--text-secondary)]">Dirección</p>
            <p className="truncate text-sm font-medium text-[var(--text-primary)]">
              {owner.address || 'No registrada'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-orange-50 p-2">
            <Clock className="h-4 w-4 text-orange-600" />
          </div>
          <div>
            <p className="text-xs text-[var(--text-secondary)]">Última Visita</p>
            <p className="text-sm font-medium text-[var(--text-primary)]">
              {formatDate(owner.last_visit)}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
