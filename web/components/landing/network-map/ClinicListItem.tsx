/**
 * Clinic List Item Component
 *
 * Individual clinic card in the list view.
 */

'use client'

import { MapPin, Clock, Star } from 'lucide-react'
import type { ClinicLocation } from './types'

interface ClinicListItemProps {
  clinic: ClinicLocation
  isSelected: boolean
  onClick: () => void
}

export function ClinicListItem({ clinic, isSelected, onClick }: ClinicListItemProps) {
  // Check if currently open (simplified logic)
  const now = new Date()
  const hour = now.getHours()
  const day = now.getDay()
  const isWeekday = day >= 1 && day <= 5
  const isSaturday = day === 6

  let isOpen = false
  if (isWeekday) {
    const [open, close] = clinic.hours.weekdays.split(' - ').map((t) => parseInt(t.split(':')[0]))
    isOpen = hour >= open && hour < close
  } else if (isSaturday) {
    const [open, close] = clinic.hours.saturday.split(' - ').map((t) => parseInt(t.split(':')[0]))
    isOpen = hour >= open && hour < close
  } else if (clinic.emergency24h) {
    isOpen = true
  }

  return (
    <button
      onClick={onClick}
      className={`w-full rounded-xl p-4 text-left transition-all ${
        isSelected
          ? 'bg-[var(--primary)]/10 border-[var(--primary)]/30 border-2'
          : 'border border-white/10 bg-white/5 hover:border-white/20'
      }`}
    >
      <div className="mb-2 flex items-start justify-between">
        <div>
          <h4 className="font-bold text-white">{clinic.name}</h4>
          <p className="flex items-center gap-1 text-sm text-white/50">
            <MapPin className="h-3 w-3" />
            {clinic.neighborhood}, {clinic.city}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <div className="flex items-center gap-1">
            <Star className="h-3 w-3 fill-[var(--primary)] text-[var(--primary)]" />
            <span className="text-sm font-bold text-white">{clinic.rating}</span>
          </div>
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-medium ${
              isOpen ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
            }`}
          >
            {isOpen ? 'Abierto' : 'Cerrado'}
          </span>
        </div>
      </div>

      <div className="mb-3 flex flex-wrap gap-1">
        {clinic.specialties.slice(0, 3).map((spec, idx) => (
          <span key={idx} className="rounded-full bg-white/5 px-2 py-0.5 text-xs text-white/50">
            {spec}
          </span>
        ))}
      </div>

      <div className="flex items-center justify-between text-xs">
        <span className="text-white/40">
          <Clock className="mr-1 inline h-3 w-3" />
          {isWeekday ? clinic.hours.weekdays : isSaturday ? clinic.hours.saturday : clinic.hours.sunday}
        </span>
        {clinic.emergency24h && (
          <span className="rounded-full bg-red-500/20 px-2 py-0.5 text-red-400">24hs</span>
        )}
      </div>
    </button>
  )
}
