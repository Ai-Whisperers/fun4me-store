'use client'

import React, { useState, useEffect } from 'react'
import {
  X,
  Calendar,
  Clock,
  User,
  PawPrint,
  Phone,
  Loader2,
  AlertCircle,
  CheckCircle,
  Sun,
  Moon,
} from 'lucide-react'
import { scheduleAppointment } from '@/app/actions/schedule-appointment'
import { createClient } from '@/lib/supabase/client'

interface PendingRequest {
  id: string
  pet_name: string
  pet_id: string
  owner_name: string
  owner_phone: string | null
  services: string
  preferred_date_start: string | null
  preferred_date_end: string | null
  preferred_time_of_day: string | null
  notes: string | null
  requested_at: string
}

interface ScheduleAppointmentModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  request: PendingRequest
  clinic: string
}

interface Vet {
  id: string
  full_name: string
}

/**
 * Modal for staff to schedule a pending booking request
 */
export function ScheduleAppointmentModal({
  isOpen,
  onClose,
  onSuccess,
  request,
  clinic,
}: ScheduleAppointmentModalProps) {
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [duration, setDuration] = useState(30)
  const [vetId, setVetId] = useState<string | null>(null)
  const [vets, setVets] = useState<Vet[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // Fetch available vets
  useEffect(() => {
    const fetchVets = async () => {
      const supabase = createClient()
      const { data } = await supabase
        .from('profiles')
        .select('id, full_name')
        .eq('tenant_id', clinic)
        .in('role', ['vet', 'admin'])
        .order('full_name')

      if (data) {
        setVets(data)
      }
    }

    if (isOpen) {
      fetchVets()
      // Set default date based on preference
      if (request.preferred_date_start) {
        setDate(request.preferred_date_start)
      } else {
        const tomorrow = new Date()
        tomorrow.setDate(tomorrow.getDate() + 1)
        setDate(tomorrow.toISOString().split('T')[0])
      }

      // Set default time based on preference
      if (request.preferred_time_of_day === 'morning') {
        setTime('09:00')
      } else if (request.preferred_time_of_day === 'afternoon') {
        setTime('14:00')
      } else {
        setTime('10:00')
      }
    }
  }, [isOpen, clinic, request])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    // Calculate end time
    const startDateTime = new Date(`${date}T${time}:00`)
    const endDateTime = new Date(startDateTime.getTime() + duration * 60000)

    const result = await scheduleAppointment({
      appointment_id: request.id,
      start_time: startDateTime.toISOString(),
      end_time: endDateTime.toISOString(),
      vet_id: vetId,
    })

    setIsSubmitting(false)

    if (result.success) {
      setSuccess(true)
      setTimeout(() => {
        onSuccess()
      }, 1500)
    } else {
      setError(result.error || 'Error al programar la cita')
    }
  }

  if (!isOpen) return null

  // Generate time slots
  const timeSlots = []
  for (let hour = 8; hour <= 18; hour++) {
    for (let min = 0; min < 60; min += 30) {
      const h = hour.toString().padStart(2, '0')
      const m = min.toString().padStart(2, '0')
      timeSlots.push(`${h}:${m}`)
    }
  }

  // Calculate min date (today)
  const minDate = new Date().toISOString().split('T')[0]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 p-6">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Programar Cita</h2>
            <p className="text-sm text-gray-500">
              {request.pet_name} • {request.services}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl p-2 text-gray-400 hover:bg-gray-100"
            disabled={isSubmitting}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Success State */}
        {success ? (
          <div className="p-8 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--status-success-bg)]">
              <CheckCircle className="h-8 w-8 text-[var(--status-success)]" />
            </div>
            <h3 className="text-lg font-bold text-gray-900">¡Cita Programada!</h3>
            <p className="text-gray-500">Se enviará una confirmación al cliente.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            {/* Request Info */}
            <div className="border-b border-gray-100 bg-gray-50 p-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-center gap-2 text-gray-600">
                  <PawPrint className="h-4 w-4 text-gray-400" />
                  <span>{request.pet_name}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                  <User className="h-4 w-4 text-gray-400" />
                  <span>{request.owner_name}</span>
                </div>
                {request.owner_phone && (
                  <div className="flex items-center gap-2 text-gray-600">
                    <Phone className="h-4 w-4 text-gray-400" />
                    <span>{request.owner_phone}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-gray-600">
                  {request.preferred_time_of_day === 'morning' ? (
                    <Sun className="h-4 w-4 text-amber-500" />
                  ) : request.preferred_time_of_day === 'afternoon' ? (
                    <Moon className="h-4 w-4 text-indigo-500" />
                  ) : (
                    <Clock className="h-4 w-4 text-gray-400" />
                  )}
                  <span>
                    {request.preferred_time_of_day === 'morning'
                      ? 'Prefiere mañana'
                      : request.preferred_time_of_day === 'afternoon'
                        ? 'Prefiere tarde'
                        : 'Sin preferencia'}
                  </span>
                </div>
              </div>
              {request.notes && (
                <p className="mt-2 rounded-lg bg-white p-2 text-sm italic text-gray-600">
                  "{request.notes}"
                </p>
              )}
            </div>

            {/* Form */}
            <div className="space-y-4 p-6">
              {/* Date */}
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  <Calendar className="mr-1 inline h-4 w-4" />
                  Fecha
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  min={minDate}
                  required
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
                />
                {request.preferred_date_start && (
                  <p className="mt-1 text-xs text-gray-500">
                    Preferencia: {request.preferred_date_start}
                    {request.preferred_date_end && ` - ${request.preferred_date_end}`}
                  </p>
                )}
              </div>

              {/* Time */}
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  <Clock className="mr-1 inline h-4 w-4" />
                  Hora de Inicio
                </label>
                <select
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  required
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
                >
                  {timeSlots.map((slot) => (
                    <option key={slot} value={slot}>
                      {slot}
                    </option>
                  ))}
                </select>
              </div>

              {/* Duration */}
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Duración</label>
                <div className="flex gap-2">
                  {[15, 30, 45, 60, 90].map((mins) => (
                    <button
                      key={mins}
                      type="button"
                      onClick={() => setDuration(mins)}
                      className={`flex-1 rounded-xl border-2 px-3 py-2 text-sm font-medium transition-all ${
                        duration === mins
                          ? 'border-[var(--primary)] bg-[var(--primary)]/5 text-[var(--primary)]'
                          : 'border-gray-200 text-gray-600 hover:border-gray-300'
                      }`}
                    >
                      {mins} min
                    </button>
                  ))}
                </div>
              </div>

              {/* Vet Selection */}
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  <User className="mr-1 inline h-4 w-4" />
                  Veterinario (opcional)
                </label>
                <select
                  value={vetId || ''}
                  onChange={(e) => setVetId(e.target.value || null)}
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
                >
                  <option value="">Sin asignar</option>
                  {vets.map((vet) => (
                    <option key={vet.id} value={vet.id}>
                      {vet.full_name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Error */}
              {error && (
                <div className="flex items-center gap-2 rounded-xl bg-[var(--status-error-bg)] p-3 text-[var(--status-error)]">
                  <AlertCircle className="h-5 w-5" />
                  <span className="text-sm">{error}</span>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-3 border-t border-gray-100 p-6">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="rounded-xl px-6 py-3 font-medium text-gray-600 hover:bg-gray-100"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !date || !time}
                className="flex items-center gap-2 rounded-xl bg-[var(--primary)] px-6 py-3 font-medium text-white hover:opacity-90 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Calendar className="h-5 w-5" />
                )}
                Confirmar Cita
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
