'use client'

import { useState, useEffect } from 'react'
import {
  getDayName,
  type DayOfWeek,
  type StaffScheduleEntry,
  type StaffScheduleEntryFormData,
} from '@/lib/types/calendar'

// =============================================================================
// TYPES
// =============================================================================

interface ScheduleEditorProps {
  entries: StaffScheduleEntry[]
  onChange: (entries: StaffScheduleEntryFormData[]) => void
  disabled?: boolean
}

// =============================================================================
// ENTRY ROW COMPONENT
// =============================================================================

interface EntryRowProps {
  dayOfWeek: DayOfWeek
  entry: StaffScheduleEntryFormData | null
  onUpdate: (entry: StaffScheduleEntryFormData) => void
  onRemove: () => void
  disabled?: boolean
}

function EntryRow({ dayOfWeek, entry, onUpdate, onRemove, disabled }: EntryRowProps) {
  const isActive = entry !== null

  const handleToggle = () => {
    if (isActive) {
      onRemove()
    } else {
      onUpdate({
        dayOfWeek,
        startTime: '08:00',
        endTime: '17:00',
      })
    }
  }

  const handleFieldChange = (field: keyof StaffScheduleEntryFormData, value: string) => {
    if (!entry) return
    onUpdate({ ...entry, [field]: value || undefined })
  }

  return (
    <div
      className={`flex items-center gap-4 rounded-lg border p-4 ${
        isActive ? 'border-gray-200 bg-white' : 'border-gray-100 bg-gray-50'
      }`}
    >
      {/* Day toggle */}
      <div className="flex min-w-[140px] items-center gap-3">
        <button
          type="button"
          onClick={handleToggle}
          disabled={disabled}
          className={`relative h-6 w-10 rounded-full transition-colors ${
            isActive ? 'bg-[var(--primary)]' : 'bg-gray-300'
          } ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
        >
          <span
            className={`absolute top-1 h-4 w-4 rounded-full bg-white transition-transform ${
              isActive ? 'right-1' : 'left-1'
            }`}
          />
        </button>
        <span className={`font-medium ${isActive ? 'text-gray-900' : 'text-gray-400'}`}>
          {getDayName(dayOfWeek)}
        </span>
      </div>

      {/* Time inputs */}
      {isActive && entry ? (
        <div className="flex flex-1 flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-500">Entrada</label>
            <input
              type="time"
              value={entry.startTime}
              onChange={(e) => handleFieldChange('startTime', e.target.value)}
              disabled={disabled}
              className="rounded-lg border border-gray-200 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] disabled:opacity-50"
            />
          </div>

          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-500">Salida</label>
            <input
              type="time"
              value={entry.endTime}
              onChange={(e) => handleFieldChange('endTime', e.target.value)}
              disabled={disabled}
              className="rounded-lg border border-gray-200 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] disabled:opacity-50"
            />
          </div>

          {/* Break times (collapsible) */}
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-500">Descanso</label>
            <input
              type="time"
              value={entry.breakStart || ''}
              onChange={(e) => handleFieldChange('breakStart', e.target.value)}
              disabled={disabled}
              placeholder="Inicio"
              className="w-24 rounded-lg border border-gray-200 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] disabled:opacity-50"
            />
            <span className="text-gray-400">-</span>
            <input
              type="time"
              value={entry.breakEnd || ''}
              onChange={(e) => handleFieldChange('breakEnd', e.target.value)}
              disabled={disabled}
              placeholder="Fin"
              className="w-24 rounded-lg border border-gray-200 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] disabled:opacity-50"
            />
          </div>
        </div>
      ) : (
        <div className="flex-1 text-sm italic text-gray-400">Sin horario programado</div>
      )}
    </div>
  )
}

// =============================================================================
// SCHEDULE EDITOR COMPONENT
// =============================================================================

export function ScheduleEditor({ entries, onChange, disabled = false }: ScheduleEditorProps) {
  // Convert entries to form data keyed by day
  const [entriesMap, setEntriesMap] = useState<Map<DayOfWeek, StaffScheduleEntryFormData>>(() => {
    const map = new Map<DayOfWeek, StaffScheduleEntryFormData>()
    entries.forEach((entry) => {
      map.set(entry.day_of_week as DayOfWeek, {
        dayOfWeek: entry.day_of_week as DayOfWeek,
        startTime: entry.start_time,
        endTime: entry.end_time,
        breakStart: entry.break_start || undefined,
        breakEnd: entry.break_end || undefined,
        location: entry.location || undefined,
      })
    })
    return map
  })

  // Update parent when entries change
  useEffect(() => {
    const entriesArray = Array.from(entriesMap.values())
    onChange(entriesArray)
  }, [entriesMap, onChange])

  const handleUpdateEntry = (dayOfWeek: DayOfWeek, entry: StaffScheduleEntryFormData) => {
    setEntriesMap((prev) => {
      const newMap = new Map(prev)
      newMap.set(dayOfWeek, entry)
      return newMap
    })
  }

  const handleRemoveEntry = (dayOfWeek: DayOfWeek) => {
    setEntriesMap((prev) => {
      const newMap = new Map(prev)
      newMap.delete(dayOfWeek)
      return newMap
    })
  }

  // Quick templates
  const applyTemplate = (template: 'weekdays' | 'full' | 'clear') => {
    const newMap = new Map<DayOfWeek, StaffScheduleEntryFormData>()

    if (template === 'weekdays') {
      // Monday to Friday, 8-17
      for (let day = 1; day <= 5; day++) {
        newMap.set(day as DayOfWeek, {
          dayOfWeek: day as DayOfWeek,
          startTime: '08:00',
          endTime: '17:00',
          breakStart: '12:00',
          breakEnd: '13:00',
        })
      }
    } else if (template === 'full') {
      // All days
      for (let day = 0; day <= 6; day++) {
        newMap.set(day as DayOfWeek, {
          dayOfWeek: day as DayOfWeek,
          startTime: '08:00',
          endTime: '17:00',
          breakStart: '12:00',
          breakEnd: '13:00',
        })
      }
    }
    // 'clear' results in empty map

    setEntriesMap(newMap)
  }

  // Calculate total hours
  const totalHours = Array.from(entriesMap.values()).reduce((total, entry) => {
    const [startH, startM] = entry.startTime.split(':').map(Number)
    const [endH, endM] = entry.endTime.split(':').map(Number)
    let hours = (endH * 60 + endM - startH * 60 - startM) / 60

    if (entry.breakStart && entry.breakEnd) {
      const [breakStartH, breakStartM] = entry.breakStart.split(':').map(Number)
      const [breakEndH, breakEndM] = entry.breakEnd.split(':').map(Number)
      hours -= (breakEndH * 60 + breakEndM - breakStartH * 60 - breakStartM) / 60
    }

    return total + hours
  }, 0)

  // Days in order (Monday first)
  const daysInOrder: DayOfWeek[] = [1, 2, 3, 4, 5, 6, 0]

  return (
    <div className="space-y-4">
      {/* Quick templates */}
      <div className="flex flex-wrap items-center gap-3 border-b border-gray-200 pb-4">
        <span className="text-sm text-gray-500">Plantillas rápidas:</span>
        <button
          type="button"
          onClick={() => applyTemplate('weekdays')}
          disabled={disabled}
          className="rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-200 disabled:opacity-50"
        >
          Lunes a Viernes
        </button>
        <button
          type="button"
          onClick={() => applyTemplate('full')}
          disabled={disabled}
          className="rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-200 disabled:opacity-50"
        >
          Todos los días
        </button>
        <button
          type="button"
          onClick={() => applyTemplate('clear')}
          disabled={disabled}
          className="rounded-lg bg-[var(--status-error-bg)] px-3 py-1.5 text-xs font-medium text-[var(--status-error-text)] hover:opacity-80 disabled:opacity-50"
        >
          Limpiar todo
        </button>
        <div className="flex-1" />
        <div className="text-sm">
          <span className="text-gray-500">Total:</span>{' '}
          <span className="font-semibold text-gray-900">{totalHours.toFixed(1)} horas/semana</span>
        </div>
      </div>

      {/* Day entries */}
      <div className="space-y-2">
        {daysInOrder.map((day) => (
          <EntryRow
            key={day}
            dayOfWeek={day}
            entry={entriesMap.get(day) || null}
            onUpdate={(entry) => handleUpdateEntry(day, entry)}
            onRemove={() => handleRemoveEntry(day)}
            disabled={disabled}
          />
        ))}
      </div>

      {/* Summary */}
      {entriesMap.size > 0 && (
        <div className="mt-4 rounded-lg bg-[var(--status-info-bg)] p-4">
          <h4 className="mb-2 text-sm font-medium text-[var(--status-info-text)]">Resumen del horario</h4>
          <div className="text-sm text-[var(--status-info-text)]">
            <p>
              <strong>{entriesMap.size}</strong> día{entriesMap.size !== 1 ? 's' : ''} laborable
              {entriesMap.size !== 1 ? 's' : ''}
            </p>
            <p>
              Días:{' '}
              {Array.from(entriesMap.keys())
                .sort((a, b) => {
                  // Sort with Monday first
                  const order = [1, 2, 3, 4, 5, 6, 0]
                  return order.indexOf(a) - order.indexOf(b)
                })
                .map((d) => getDayName(d, true))
                .join(', ')}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
