/**
 * Appointment Fields Component
 *
 * Service, veterinarian, reason, and notes fields.
 */

'use client'

import type { Service, Staff } from './types'

interface AppointmentFieldsProps {
  services: Service[]
  staff: Staff[]
  serviceId: string
  vetId: string
  reason: string
  notes: string
  onServiceChange: (value: string) => void
  onVetChange: (value: string) => void
  onReasonChange: (value: string) => void
  onNotesChange: (value: string) => void
}

export function AppointmentFields({
  services,
  staff,
  serviceId,
  vetId,
  reason,
  notes,
  onServiceChange,
  onVetChange,
  onReasonChange,
  onNotesChange,
}: AppointmentFieldsProps) {
  return (
    <>
      {/* Service */}
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">Servicio</label>
        <select
          value={serviceId}
          onChange={(e) => onServiceChange(e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
        >
          <option value="">Seleccionar servicio (opcional)</option>
          {services.map((service) => (
            <option key={service.id} value={service.id}>
              {service.name} ({service.duration_minutes} min)
            </option>
          ))}
        </select>
      </div>

      {/* Veterinarian */}
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">Veterinario</label>
        <select
          value={vetId}
          onChange={(e) => onVetChange(e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
        >
          <option value="">Asignar automáticamente</option>
          {staff.map((member) => (
            <option key={member.id} value={member.id}>
              {member.full_name}
            </option>
          ))}
        </select>
      </div>

      {/* Reason */}
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">Motivo de la cita *</label>
        <input
          type="text"
          value={reason}
          onChange={(e) => onReasonChange(e.target.value)}
          placeholder="Ej: Consulta general, vacunación, etc."
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
        />
      </div>

      {/* Notes */}
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">Notas adicionales</label>
        <textarea
          value={notes}
          onChange={(e) => onNotesChange(e.target.value)}
          rows={2}
          placeholder="Información adicional..."
          className="w-full resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
        />
      </div>
    </>
  )
}
