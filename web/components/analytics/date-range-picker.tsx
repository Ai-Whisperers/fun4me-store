'use client'

import { useState, useRef, useEffect } from 'react'
import { Calendar, ChevronDown, X } from 'lucide-react'

export interface DateRange {
  startDate: string
  endDate: string
  label?: string
}

interface DateRangePickerProps {
  value: DateRange
  onChange: (range: DateRange) => void
  className?: string
}

const PRESET_RANGES: { label: string; getValue: () => DateRange }[] = [
  {
    label: 'Hoy',
    getValue: () => {
      const today = new Date().toISOString().split('T')[0]
      return { startDate: today, endDate: today, label: 'Hoy' }
    },
  },
  {
    label: 'Ayer',
    getValue: () => {
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      const date = yesterday.toISOString().split('T')[0]
      return { startDate: date, endDate: date, label: 'Ayer' }
    },
  },
  {
    label: 'Últimos 7 días',
    getValue: () => {
      const end = new Date()
      const start = new Date()
      start.setDate(start.getDate() - 6)
      return {
        startDate: start.toISOString().split('T')[0],
        endDate: end.toISOString().split('T')[0],
        label: 'Últimos 7 días',
      }
    },
  },
  {
    label: 'Últimos 30 días',
    getValue: () => {
      const end = new Date()
      const start = new Date()
      start.setDate(start.getDate() - 29)
      return {
        startDate: start.toISOString().split('T')[0],
        endDate: end.toISOString().split('T')[0],
        label: 'Últimos 30 días',
      }
    },
  },
  {
    label: 'Este mes',
    getValue: () => {
      const now = new Date()
      const start = new Date(now.getFullYear(), now.getMonth(), 1)
      return {
        startDate: start.toISOString().split('T')[0],
        endDate: now.toISOString().split('T')[0],
        label: 'Este mes',
      }
    },
  },
  {
    label: 'Mes anterior',
    getValue: () => {
      const now = new Date()
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      const end = new Date(now.getFullYear(), now.getMonth(), 0)
      return {
        startDate: start.toISOString().split('T')[0],
        endDate: end.toISOString().split('T')[0],
        label: 'Mes anterior',
      }
    },
  },
  {
    label: 'Últimos 90 días',
    getValue: () => {
      const end = new Date()
      const start = new Date()
      start.setDate(start.getDate() - 89)
      return {
        startDate: start.toISOString().split('T')[0],
        endDate: end.toISOString().split('T')[0],
        label: 'Últimos 90 días',
      }
    },
  },
  {
    label: 'Este año',
    getValue: () => {
      const now = new Date()
      const start = new Date(now.getFullYear(), 0, 1)
      return {
        startDate: start.toISOString().split('T')[0],
        endDate: now.toISOString().split('T')[0],
        label: 'Este año',
      }
    },
  },
  {
    label: 'Año anterior',
    getValue: () => {
      const now = new Date()
      const start = new Date(now.getFullYear() - 1, 0, 1)
      const end = new Date(now.getFullYear() - 1, 11, 31)
      return {
        startDate: start.toISOString().split('T')[0],
        endDate: end.toISOString().split('T')[0],
        label: 'Año anterior',
      }
    },
  },
]

export function DateRangePicker({
  value,
  onChange,
  className = '',
}: DateRangePickerProps): React.ReactElement {
  const [isOpen, setIsOpen] = useState(false)
  const [showCustom, setShowCustom] = useState(false)
  const [customStart, setCustomStart] = useState(value.startDate)
  const [customEnd, setCustomEnd] = useState(value.endDate)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
        setShowCustom(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handlePresetSelect = (preset: (typeof PRESET_RANGES)[0]) => {
    onChange(preset.getValue())
    setIsOpen(false)
    setShowCustom(false)
  }

  const handleCustomApply = () => {
    if (customStart && customEnd && customStart <= customEnd) {
      onChange({
        startDate: customStart,
        endDate: customEnd,
        label: 'Personalizado',
      })
      setIsOpen(false)
      setShowCustom(false)
    }
  }

  const formatDisplayDate = (dateStr: string): string => {
    return new Date(dateStr + 'T00:00:00').toLocaleDateString('es-PY', {
      day: 'numeric',
      month: 'short',
    })
  }

  const displayText = value.label || 
    `${formatDisplayDate(value.startDate)} - ${formatDisplayDate(value.endDate)}`

  return (
    <div ref={dropdownRef} className={`relative ${className}`}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-[var(--text-primary)] transition hover:border-gray-300 focus:border-[var(--primary)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
      >
        <Calendar className="h-4 w-4 text-gray-500" />
        <span>{displayText}</span>
        <ChevronDown
          className={`h-4 w-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 z-50 mt-2 w-72 rounded-xl border border-gray-200 bg-white p-2 shadow-lg">
          {!showCustom ? (
            <>
              {/* Preset Options */}
              <div className="space-y-1">
                {PRESET_RANGES.map((preset) => (
                  <button
                    key={preset.label}
                    onClick={() => handlePresetSelect(preset)}
                    className={`w-full rounded-lg px-3 py-2 text-left text-sm transition ${
                      value.label === preset.label
                        ? 'bg-[var(--primary)] text-white'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>

              {/* Divider */}
              <div className="my-2 border-t border-gray-100" />

              {/* Custom Option */}
              <button
                onClick={() => setShowCustom(true)}
                className="w-full rounded-lg px-3 py-2 text-left text-sm text-[var(--primary)] hover:bg-blue-50"
              >
                Rango personalizado...
              </button>
            </>
          ) : (
            <>
              {/* Custom Range Form */}
              <div className="flex items-center justify-between pb-2">
                <span className="text-sm font-medium text-[var(--text-primary)]">
                  Rango personalizado
                </span>
                <button
                  onClick={() => setShowCustom(false)}
                  className="rounded p-1 hover:bg-gray-100"
                >
                  <X className="h-4 w-4 text-gray-400" />
                </button>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="mb-1 block text-xs text-gray-500">Desde</label>
                  <input
                    type="date"
                    value={customStart}
                    onChange={(e) => setCustomStart(e.target.value)}
                    max={customEnd || undefined}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[var(--primary)] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-gray-500">Hasta</label>
                  <input
                    type="date"
                    value={customEnd}
                    onChange={(e) => setCustomEnd(e.target.value)}
                    min={customStart || undefined}
                    max={new Date().toISOString().split('T')[0]}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[var(--primary)] focus:outline-none"
                  />
                </div>
                <button
                  onClick={handleCustomApply}
                  disabled={!customStart || !customEnd || customStart > customEnd}
                  className="w-full rounded-lg bg-[var(--primary)] py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
                >
                  Aplicar
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
