'use client'

/**
 * Offer Slot Modal Component
 *
 * RES-001: Migrated to React Query for data fetching
 * - Replaced useEffect+fetch with useQuery hook
 * - Replaced manual mutation with useMutation hook
 */

import { useState, useEffect } from 'react'
import { X, Calendar, Clock, Send, Loader2, AlertCircle } from 'lucide-react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { useToast } from '@/components/ui/Toast'
import { staleTimes, gcTimes } from '@/lib/queries/utils'

interface WaitlistEntry {
  id: string
  pet: { id: string; name: string; species: string }
  service: { id: string; name: string; duration_minutes: number }
  preferred_date: string
  preferred_time_start: string | null
  preferred_time_end: string | null
  preferred_vet: { id: string; full_name: string } | null
}

interface AvailableSlot {
  id: string
  start_time: string
  end_time: string
  vet_name: string
}

interface OfferSlotModalProps {
  entry: WaitlistEntry
  onClose: () => void
  onSuccess: () => void
}

export function OfferSlotModal({
  entry,
  onClose,
  onSuccess,
}: OfferSlotModalProps): React.ReactElement {
  const { toast } = useToast()
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null)
  const [expiresInHours, setExpiresInHours] = useState(2)

  // React Query: Fetch available cancelled/rescheduled appointments
  const { data: slotsData, isLoading: loadingSlots } = useQuery({
    queryKey: ['appointments', 'available-slots', entry.preferred_date, entry.service.id],
    queryFn: async (): Promise<{ appointments: Array<{ id: string; start_time: string; end_time: string; vet?: { full_name: string } }> }> => {
      const res = await fetch(
        `/api/appointments?` +
          new URLSearchParams({
            date: entry.preferred_date,
            service_id: entry.service.id,
            status: 'cancelled',
          })
      )
      if (!res.ok) throw new Error('Error loading slots')
      return res.json()
    },
    staleTime: staleTimes.SHORT,
    gcTime: gcTimes.SHORT,
  })

  // Transform appointments to slots
  const availableSlots: AvailableSlot[] = (slotsData?.appointments || []).map((apt) => ({
    id: apt.id,
    start_time: apt.start_time,
    end_time: apt.end_time,
    vet_name: apt.vet?.full_name || 'Sin asignar',
  }))

  // Auto-select first slot when data loads
  useEffect(() => {
    if (availableSlots.length > 0 && !selectedSlot) {
      setSelectedSlot(availableSlots[0].id)
    }
  }, [availableSlots, selectedSlot])

  // Mutation: Offer slot to waitlist entry
  const offerMutation = useMutation({
    mutationFn: async (params: { appointmentId: string; expiresInHours: number }) => {
      const res = await fetch(`/api/appointments/waitlist/${entry.id}/offer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appointment_id: params.appointmentId,
          expires_in_hours: params.expiresInHours,
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Error al ofrecer')
      }
      return res.json()
    },
    onSuccess: () => {
      toast({
        title: 'Oferta enviada',
        description: `Se notificó al cliente. Tiene ${expiresInHours} horas para responder.`,
      })
      onSuccess()
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'No se pudo enviar la oferta',
        variant: 'destructive',
      })
    },
  })

  const handleOffer = () => {
    if (!selectedSlot) {
      toast({
        title: 'Selecciona una cita',
        description: 'Debes seleccionar un horario para ofrecer.',
        variant: 'destructive',
      })
      return
    }
    offerMutation.mutate({ appointmentId: selectedSlot, expiresInHours })
  }

  const formatTime = (dateStr: string): string => {
    return new Date(dateStr).toLocaleTimeString('es-PY', {
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const formatDate = (dateStr: string): string => {
    return new Date(dateStr).toLocaleDateString('es-PY', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b p-4">
          <div>
            <h3 className="text-lg font-bold text-[var(--text-primary)]">
              Ofrecer Cita
            </h3>
            <p className="text-sm text-gray-500">
              {entry.pet.name} - {entry.service.name}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 hover:bg-gray-100"
          >
            <X className="h-5 w-5 text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          {/* Requested Info */}
          <div className="mb-4 rounded-lg bg-[var(--status-warning-bg)] p-3">
            <p className="text-sm font-medium text-[var(--status-warning-text)]">Preferencias del cliente:</p>
            <div className="mt-1 flex flex-wrap gap-3 text-sm text-[var(--status-warning)]">
              <span className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                {formatDate(entry.preferred_date)}
              </span>
              {entry.preferred_time_start && (
                <span className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  {entry.preferred_time_start} - {entry.preferred_time_end}
                </span>
              )}
              {entry.preferred_vet && (
                <span>Vet: {entry.preferred_vet.full_name}</span>
              )}
            </div>
          </div>

          {/* Available Slots */}
          <div>
            <p className="mb-2 text-sm font-medium text-[var(--text-primary)]">
              Citas canceladas disponibles:
            </p>

            {loadingSlots ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-[var(--primary)]" />
              </div>
            ) : availableSlots.length === 0 ? (
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-center">
                <AlertCircle className="mx-auto h-8 w-8 text-gray-400" />
                <p className="mt-2 text-sm text-gray-600">
                  No hay citas canceladas disponibles para esta fecha
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  Puedes crear una nueva cita manualmente desde el calendario
                </p>
              </div>
            ) : (
              <div className="max-h-48 space-y-2 overflow-y-auto">
                {availableSlots.map((slot) => (
                  <label
                    key={slot.id}
                    className={`flex cursor-pointer items-center gap-3 rounded-lg border-2 p-3 transition ${
                      selectedSlot === slot.id
                        ? 'border-[var(--primary)] bg-[var(--primary)]/10'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="slot"
                      value={slot.id}
                      checked={selectedSlot === slot.id}
                      onChange={() => setSelectedSlot(slot.id)}
                      className="text-[var(--primary)] focus:ring-[var(--primary)]"
                    />
                    <div className="flex-1">
                      <p className="font-medium text-[var(--text-primary)]">
                        {formatTime(slot.start_time)} - {formatTime(slot.end_time)}
                      </p>
                      <p className="text-sm text-gray-500">Con: {slot.vet_name}</p>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Expiration */}
          <div className="mt-4">
            <label className="mb-2 block text-sm font-medium text-[var(--text-primary)]">
              Tiempo para responder:
            </label>
            <select
              value={expiresInHours}
              onChange={(e) => setExpiresInHours(Number(e.target.value))}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[var(--primary)] focus:outline-none"
            >
              <option value={1}>1 hora</option>
              <option value={2}>2 horas</option>
              <option value={4}>4 horas</option>
              <option value={8}>8 horas</option>
              <option value={24}>24 horas</option>
              <option value={48}>48 horas</option>
            </select>
            <p className="mt-1 text-xs text-gray-500">
              Si no responde a tiempo, se ofrecerá al siguiente en la lista
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 border-t p-4">
          <button
            onClick={onClose}
            className="flex-1 rounded-lg border border-gray-200 px-4 py-2.5 font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleOffer}
            disabled={offerMutation.isPending || !selectedSlot}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-[var(--primary)] px-4 py-2.5 font-medium text-white hover:opacity-90 disabled:opacity-50"
          >
            {offerMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            Enviar Oferta
          </button>
        </div>
      </div>
    </div>
  )
}
