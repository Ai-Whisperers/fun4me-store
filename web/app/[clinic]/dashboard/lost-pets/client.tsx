'use client'

/**
 * Lost Pets Client Component
 *
 * RES-001: Migrated to React Query for data fetching
 */

import React, { useState } from 'react'
import Link from 'next/link'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Search,
  AlertTriangle,
  Heart,
  CheckCircle,
  Eye,
  Phone,
  MapPin,
  Clock,
  ChevronLeft,
  ChevronRight,
  Filter,
  RefreshCw,
  MessageCircle,
} from 'lucide-react'
import { staleTimes, gcTimes } from '@/lib/queries/utils'

interface LostPetReport {
  id: string
  pet_id: string
  tenant_id: string
  status: 'lost' | 'found' | 'reunited'
  last_seen_location: string | null
  last_seen_lat: number | null
  last_seen_lng: number | null
  last_seen_at: string | null
  reported_by: string | null
  contact_phone: string | null
  contact_email: string | null
  found_at: string | null
  found_location: string | null
  found_by: string | null
  finder_contact: string | null
  notes: string | null
  created_at: string
  updated_at: string
  pet: {
    id: string
    name: string
    species: string
    breed: string | null
    photo_url: string | null
    owner: {
      id: string
      full_name: string
      phone: string | null
      email: string
    } | null
  } | null
  sightings_count?: number
}

interface Summary {
  lost: number
  found: number
  reunited: number
  total: number
}

interface Pagination {
  page: number
  limit: number
  total: number
  pages: number
  hasNext: boolean
  hasPrev: boolean
}

interface LostPetsClientProps {
  clinic: string
}

type StatusTab = 'all' | 'lost' | 'found' | 'reunited'

const statusConfig = {
  lost: {
    label: 'Perdido',
    bg: 'bg-red-100',
    text: 'text-red-700',
    icon: AlertTriangle,
    color: 'red',
  },
  found: {
    label: 'Encontrado',
    bg: 'bg-amber-100',
    text: 'text-amber-700',
    icon: Heart,
    color: 'amber',
  },
  reunited: {
    label: 'Reunido',
    bg: 'bg-green-100',
    text: 'text-green-700',
    icon: CheckCircle,
    color: 'green',
  },
}

function getStatusBadge(status: string): React.ReactElement {
  const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.lost
  const Icon = config.icon

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${config.bg} ${config.text}`}
    >
      <Icon className="h-3 w-3" />
      {config.label}
    </span>
  )
}

function getSpeciesEmoji(species: string): string {
  const emojis: Record<string, string> = {
    dog: '🐕',
    cat: '🐈',
    bird: '🐦',
    rabbit: '🐰',
    hamster: '🐹',
    fish: '🐟',
  }
  return emojis[species] || '🐾'
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString('es-PY', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 60) return `hace ${diffMins} min`
  if (diffHours < 24) return `hace ${diffHours}h`
  if (diffDays < 7) return `hace ${diffDays} días`
  return formatDate(dateStr)
}

export default function LostPetsClient({ clinic }: LostPetsClientProps): React.ReactElement {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusTab>('all')
  const [page, setPage] = useState(1)
  const [limit] = useState(20)

  // React Query: Fetch reports
  const {
    data: reportsData,
    isLoading: loading,
    error: queryError,
    refetch,
  } = useQuery({
    queryKey: ['lost-pets', clinic, page, limit, statusFilter, search],
    queryFn: async (): Promise<{ reports: LostPetReport[]; summary: Summary; pagination: Pagination }> => {
      const params = new URLSearchParams({
        clinic,
        page: String(page),
        limit: String(limit),
      })

      if (statusFilter !== 'all') {
        params.append('status', statusFilter)
      }

      if (search) {
        params.append('search', search)
      }

      const response = await fetch(`/api/dashboard/lost-pets?${params}`)

      if (!response.ok) {
        throw new Error('Error al cargar reportes')
      }

      const data = await response.json()
      return {
        reports: data.reports || [],
        summary: data.summary || { lost: 0, found: 0, reunited: 0, total: 0 },
        pagination: data.pagination || { page: 1, limit: 20, total: 0, pages: 0, hasNext: false, hasPrev: false },
      }
    },
    staleTime: staleTimes.SHORT,
    gcTime: gcTimes.SHORT,
  })

  const reports = reportsData?.reports || []
  const summary = reportsData?.summary || { lost: 0, found: 0, reunited: 0, total: 0 }
  const pagination = reportsData?.pagination || { page: 1, limit: 20, total: 0, pages: 0, hasNext: false, hasPrev: false }
  const error = queryError?.message || null

  // Mutation: Update status
  const statusMutation = useMutation({
    mutationFn: async (params: { reportId: string; newStatus: 'lost' | 'found' | 'reunited'; notes?: string }) => {
      const response = await fetch(`/api/dashboard/lost-pets/${params.reportId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: params.newStatus, notes: params.notes }),
      })

      if (!response.ok) {
        throw new Error('Error al actualizar estado')
      }

      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lost-pets', clinic] })
    },
  })

  const updating = statusMutation.isPending

  const updateStatus = async (reportId: string, newStatus: 'lost' | 'found' | 'reunited', notes?: string): Promise<void> => {
    await statusMutation.mutateAsync({ reportId, newStatus, notes })
  }

  const fetchReports = async (): Promise<void> => {
    await refetch()
  }

  const handleMarkReunited = async (report: LostPetReport): Promise<void> => {
    const notes = prompt('Notas sobre la reunión (opcional):')
    await updateStatus(report.id, 'reunited', notes || undefined)
  }

  const handleSearch = (e: React.FormEvent): void => {
    e.preventDefault()
    setPage(1)
  }

  const openWhatsApp = (phone: string | null): void => {
    if (!phone) return
    // Clean phone number and add Paraguay country code if needed
    const cleanPhone = phone.replace(/\D/g, '')
    const fullPhone = cleanPhone.startsWith('595') ? cleanPhone : `595${cleanPhone}`
    window.open(`https://wa.me/${fullPhone}`, '_blank')
  }

  const openPhoneCall = (phone: string | null): void => {
    if (!phone) return
    window.open(`tel:${phone}`, '_self')
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-[var(--text-primary)]">
          <AlertTriangle className="h-7 w-7 text-red-500" />
          Mascotas Perdidas
        </h1>
        <p className="mt-1 text-[var(--text-secondary)]">
          Gestiona reportes de mascotas perdidas y encontradas
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { key: 'all', label: 'Total', color: 'gray', count: summary.total },
          { key: 'lost', label: 'Perdidas', color: 'red', count: summary.lost },
          { key: 'found', label: 'Encontradas', color: 'amber', count: summary.found },
          { key: 'reunited', label: 'Reunidas', color: 'green', count: summary.reunited },
        ].map((item) => (
          <button
            key={item.key}
            onClick={() => {
              setStatusFilter(item.key as StatusTab)
              setPage(1)
            }}
            className={`rounded-xl border p-4 text-center transition-all ${
              statusFilter === item.key
                ? `border-${item.color}-400 bg-${item.color}-50`
                : 'border-gray-100 bg-white hover:border-gray-200'
            }`}
          >
            <div
              className={`text-3xl font-bold ${
                item.color === 'gray'
                  ? 'text-gray-600'
                  : item.color === 'red'
                    ? 'text-red-600'
                    : item.color === 'amber'
                      ? 'text-amber-600'
                      : 'text-green-600'
              }`}
            >
              {item.count}
            </div>
            <div className="mt-1 text-sm text-[var(--text-secondary)]">{item.label}</div>
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row">
          {/* Search */}
          <form onSubmit={handleSearch} className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 transform text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por nombre de mascota o dueño..."
                className="focus:ring-[var(--primary)]/20 w-full rounded-xl border border-gray-200 py-2.5 pl-10 pr-4 transition-colors focus:border-[var(--primary)] focus:ring-2"
              />
            </div>
          </form>

          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <Filter className="h-5 w-5 text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as StatusTab)
                setPage(1)
              }}
              className="focus:ring-[var(--primary)]/20 rounded-xl border border-gray-200 bg-white px-4 py-2.5 focus:border-[var(--primary)] focus:ring-2"
            >
              <option value="all">Todos los estados</option>
              <option value="lost">Perdidos</option>
              <option value="found">Encontrados</option>
              <option value="reunited">Reunidos</option>
            </select>
          </div>

          {/* Refresh Button */}
          <button
            onClick={fetchReports}
            disabled={loading}
            className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-[var(--text-primary)] transition-all hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Actualizar
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-700">
          <AlertTriangle className="h-5 w-5" />
          {error}
        </div>
      )}

      {/* Reports List */}
      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
        {loading ? (
          <div className="p-8 text-center">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-b-2 border-[var(--primary)]" />
            <p className="mt-4 text-[var(--text-secondary)]">Cargando reportes...</p>
          </div>
        ) : reports.length === 0 ? (
          <div className="p-12 text-center">
            <AlertTriangle className="mx-auto mb-4 h-12 w-12 text-gray-300" />
            <h3 className="text-lg font-semibold text-[var(--text-primary)]">No hay reportes</h3>
            <p className="mt-1 text-[var(--text-secondary)]">
              {search || statusFilter !== 'all'
                ? 'No se encontraron reportes con los filtros aplicados'
                : 'Los reportes de mascotas perdidas aparecerán aquí'}
            </p>
          </div>
        ) : (
          <>
            {/* Cards Grid */}
            <div className="grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-3">
              {reports.map((report) => (
                <div
                  key={report.id}
                  className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm transition-all hover:shadow-md"
                >
                  {/* Pet Photo */}
                  <div className="relative aspect-[4/3] bg-gray-100">
                    {report.pet?.photo_url ? (
                      <img
                        src={report.pet.photo_url}
                        alt={report.pet?.name || 'Mascota'}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-6xl">
                        {getSpeciesEmoji(report.pet?.species || 'dog')}
                      </div>
                    )}
                    {/* Status Badge */}
                    <div className="absolute left-3 top-3">{getStatusBadge(report.status)}</div>
                    {/* Time Badge */}
                    <div className="absolute bottom-3 right-3 rounded-full bg-black/60 px-2 py-1 text-xs text-white">
                      <Clock className="mr-1 inline h-3 w-3" />
                      {formatRelativeTime(report.created_at)}
                    </div>
                  </div>

                  {/* Pet Info */}
                  <div className="p-4">
                    <div className="mb-2 flex items-start justify-between">
                      <div>
                        <h3 className="font-bold text-[var(--text-primary)]">
                          {getSpeciesEmoji(report.pet?.species || 'dog')} {report.pet?.name || 'Sin nombre'}
                        </h3>
                        <p className="text-sm text-[var(--text-secondary)]">
                          {report.pet?.breed || report.pet?.species || 'Especie desconocida'}
                        </p>
                      </div>
                    </div>

                    {/* Location */}
                    {report.last_seen_location && (
                      <div className="mb-3 flex items-start gap-2 text-sm text-[var(--text-secondary)]">
                        <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
                        <span className="line-clamp-2">{report.last_seen_location}</span>
                      </div>
                    )}

                    {/* Owner Info */}
                    {report.pet?.owner && (
                      <div className="mb-3 rounded-lg bg-gray-50 p-2 text-sm">
                        <p className="font-medium">{report.pet.owner.full_name}</p>
                        <p className="text-[var(--text-secondary)]">{report.pet.owner.email}</p>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex flex-wrap gap-2">
                      <Link
                        href={`/${clinic}/dashboard/lost-pets/${report.id}`}
                        className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium transition-colors hover:bg-gray-50"
                      >
                        <Eye className="h-4 w-4" />
                        Ver
                      </Link>

                      {/* Contact buttons - shown for found pets */}
                      {report.status === 'found' && (
                        <>
                          {(report.finder_contact || report.contact_phone) && (
                            <button
                              onClick={() => openPhoneCall(report.finder_contact || report.contact_phone)}
                              className="rounded-lg bg-blue-100 p-2 text-blue-600 transition-colors hover:bg-blue-200"
                              title="Llamar"
                            >
                              <Phone className="h-4 w-4" />
                            </button>
                          )}
                          {(report.finder_contact || report.contact_phone) && (
                            <button
                              onClick={() => openWhatsApp(report.finder_contact || report.contact_phone)}
                              className="rounded-lg bg-green-100 p-2 text-green-600 transition-colors hover:bg-green-200"
                              title="WhatsApp"
                            >
                              <MessageCircle className="h-4 w-4" />
                            </button>
                          )}
                        </>
                      )}

                      {/* Mark as reunited button */}
                      {report.status !== 'reunited' && (
                        <button
                          onClick={() => handleMarkReunited(report)}
                          disabled={updating}
                          className="flex items-center gap-1 rounded-lg bg-green-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-green-700 disabled:opacity-50"
                        >
                          <CheckCircle className="h-4 w-4" />
                          Reunir
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {pagination.pages > 1 && (
              <div className="flex items-center justify-between border-t border-gray-100 px-6 py-4">
                <p className="text-sm text-[var(--text-secondary)]">
                  Mostrando {(pagination.page - 1) * pagination.limit + 1} a{' '}
                  {Math.min(pagination.page * pagination.limit, pagination.total)} de{' '}
                  {pagination.total} reportes
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage((prev) => prev - 1)}
                    disabled={!pagination.hasPrev}
                    className="rounded-lg border border-gray-200 p-2 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <span className="text-sm text-[var(--text-primary)]">
                    {pagination.page} / {pagination.pages}
                  </span>
                  <button
                    onClick={() => setPage((prev) => prev + 1)}
                    disabled={!pagination.hasNext}
                    className="rounded-lg border border-gray-200 p-2 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
