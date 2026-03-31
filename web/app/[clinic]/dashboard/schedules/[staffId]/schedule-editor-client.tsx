'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { ScheduleEditor } from '@/components/calendar'
import {
  createStaffSchedule,
  updateStaffSchedule,
  deleteStaffSchedule,
} from '@/app/actions/schedules'
import type { StaffScheduleEntry, ScheduleEntryFormData } from '@/lib/types/calendar'

// =============================================================================
// TYPES
// =============================================================================

interface StaffData {
  id: string
  full_name: string
  job_title: string
  color_code: string
  can_be_booked: boolean
}

interface ScheduleData {
  id: string
  name: string
  effectiveFrom: string
  effectiveTo?: string
  timezone: string
  notes?: string
  entries: StaffScheduleEntry[]
}

interface ScheduleEditorClientProps {
  clinicSlug: string
  staffId: string
  staffData: StaffData
  existingSchedule: ScheduleData | null
}

// =============================================================================
// COMPONENT
// =============================================================================

export function ScheduleEditorClient({
  clinicSlug,
  staffId,
  staffData,
  existingSchedule,
}: ScheduleEditorClientProps) {
  const router = useRouter()
  const isEditing = existingSchedule !== null

  // Form state
  const [name, setName] = useState(existingSchedule?.name || 'Horario Regular')
  const [effectiveFrom, setEffectiveFrom] = useState(
    existingSchedule?.effectiveFrom || new Date().toISOString().split('T')[0]
  )
  const [effectiveTo, setEffectiveTo] = useState(existingSchedule?.effectiveTo || '')
  const [notes, setNotes] = useState(existingSchedule?.notes || '')
  const [entries, setEntries] = useState<ScheduleEntryFormData[]>(() => {
    if (!existingSchedule?.entries) return []
    // Transform from DB snake_case to form camelCase
    return existingSchedule.entries.map((entry) => ({
      dayOfWeek: entry.day_of_week,
      startTime: entry.start_time,
      endTime: entry.end_time,
      breakStart: entry.break_start || undefined,
      breakEnd: entry.break_end || undefined,
      location: entry.location || undefined,
    }))
  })

  // UI state
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Handle entries change from ScheduleEditor
  const handleEntriesChange = useCallback((newEntries: ScheduleEntryFormData[]) => {
    setEntries(newEntries)
  }, [])

  // Handle save
  const handleSave = async () => {
    setError('')
    setSuccess('')

    if (!name.trim()) {
      setError('El nombre del horario es requerido')
      return
    }

    if (!effectiveFrom) {
      setError('La fecha de inicio es requerida')
      return
    }

    if (entries.length === 0) {
      setError('Debes definir al menos un día de trabajo')
      return
    }

    setIsSaving(true)

    try {
      if (isEditing && existingSchedule) {
        // Update existing schedule
        const result = await updateStaffSchedule(existingSchedule.id, {
          name,
          effectiveFrom,
          effectiveTo: effectiveTo || undefined,
          notes: notes || undefined,
          entries,
        })

        if (!result.success) {
          setError(result.error || 'Error desconocido')
        } else {
          setSuccess('Horario actualizado correctamente')
          setTimeout(() => {
            router.push(`/${clinicSlug}/dashboard/schedules`)
          }, 1500)
        }
      } else {
        // Create new schedule
        const result = await createStaffSchedule(clinicSlug, {
          staffProfileId: staffId,
          name,
          effectiveFrom,
          effectiveTo: effectiveTo || undefined,
          timezone: 'America/Asuncion',
          notes: notes || undefined,
          entries,
        })

        if (!result.success) {
          setError(result.error || 'Error desconocido')
        } else {
          setSuccess('Horario creado correctamente')
          setTimeout(() => {
            router.push(`/${clinicSlug}/dashboard/schedules`)
          }, 1500)
        }
      }
    } catch (err) {
      setError('Error al guardar el horario')
      // Client-side error logging - only in development
      if (process.env.NODE_ENV === 'development') {
        console.error('Save schedule error:', err)
      }
    } finally {
      setIsSaving(false)
    }
  }

  // Handle delete
  const handleDelete = async () => {
    if (!existingSchedule) return

    if (!confirm('¿Estás seguro de que deseas eliminar este horario?')) {
      return
    }

    setIsDeleting(true)
    setError('')

    try {
      const result = await deleteStaffSchedule(existingSchedule.id)

      if (!result.success) {
        setError(result.error || 'Error desconocido')
      } else {
        router.push(`/${clinicSlug}/dashboard/schedules`)
      }
    } catch (err) {
      setError('Error al eliminar el horario')
      // Client-side error logging - only in development
      if (process.env.NODE_ENV === 'development') {
        console.error('Delete schedule error:', err)
      }
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Messages */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-700">
          {success}
        </div>
      )}

      {/* Schedule metadata */}
      <div className="rounded-xl border border-gray-100 bg-white p-6">
        <h2 className="mb-4 text-lg font-semibold text-[var(--text-primary)]">
          Información del Horario
        </h2>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Nombre del horario *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej: Horario Regular, Turno Mañana"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Fecha de inicio *
            </label>
            <input
              type="date"
              value={effectiveFrom}
              onChange={(e) => setEffectiveFrom(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Fecha de fin (opcional)
            </label>
            <input
              type="date"
              value={effectiveTo}
              onChange={(e) => setEffectiveTo(e.target.value)}
              min={effectiveFrom}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
            />
            <p className="mt-1 text-xs text-gray-500">Dejar vacío para horario permanente</p>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Notas (opcional)</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Notas adicionales sobre el horario"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
            />
          </div>
        </div>
      </div>

      {/* Schedule entries */}
      <div className="rounded-xl border border-gray-100 bg-white p-6">
        <h2 className="mb-4 text-lg font-semibold text-[var(--text-primary)]">
          Días y Horarios de Trabajo
        </h2>

        <ScheduleEditor
          entries={existingSchedule?.entries || []}
          onChange={handleEntriesChange}
          disabled={isSaving || isDeleting}
        />
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between pt-4">
        {isEditing && (
          <button
            type="button"
            onClick={handleDelete}
            disabled={isSaving || isDeleting}
            className="rounded-lg bg-red-50 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-100 disabled:opacity-50"
          >
            {isDeleting ? 'Eliminando...' : 'Eliminar Horario'}
          </button>
        )}

        <div className={`flex gap-3 ${!isEditing ? 'ml-auto' : ''}`}>
          <button
            type="button"
            onClick={() => router.push(`/${clinicSlug}/dashboard/schedules`)}
            disabled={isSaving || isDeleting}
            className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving || isDeleting}
            className="rounded-lg px-6 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
            style={{ backgroundColor: 'var(--primary, #3B82F6)' }}
          >
            {isSaving ? 'Guardando...' : isEditing ? 'Guardar Cambios' : 'Crear Horario'}
          </button>
        </div>
      </div>
    </div>
  )
}
