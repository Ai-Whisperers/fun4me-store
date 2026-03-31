'use client'

/**
 * Filter Toolbar
 *
 * Calendar filtering controls for staff, event types, and resource view mode.
 */

import { calendarStyles } from '../CalendarStyles'
import type { CalendarEventType } from '@/lib/types/calendar'
import type { FilterToolbarProps } from './types'

const EVENT_TYPES: { type: CalendarEventType; label: string }[] = [
  { type: 'appointment', label: 'Citas' },
  { type: 'shift', label: 'Turnos' },
  { type: 'time_off', label: 'Ausencias' },
]

export function FilterToolbar({
  staff,
  selectedStaff,
  selectedEventTypes,
  onStaffChange,
  onEventTypeChange,
  resourceMode,
  onResourceModeChange,
  currentView,
}: FilterToolbarProps) {
  const toggleStaff = (staffId: string) => {
    if (selectedStaff.includes(staffId)) {
      onStaffChange(selectedStaff.filter((id) => id !== staffId))
    } else {
      onStaffChange([...selectedStaff, staffId])
    }
  }

  const toggleEventType = (type: CalendarEventType) => {
    if (selectedEventTypes.includes(type)) {
      onEventTypeChange(selectedEventTypes.filter((t) => t !== type))
    } else {
      onEventTypeChange([...selectedEventTypes, type])
    }
  }

  return (
    <div
      className="mb-2 flex flex-wrap items-center gap-3 border-b border-[var(--border-light)] px-1 py-2"
      role="toolbar"
      aria-label="Filtros del calendario"
    >
      {/* Staff filters */}
      {staff.length > 0 && (
        <StaffFilters
          staff={staff}
          selectedStaff={selectedStaff}
          onToggle={toggleStaff}
          onClear={() => onStaffChange([])}
        />
      )}

      {/* Divider */}
      {staff.length > 0 && <div className="h-4 w-px bg-[var(--border-light)]" />}

      {/* Event type filters */}
      <EventTypeFilters
        selectedEventTypes={selectedEventTypes}
        onToggle={toggleEventType}
        onClear={() => onEventTypeChange([])}
      />

      {/* Resource view toggle - only show if we have staff and in day/week view */}
      {staff.length > 1 && (currentView === 'day' || currentView === 'week') && (
        <>
          <div className="h-4 w-px bg-[var(--border-light)]" aria-hidden="true" />
          <ResourceToggle
            resourceMode={resourceMode}
            onToggle={() => onResourceModeChange(!resourceMode)}
          />
        </>
      )}
    </div>
  )
}

// =============================================================================
// Sub-components
// =============================================================================

interface StaffFiltersProps {
  staff: FilterToolbarProps['staff']
  selectedStaff: string[]
  onToggle: (staffId: string) => void
  onClear: () => void
}

function StaffFilters({ staff, selectedStaff, onToggle, onClear }: StaffFiltersProps) {
  return (
    <div className="flex items-center gap-2" role="group" aria-labelledby="staff-filter-label">
      <span
        id="staff-filter-label"
        className="whitespace-nowrap text-xs font-medium text-[var(--text-muted)]"
      >
        Personal:
      </span>
      <div className="flex flex-wrap gap-1.5" role="group">
        {staff.map((member) => {
          const isSelected = selectedStaff.length === 0 || selectedStaff.includes(member.id)
          return (
            <button
              key={member.id}
              onClick={() => onToggle(member.id)}
              aria-pressed={selectedStaff.includes(member.id)}
              aria-label={`Filtrar por ${member.full_name}`}
              className={`inline-flex items-center rounded px-2 py-1 text-xs font-medium transition-colors ${
                isSelected ? 'ring-1 ring-offset-0' : 'opacity-40'
              }`}
              style={{
                backgroundColor: member.color_code + '15',
                color: member.color_code,
                // @ts-expect-error CSS custom property for ring color
                '--tw-ring-color': member.color_code,
              }}
            >
              <span
                className="mr-1.5 h-1.5 w-1.5 rounded-full"
                aria-hidden="true"
                style={{ backgroundColor: member.color_code }}
              />
              {member.full_name.split(' ')[0]}
            </button>
          )
        })}
        {selectedStaff.length > 0 && (
          <button
            onClick={onClear}
            className="ml-1 text-[10px] text-[var(--text-muted)] hover:text-[var(--primary)]"
            aria-label="Limpiar filtro de personal"
            title="Limpiar filtro"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  )
}

interface EventTypeFiltersProps {
  selectedEventTypes: CalendarEventType[]
  onToggle: (type: CalendarEventType) => void
  onClear: () => void
}

function EventTypeFilters({ selectedEventTypes, onToggle, onClear }: EventTypeFiltersProps) {
  return (
    <div
      className="flex items-center gap-2"
      role="group"
      aria-labelledby="event-type-filter-label"
    >
      <span
        id="event-type-filter-label"
        className="whitespace-nowrap text-xs font-medium text-[var(--text-muted)]"
      >
        Ver:
      </span>
      <div className="flex gap-1 rounded-lg bg-[var(--bg-subtle)] p-0.5" role="group">
        {EVENT_TYPES.map(({ type, label }) => {
          const isActive = selectedEventTypes.length === 0 || selectedEventTypes.includes(type)
          return (
            <button
              key={type}
              onClick={() => onToggle(type)}
              aria-pressed={selectedEventTypes.includes(type)}
              aria-label={`Mostrar ${label.toLowerCase()}`}
              className={`rounded px-2.5 py-1 text-xs font-medium transition-all ${
                isActive
                  ? 'bg-white text-[var(--text-primary)] shadow-sm'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
              }`}
            >
              <span
                className={`mr-1.5 inline-block h-1.5 w-1.5 rounded-full ${
                  isActive ? 'bg-[var(--primary)]' : 'bg-gray-300'
                }`}
                aria-hidden="true"
              />
              {label}
            </button>
          )
        })}
      </div>
      {selectedEventTypes.length > 0 && (
        <button
          onClick={onClear}
          className="text-[10px] text-[var(--text-muted)] hover:text-[var(--primary)]"
          aria-label="Limpiar filtro de tipo de evento"
          title="Mostrar todos"
        >
          ✕
        </button>
      )}
    </div>
  )
}

interface ResourceToggleProps {
  resourceMode: boolean
  onToggle: () => void
}

function ResourceToggle({ resourceMode, onToggle }: ResourceToggleProps) {
  return (
    <button
      onClick={onToggle}
      aria-pressed={resourceMode}
      aria-label={resourceMode ? 'Desactivar vista por doctor' : 'Activar vista por doctor'}
      className={`${calendarStyles.resourceToggleBtn} ${resourceMode ? 'active' : ''}`}
      title={resourceMode ? 'Desactivar columnas por doctor' : 'Ver columnas por doctor'}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <rect x="3" y="3" width="7" height="18" rx="1" />
        <rect x="14" y="3" width="7" height="18" rx="1" />
      </svg>
      <span className="hidden sm:inline">Por Doctor</span>
    </button>
  )
}
