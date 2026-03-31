'use client'

/**
 * Lost Pet Detail Client
 *
 * RES-001: Migrated to React Query for data fetching
 */

import React, { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { staleTimes, gcTimes } from '@/lib/queries/utils'
import {
  ArrowLeft,
  AlertTriangle,
  Heart,
  CheckCircle,
  Phone,
  Mail,
  MapPin,
  Clock,
  Calendar,
  User,
  MessageCircle,
  Eye,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Camera,
} from 'lucide-react'

interface Pet {
  id: string
  name: string
  species: string
  breed: string | null
  color: string | null
  weight_kg: number | null
  photo_url: string | null
  microchip_id: string | null
  owner: {
    id: string
    full_name: string
    phone: string | null
    email: string
  } | null
}

interface Sighting {
  id: string
  lost_pet_id: string
  reporter_name: string | null
  reporter_email: string | null
  reporter_phone: string | null
  sighting_date: string
  sighting_location: string
  sighting_lat: number | null
  sighting_lng: number | null
  description: string | null
  photo_url: string | null
  is_verified: boolean
  verified_by: string | null
  verified_at: string | null
  created_at: string
}

interface Match {
  id: string
  lost_report_id: string
  found_report_id: string | null
  confidence_score: number
  match_reasons: string[]
  status: 'pending' | 'reviewing' | 'confirmed' | 'rejected'
  found_report?: {
    id: string
    status: string
    pet: {
      id: string
      name: string
      species: string
      breed: string | null
      photo_url: string | null
    } | null
  } | null
}

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
  pet: Pet | null
  reported_by_profile?: {
    id: string
    full_name: string
    email: string
  } | null
  found_by_profile?: {
    id: string
    full_name: string
    email: string
  } | null
}

interface LostPetDetailClientProps {
  clinic: string
  reportId: string
}

const statusConfig = {
  lost: {
    label: 'Perdido',
    bg: 'bg-red-100',
    text: 'text-red-700',
    border: 'border-red-200',
    icon: AlertTriangle,
  },
  found: {
    label: 'Encontrado',
    bg: 'bg-amber-100',
    text: 'text-amber-700',
    border: 'border-amber-200',
    icon: Heart,
  },
  reunited: {
    label: 'Reunido',
    bg: 'bg-green-100',
    text: 'text-green-700',
    border: 'border-green-200',
    icon: CheckCircle,
  },
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
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function LostPetDetailClient({
  clinic,
  reportId,
}: LostPetDetailClientProps): React.ReactElement {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [showSightings, setShowSightings] = useState(true)
  const [showMatches, setShowMatches] = useState(true)

  // React Query: Fetch report
  const {
    data: reportData,
    isLoading: loading,
    error: queryError,
    refetch,
  } = useQuery({
    queryKey: ['lost-pet-report', reportId],
    queryFn: async (): Promise<{ report: LostPetReport; sightings: Sighting[]; matches: Match[] }> => {
      const response = await fetch(`/api/dashboard/lost-pets/${reportId}`)

      if (!response.ok) {
        if (response.status === 404) {
          router.push(`/${clinic}/dashboard/lost-pets`)
          throw new Error('Reporte no encontrado')
        }
        throw new Error('Error al cargar reporte')
      }

      const data = await response.json()
      return {
        report: data.report,
        sightings: data.sightings || [],
        matches: data.matches || [],
      }
    },
    staleTime: staleTimes.SHORT,
    gcTime: gcTimes.SHORT,
  })

  // Mutation: Update status
  const statusMutation = useMutation({
    mutationFn: async (params: { newStatus: 'lost' | 'found' | 'reunited'; notes?: string; oldStatus: string }) => {
      const response = await fetch(`/api/dashboard/lost-pets/${reportId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: params.newStatus,
          notes: params.notes,
          old_status: params.oldStatus,
        }),
      })

      if (!response.ok) {
        throw new Error('Error al actualizar estado')
      }

      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lost-pet-report', reportId] })
    },
  })

  const report = reportData?.report || null
  const sightings = reportData?.sightings || []
  const matches = reportData?.matches || []
  const error = queryError?.message || statusMutation.error?.message || null
  const updating = statusMutation.isPending

  const updateStatus = async (
    newStatus: 'lost' | 'found' | 'reunited',
    notes?: string
  ): Promise<void> => {
    if (!report) return
    await statusMutation.mutateAsync({
      newStatus,
      notes,
      oldStatus: report.status,
    })
  }

  const fetchReport = async (): Promise<void> => {
    await refetch()
  }

  const handleMarkReunited = async (): Promise<void> => {
    const notes = prompt('Notas sobre la reunión (opcional):')
    await updateStatus('reunited', notes || undefined)
  }

  const openWhatsApp = (phone: string | null): void => {
    if (!phone) return
    const cleanPhone = phone.replace(/\D/g, '')
    const fullPhone = cleanPhone.startsWith('595') ? cleanPhone : `595${cleanPhone}`
    window.open(`https://wa.me/${fullPhone}`, '_blank')
  }

  const openPhoneCall = (phone: string | null): void => {
    if (!phone) return
    window.open(`tel:${phone}`, '_self')
  }

  const openMaps = (lat: number | null, lng: number | null, location: string | null): void => {
    if (lat && lng) {
      window.open(`https://www.google.com/maps?q=${lat},${lng}`, '_blank')
    } else if (location) {
      window.open(
        `https://www.google.com/maps/search/${encodeURIComponent(location)}`,
        '_blank'
      )
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-b-2 border-[var(--primary)]" />
          <p className="mt-4 text-[var(--text-secondary)]">Cargando reporte...</p>
        </div>
      </div>
    )
  }

  if (error || !report) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="mx-auto mb-4 h-12 w-12 text-red-400" />
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">
            {error || 'Reporte no encontrado'}
          </h2>
          <Link
            href={`/${clinic}/dashboard/lost-pets`}
            className="mt-4 inline-flex items-center gap-2 text-[var(--primary)] hover:underline"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver a la lista
          </Link>
        </div>
      </div>
    )
  }

  const config = statusConfig[report.status]
  const StatusIcon = config.icon

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Link
            href={`/${clinic}/dashboard/lost-pets`}
            className="rounded-lg border border-gray-200 p-2 transition-colors hover:bg-gray-50"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold text-[var(--text-primary)]">
              {getSpeciesEmoji(report.pet?.species || 'dog')} {report.pet?.name || 'Sin nombre'}
            </h1>
            <p className="text-[var(--text-secondary)]">
              Reporte de mascota {config.label.toLowerCase()}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Status Badge */}
          <span
            className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium ${config.bg} ${config.text}`}
          >
            <StatusIcon className="h-4 w-4" />
            {config.label}
          </span>

          {/* Actions */}
          {report.status !== 'reunited' && (
            <button
              onClick={handleMarkReunited}
              disabled={updating}
              className="flex items-center gap-2 rounded-xl bg-green-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-green-700 disabled:opacity-50"
            >
              <CheckCircle className="h-4 w-4" />
              Marcar Reunido
            </button>
          )}

          <button
            onClick={fetchReport}
            disabled={loading}
            className="rounded-lg border border-gray-200 p-2 transition-colors hover:bg-gray-50"
            title="Actualizar"
          >
            <RefreshCw className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="space-y-6 lg:col-span-2">
          {/* Pet Info Card */}
          <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
            <div className="flex flex-col sm:flex-row">
              {/* Pet Photo */}
              <div className="relative aspect-square w-full sm:w-64">
                {report.pet?.photo_url ? (
                  <img
                    src={report.pet.photo_url}
                    alt={report.pet?.name || 'Mascota'}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-gray-100 text-8xl">
                    {getSpeciesEmoji(report.pet?.species || 'dog')}
                  </div>
                )}
              </div>

              {/* Pet Details */}
              <div className="flex-1 p-6">
                <h2 className="mb-4 text-xl font-bold text-[var(--text-primary)]">
                  Información de la Mascota
                </h2>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="text-sm text-[var(--text-secondary)]">Nombre</label>
                    <p className="font-medium">{report.pet?.name || '-'}</p>
                  </div>
                  <div>
                    <label className="text-sm text-[var(--text-secondary)]">Especie</label>
                    <p className="font-medium capitalize">{report.pet?.species || '-'}</p>
                  </div>
                  <div>
                    <label className="text-sm text-[var(--text-secondary)]">Raza</label>
                    <p className="font-medium">{report.pet?.breed || '-'}</p>
                  </div>
                  <div>
                    <label className="text-sm text-[var(--text-secondary)]">Color</label>
                    <p className="font-medium">{report.pet?.color || '-'}</p>
                  </div>
                  {report.pet?.weight_kg && (
                    <div>
                      <label className="text-sm text-[var(--text-secondary)]">Peso</label>
                      <p className="font-medium">{report.pet.weight_kg} kg</p>
                    </div>
                  )}
                  {report.pet?.microchip_id && (
                    <div>
                      <label className="text-sm text-[var(--text-secondary)]">Microchip</label>
                      <p className="font-mono text-sm">{report.pet.microchip_id}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Location Info */}
          <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-[var(--text-primary)]">
              <MapPin className="h-5 w-5 text-red-500" />
              Última Ubicación Conocida
            </h2>

            <div className="space-y-4">
              {report.last_seen_location ? (
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-medium">{report.last_seen_location}</p>
                    {report.last_seen_at && (
                      <p className="mt-1 flex items-center gap-1 text-sm text-[var(--text-secondary)]">
                        <Clock className="h-4 w-4" />
                        Visto por última vez: {formatDate(report.last_seen_at)}
                      </p>
                    )}
                  </div>
                  {(report.last_seen_lat || report.last_seen_location) && (
                    <button
                      onClick={() =>
                        openMaps(
                          report.last_seen_lat,
                          report.last_seen_lng,
                          report.last_seen_location
                        )
                      }
                      className="flex items-center gap-1 rounded-lg bg-blue-100 px-3 py-2 text-sm font-medium text-blue-700 transition-colors hover:bg-blue-200"
                    >
                      <ExternalLink className="h-4 w-4" />
                      Ver en Mapa
                    </button>
                  )}
                </div>
              ) : (
                <p className="text-[var(--text-secondary)]">
                  No se ha registrado la ubicación donde se vio por última vez
                </p>
              )}

              {report.status === 'found' && report.found_location && (
                <div className="mt-4 rounded-lg bg-green-50 p-4">
                  <h3 className="mb-2 font-semibold text-green-700">
                    <Heart className="mr-2 inline h-4 w-4" />
                    Ubicación Encontrada
                  </h3>
                  <p className="text-green-600">{report.found_location}</p>
                  {report.found_at && (
                    <p className="mt-1 text-sm text-green-600">
                      Encontrado: {formatDate(report.found_at)}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Sightings Timeline */}
          <div className="rounded-2xl border border-gray-100 bg-white shadow-sm">
            <button
              onClick={() => setShowSightings(!showSightings)}
              className="flex w-full items-center justify-between p-6"
            >
              <h2 className="flex items-center gap-2 text-lg font-bold text-[var(--text-primary)]">
                <Eye className="h-5 w-5 text-amber-500" />
                Avistamientos ({sightings.length})
              </h2>
              {showSightings ? (
                <ChevronUp className="h-5 w-5 text-gray-400" />
              ) : (
                <ChevronDown className="h-5 w-5 text-gray-400" />
              )}
            </button>

            {showSightings && (
              <div className="border-t border-gray-100 p-6">
                {sightings.length === 0 ? (
                  <p className="text-center text-[var(--text-secondary)]">
                    No hay avistamientos reportados
                  </p>
                ) : (
                  <div className="space-y-4">
                    {sightings.map((sighting, index) => (
                      <div
                        key={sighting.id}
                        className="relative flex gap-4 pb-4"
                      >
                        {/* Timeline line */}
                        {index < sightings.length - 1 && (
                          <div className="absolute bottom-0 left-5 top-10 w-0.5 bg-gray-200" />
                        )}

                        {/* Icon */}
                        <div
                          className={`relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                            sighting.is_verified
                              ? 'bg-green-100 text-green-600'
                              : 'bg-amber-100 text-amber-600'
                          }`}
                        >
                          {sighting.photo_url ? (
                            <Camera className="h-5 w-5" />
                          ) : (
                            <Eye className="h-5 w-5" />
                          )}
                        </div>

                        {/* Content */}
                        <div className="flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="font-medium text-[var(--text-primary)]">
                                {sighting.sighting_location}
                              </p>
                              <p className="text-sm text-[var(--text-secondary)]">
                                {formatDate(sighting.sighting_date)}
                              </p>
                            </div>
                            {sighting.is_verified && (
                              <span className="rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-700">
                                Verificado
                              </span>
                            )}
                          </div>

                          {sighting.description && (
                            <p className="mt-2 text-sm text-[var(--text-secondary)]">
                              {sighting.description}
                            </p>
                          )}

                          {sighting.reporter_name && (
                            <p className="mt-2 text-sm text-[var(--text-secondary)]">
                              Reportado por: {sighting.reporter_name}
                            </p>
                          )}

                          {sighting.reporter_phone && (
                            <div className="mt-2 flex gap-2">
                              <button
                                onClick={() => openPhoneCall(sighting.reporter_phone)}
                                className="rounded bg-blue-100 p-1.5 text-blue-600 hover:bg-blue-200"
                                title="Llamar"
                              >
                                <Phone className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => openWhatsApp(sighting.reporter_phone)}
                                className="rounded bg-green-100 p-1.5 text-green-600 hover:bg-green-200"
                                title="WhatsApp"
                              >
                                <MessageCircle className="h-4 w-4" />
                              </button>
                            </div>
                          )}

                          {sighting.photo_url && (
                            <img
                              src={sighting.photo_url}
                              alt="Avistamiento"
                              className="mt-2 h-32 w-auto rounded-lg object-cover"
                            />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Match Suggestions */}
          {matches.length > 0 && (
            <div className="rounded-2xl border border-gray-100 bg-white shadow-sm">
              <button
                onClick={() => setShowMatches(!showMatches)}
                className="flex w-full items-center justify-between p-6"
              >
                <h2 className="flex items-center gap-2 text-lg font-bold text-[var(--text-primary)]">
                  <Heart className="h-5 w-5 text-pink-500" />
                  Posibles Coincidencias ({matches.length})
                </h2>
                {showMatches ? (
                  <ChevronUp className="h-5 w-5 text-gray-400" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-gray-400" />
                )}
              </button>

              {showMatches && (
                <div className="border-t border-gray-100 p-6">
                  <div className="grid gap-4 sm:grid-cols-2">
                    {matches.map((match) => (
                      <div
                        key={match.id}
                        className="rounded-xl border border-gray-200 p-4"
                      >
                        <div className="mb-2 flex items-center justify-between">
                          <span className="font-medium">
                            {match.found_report?.pet?.name || 'Sin nombre'}
                          </span>
                          <span
                            className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                              match.confidence_score >= 80
                                ? 'bg-green-100 text-green-700'
                                : match.confidence_score >= 50
                                  ? 'bg-amber-100 text-amber-700'
                                  : 'bg-gray-100 text-gray-700'
                            }`}
                          >
                            {match.confidence_score}% confianza
                          </span>
                        </div>
                        {match.found_report?.pet?.photo_url && (
                          <img
                            src={match.found_report.pet.photo_url}
                            alt={match.found_report.pet.name || ''}
                            className="mb-2 h-24 w-full rounded-lg object-cover"
                          />
                        )}
                        <p className="text-sm text-[var(--text-secondary)]">
                          {match.found_report?.pet?.breed || match.found_report?.pet?.species}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Notes */}
          {report.notes && (
            <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
              <h2 className="mb-3 font-bold text-[var(--text-primary)]">Notas</h2>
              <p className="whitespace-pre-wrap text-[var(--text-secondary)]">{report.notes}</p>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Owner Contact Card */}
          {report.pet?.owner && (
            <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
              <h2 className="mb-4 flex items-center gap-2 font-bold text-[var(--text-primary)]">
                <User className="h-5 w-5" />
                Información del Dueño
              </h2>

              <div className="space-y-3">
                <p className="font-medium">{report.pet.owner.full_name}</p>

                <a
                  href={`mailto:${report.pet.owner.email}`}
                  className="flex items-center gap-2 text-sm text-[var(--text-secondary)] hover:text-[var(--primary)]"
                >
                  <Mail className="h-4 w-4" />
                  {report.pet.owner.email}
                </a>

                {report.pet.owner.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-[var(--text-secondary)]" />
                    <span className="text-sm">{report.pet.owner.phone}</span>
                  </div>
                )}

                {report.pet.owner.phone && (
                  <div className="flex gap-2 pt-2">
                    <button
                      onClick={() => openPhoneCall(report.pet?.owner?.phone || null)}
                      className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-blue-100 px-3 py-2 text-sm font-medium text-blue-700 transition-colors hover:bg-blue-200"
                    >
                      <Phone className="h-4 w-4" />
                      Llamar
                    </button>
                    <button
                      onClick={() => openWhatsApp(report.pet?.owner?.phone || null)}
                      className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-green-100 px-3 py-2 text-sm font-medium text-green-700 transition-colors hover:bg-green-200"
                    >
                      <MessageCircle className="h-4 w-4" />
                      WhatsApp
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Finder Contact (for found pets) */}
          {report.status === 'found' && report.finder_contact && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 shadow-sm">
              <h2 className="mb-4 flex items-center gap-2 font-bold text-amber-700">
                <Heart className="h-5 w-5" />
                Contacto del que Encontró
              </h2>

              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-amber-600" />
                  <span className="text-amber-800">{report.finder_contact}</span>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    onClick={() => openPhoneCall(report.finder_contact)}
                    className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-amber-200 px-3 py-2 text-sm font-medium text-amber-800 transition-colors hover:bg-amber-300"
                  >
                    <Phone className="h-4 w-4" />
                    Llamar
                  </button>
                  <button
                    onClick={() => openWhatsApp(report.finder_contact)}
                    className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-green-200 px-3 py-2 text-sm font-medium text-green-800 transition-colors hover:bg-green-300"
                  >
                    <MessageCircle className="h-4 w-4" />
                    WhatsApp
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Report Timeline */}
          <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
            <h2 className="mb-4 flex items-center gap-2 font-bold text-[var(--text-primary)]">
              <Calendar className="h-5 w-5" />
              Historial
            </h2>

            <div className="space-y-3 text-sm">
              <div className="flex items-start gap-3">
                <div className="mt-1 h-2 w-2 rounded-full bg-red-400" />
                <div>
                  <p className="font-medium">Reportado</p>
                  <p className="text-[var(--text-secondary)]">{formatDate(report.created_at)}</p>
                  {report.reported_by_profile && (
                    <p className="text-[var(--text-secondary)]">
                      Por: {report.reported_by_profile.full_name}
                    </p>
                  )}
                </div>
              </div>

              {report.found_at && (
                <div className="flex items-start gap-3">
                  <div className="mt-1 h-2 w-2 rounded-full bg-amber-400" />
                  <div>
                    <p className="font-medium">Encontrado</p>
                    <p className="text-[var(--text-secondary)]">{formatDate(report.found_at)}</p>
                    {report.found_by_profile && (
                      <p className="text-[var(--text-secondary)]">
                        Por: {report.found_by_profile.full_name}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {report.status === 'reunited' && (
                <div className="flex items-start gap-3">
                  <div className="mt-1 h-2 w-2 rounded-full bg-green-400" />
                  <div>
                    <p className="font-medium text-green-600">¡Reunido!</p>
                    <p className="text-[var(--text-secondary)]">{formatDate(report.updated_at)}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Quick Status Update */}
          {report.status !== 'reunited' && (
            <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
              <h2 className="mb-4 font-bold text-[var(--text-primary)]">Cambiar Estado</h2>

              <div className="space-y-2">
                {report.status !== 'lost' && (
                  <button
                    onClick={() => updateStatus('lost')}
                    disabled={updating}
                    className="flex w-full items-center justify-center gap-2 rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-700 transition-colors hover:bg-red-50 disabled:opacity-50"
                  >
                    <AlertTriangle className="h-4 w-4" />
                    Marcar como Perdido
                  </button>
                )}

                {report.status !== 'found' && (
                  <button
                    onClick={() => updateStatus('found')}
                    disabled={updating}
                    className="flex w-full items-center justify-center gap-2 rounded-lg border border-amber-200 px-4 py-2 text-sm font-medium text-amber-700 transition-colors hover:bg-amber-50 disabled:opacity-50"
                  >
                    <Heart className="h-4 w-4" />
                    Marcar como Encontrado
                  </button>
                )}

                <button
                  onClick={handleMarkReunited}
                  disabled={updating}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-green-700 disabled:opacity-50"
                >
                  <CheckCircle className="h-4 w-4" />
                  Marcar como Reunido
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
