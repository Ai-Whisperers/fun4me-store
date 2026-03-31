'use client'

/**
 * Calendar Event Component
 * Clean card design with icons and clear hierarchy
 */

import type { CalendarEvent, CalendarEventResource } from '@/lib/types/calendar'

// =============================================================================
// COMPONENT PROPS
// =============================================================================

interface CalendarEventProps {
  event: CalendarEvent
}

// =============================================================================
// ICON MAPS
// =============================================================================

const SPECIES_ICON: Record<string, string> = {
  dog: '🐕',
  perro: '🐕',
  cat: '🐈',
  gato: '🐈',
  bird: '🦜',
  ave: '🦜',
  rabbit: '🐇',
  conejo: '🐇',
  hamster: '🐹',
  fish: '🐟',
  pez: '🐟',
  reptile: '🦎',
  reptil: '🦎',
  other: '🐾',
}

const SERVICE_ICON: Record<string, string> = {
  vacuna: '💉',
  vaccine: '💉',
  vaccination: '💉',
  vacunación: '💉',
  surgery: '🔪',
  cirugía: '🔪',
  cirugia: '🔪',
  castración: '🔪',
  castracion: '🔪',
  grooming: '✂️',
  baño: '🛁',
  bano: '🛁',
  peluquería: '✂️',
  peluqueria: '✂️',
  consulta: '🩺',
  checkup: '🩺',
  control: '🩺',
  emergencia: '🚨',
  emergency: '🚨',
  urgencia: '🚨',
  dental: '🦷',
  laboratorio: '🔬',
  lab: '🔬',
  xray: '📷',
  rayos: '📷',
  ecografía: '📷',
  ecografia: '📷',
}

function getServiceIcon(reason?: string | null): string {
  if (!reason) return '🩺'
  const lower = reason.toLowerCase()
  for (const [key, icon] of Object.entries(SERVICE_ICON)) {
    if (lower.includes(key)) return icon
  }
  return '🩺'
}

// =============================================================================
// COMPONENT
// =============================================================================

export function CalendarEventComponent({ event }: CalendarEventProps) {
  const resource = event.resource as CalendarEventResource | undefined

  // For appointments, show pet name + service icon
  if (resource?.type === 'appointment') {
    const speciesIcon = resource.species
      ? SPECIES_ICON[resource.species.toLowerCase()] || SPECIES_ICON.other
      : ''
    const serviceIcon = getServiceIcon(resource.reason || resource.serviceName)

    // Get owner's last name for compact display
    const ownerLastName = resource.ownerName?.split(' ').pop() || ''

    return (
      <div
        className="flex h-full flex-col overflow-hidden px-2 py-1.5"
        title={`${resource.petName || event.title}${resource.ownerName ? `\nDueño: ${resource.ownerName}` : ''}${resource.reason ? `\nMotivo: ${resource.reason}` : ''}${resource.notes ? `\nNotas: ${resource.notes}` : ''}`}
      >
        <div className="flex items-center gap-1">
          <span className="text-sm">{speciesIcon}</span>
          <span className="truncate text-[14px] font-bold leading-tight text-gray-900">
            {resource.petName || event.title}
          </span>
        </div>
        <div className="mt-0.5 flex items-center gap-1">
          <span className="text-xs">{serviceIcon}</span>
          <span className="truncate text-[12px] leading-tight text-gray-600">
            {resource.reason || resource.serviceName || 'Consulta'}
          </span>
        </div>
        {ownerLastName && (
          <span className="mt-0.5 truncate text-[11px] leading-tight text-gray-400">
            {ownerLastName}
          </span>
        )}
      </div>
    )
  }

  // For shifts, show staff name with icon
  if (resource?.type === 'shift') {
    return (
      <div className="flex h-full flex-col overflow-hidden px-2 py-1.5">
        <div className="flex items-center gap-1">
          <span className="text-sm">👤</span>
          <span className="truncate text-[14px] font-bold leading-tight text-gray-900">
            {resource.staffName || event.title}
          </span>
        </div>
        <span className="mt-0.5 text-[12px] leading-tight text-gray-500">Turno</span>
      </div>
    )
  }

  // For time off, show type with icon
  if (resource?.type === 'time_off') {
    return (
      <div className="flex h-full flex-col overflow-hidden px-2 py-1.5">
        <div className="flex items-center gap-1">
          <span className="text-sm">🏖️</span>
          <span className="truncate text-[14px] font-bold leading-tight text-gray-900">
            {resource.staffName || 'Ausencia'}
          </span>
        </div>
        <span className="mt-0.5 truncate text-[12px] leading-tight text-gray-500">
          {event.title}
        </span>
      </div>
    )
  }

  // Default fallback
  return (
    <div className="flex h-full flex-col overflow-hidden px-2 py-1.5">
      <span className="truncate text-[14px] font-bold leading-tight text-gray-900">
        {event.title}
      </span>
    </div>
  )
}
