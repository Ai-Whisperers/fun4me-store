'use client'

import type { JSX } from 'react'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { MapPin, Filter, Package, AlertCircle } from 'lucide-react'

interface Kennel {
  id: string
  kennel_number: string
  kennel_type: string
  size: string
  location: string
  kennel_status: string
  features: string[] | null
  current_occupant?: {
    id: string
    hospitalization_number: string
    pet: {
      id: string
      name: string
      species: string
      breed: string
    }
  }[]
}

interface KennelGridProps {
  onKennelClick?: (kennel: Kennel) => void
}

export default function KennelGrid({ onKennelClick }: KennelGridProps): JSX.Element {
  const [kennels, setKennels] = useState<Kennel[]>([])
  const [loading, setLoading] = useState(true)
  const [filterType, setFilterType] = useState<string>('all')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [filterLocation, setFilterLocation] = useState<string>('all')
  const supabase = createClient()

  useEffect(() => {
    fetchKennels()
  }, [filterType, filterStatus, filterLocation])

  const fetchKennels = async (): Promise<void> => {
    try {
      const params = new URLSearchParams()
      if (filterType !== 'all') params.append('kennel_type', filterType)
      if (filterStatus !== 'all') params.append('status', filterStatus)
      if (filterLocation !== 'all') params.append('location', filterLocation)

      const response = await fetch(`/api/kennels?${params.toString()}`)
      if (!response.ok) throw new Error('Error al cargar jaulas')

      const data = await response.json()
      setKennels(data)
    } catch (_error: unknown) {
      // Error fetching kennels - silently fail
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'available':
        return 'bg-[var(--status-success-bg,#dcfce7)] border-[var(--status-success,#22c55e)] text-[var(--status-success,#16a34a)]'
      case 'occupied':
        return 'bg-[var(--status-info-bg,#dbeafe)] border-[var(--status-info,#3b82f6)] text-[var(--status-info,#1d4ed8)]'
      case 'cleaning':
        return 'bg-[var(--status-warning-bg,#fef3c7)] border-[var(--status-warning,#eab308)] text-[var(--status-warning-dark,#a16207)]'
      case 'maintenance':
        return 'bg-[var(--status-error-bg,#fee2e2)] border-[var(--status-error,#ef4444)] text-[var(--status-error,#dc2626)]'
      default:
        return 'bg-[var(--bg-subtle)] border-[var(--border,#e5e7eb)] text-[var(--text-secondary)]'
    }
  }

  const getStatusLabel = (status: string): string => {
    switch (status) {
      case 'available':
        return 'Disponible'
      case 'occupied':
        return 'Ocupado'
      case 'cleaning':
        return 'Limpieza'
      case 'maintenance':
        return 'Mantenimiento'
      default:
        return status
    }
  }

  const groupedKennels = kennels.reduce(
    (acc, kennel) => {
      if (!acc[kennel.location]) {
        acc[kennel.location] = []
      }
      acc[kennel.location].push(kennel)
      return acc
    },
    {} as Record<string, Kennel[]>
  )

  const locations = [...new Set(kennels.map((k) => k.location))].filter(Boolean)

  const types = [...new Set(kennels.map((k) => k.kennel_type))].filter(Boolean)

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="text-[var(--text-secondary)]">Cargando jaulas...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] p-4">
        <div className="mb-4 flex items-center gap-2">
          <Filter className="h-5 w-5 text-[var(--text-secondary)]" />
          <h3 className="font-medium text-[var(--text-primary)]">Filtros</h3>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <label className="mb-2 block text-sm font-medium text-[var(--text-secondary)]">
              Estado
            </label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full rounded-md border border-[var(--border)] bg-[var(--bg-default)] px-3 py-2 text-[var(--text-primary)]"
            >
              <option value="all">Todos</option>
              <option value="available">Disponible</option>
              <option value="occupied">Ocupado</option>
              <option value="cleaning">Limpieza</option>
              <option value="maintenance">Mantenimiento</option>
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-[var(--text-secondary)]">
              Tipo
            </label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="w-full rounded-md border border-[var(--border)] bg-[var(--bg-default)] px-3 py-2 text-[var(--text-primary)]"
            >
              <option value="all">Todos</option>
              {types.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-[var(--text-secondary)]">
              Ubicación
            </label>
            <select
              value={filterLocation}
              onChange={(e) => setFilterLocation(e.target.value)}
              className="w-full rounded-md border border-[var(--border)] bg-[var(--bg-default)] px-3 py-2 text-[var(--text-primary)]"
            >
              <option value="all">Todas</option>
              {locations.map((location) => (
                <option key={location} value={location}>
                  {location}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Kennel Grid by Location */}
      {Object.entries(groupedKennels).map(([location, locationKennels]) => (
        <div key={location} className="space-y-4">
          <div className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-[var(--primary)]" />
            <h3 className="text-lg font-semibold text-[var(--text-primary)]">{location}</h3>
            <span className="text-sm text-[var(--text-secondary)]">
              ({locationKennels.length} jaulas)
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {locationKennels.map((kennel) => {
              const occupant = kennel.current_occupant?.[0]
              return (
                <button
                  key={kennel.id}
                  onClick={() => onKennelClick?.(kennel)}
                  className={`rounded-lg border-2 p-4 transition-all hover:shadow-md ${getStatusColor(kennel.kennel_status)} `}
                >
                  <div className="text-center">
                    <div className="mb-1 text-lg font-bold">{kennel.kennel_number}</div>
                    <div className="mb-2 text-xs">{kennel.kennel_type}</div>
                    <div className="mb-1 text-xs">{kennel.size}</div>
                    <div className="text-xs font-medium">
                      {getStatusLabel(kennel.kennel_status)}
                    </div>

                    {occupant && (
                      <div className="border-current/20 mt-2 border-t pt-2">
                        <div className="truncate text-xs font-medium">{occupant.pet.name}</div>
                        <div className="text-xs opacity-75">{occupant.pet.species}</div>
                      </div>
                    )}

                    {kennel.features && kennel.features.length > 0 && (
                      <div className="mt-2 flex justify-center">
                        <Package className="h-3 w-3" />
                      </div>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      ))}

      {kennels.length === 0 && (
        <div className="py-12 text-center">
          <AlertCircle className="mx-auto mb-4 h-12 w-12 text-[var(--text-secondary)]" />
          <p className="text-[var(--text-secondary)]">
            No se encontraron jaulas con los filtros seleccionados
          </p>
        </div>
      )}
    </div>
  )
}
