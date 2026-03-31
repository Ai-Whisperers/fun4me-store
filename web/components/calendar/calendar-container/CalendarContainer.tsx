'use client'

/**
 * Calendar Container
 *
 * Main calendar component with event loading, filtering, and modal management.
 */

import { useState, useCallback, useMemo } from 'react'
import { Calendar } from '../calendar'
import { CalendarSkeleton } from '../calendar-skeleton'
import { EventDetailModal } from '../event-detail-modal'
import { QuickAddModal } from '../quick-add-modal'
import { FilterToolbar } from './FilterToolbar'
import { useCalendarShortcuts } from '@/hooks/use-calendar-shortcuts'
import { useCalendarEvents } from '@/hooks/use-calendar-events'
import type { CalendarEvent, CalendarView, CalendarEventType } from '@/lib/types/calendar'
import type { CalendarContainerProps } from './types'

// =============================================================================
// Helpers
// =============================================================================

/**
 * Format date for screen reader announcements
 */
function formatDateAnnouncement(date: Date, view: CalendarView): string {
  const options: Intl.DateTimeFormatOptions = {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }

  if (view === 'month') {
    return date.toLocaleDateString('es-PY', { month: 'long', year: 'numeric' })
  }

  if (view === 'week') {
    const weekStart = new Date(date)
    weekStart.setDate(date.getDate() - date.getDay())
    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekStart.getDate() + 6)
    return `Semana del ${weekStart.toLocaleDateString('es-PY', { day: 'numeric', month: 'long' })} al ${weekEnd.toLocaleDateString('es-PY', { day: 'numeric', month: 'long' })}`
  }

  return date.toLocaleDateString('es-PY', options)
}

const VIEW_LABELS: Record<CalendarView, string> = {
  day: 'Vista de día',
  week: 'Vista de semana',
  month: 'Vista de mes',
  agenda: 'Vista de agenda',
}

// =============================================================================
// Component
// =============================================================================

export function CalendarContainer({
  initialEvents,
  initialDate = new Date(),
  initialView = 'week',
  pets = [],
  services = [],
  staff = [],
  clinicSlug: _clinicSlug,
  enableDynamicLoading = true,
  onCreateAppointment,
  onDeleteEvent,
  onEventEdit,
  onDateChange,
  onViewChange,
  onRangeChange,
}: CalendarContainerProps) {
  // State
  const [currentDate, setCurrentDate] = useState<Date>(initialDate)
  const [currentView, setCurrentView] = useState<CalendarView>(initialView)
  const [announcement, setAnnouncement] = useState('')

  // Dynamic event loading
  const {
    events,
    isLoading: isLoadingEvents,
    isFetching: isFetchingEvents,
    invalidateEvents,
  } = useCalendarEvents({
    initialEvents,
    currentDate,
    currentView,
    enabled: enableDynamicLoading,
  })

  // Filters
  const [selectedStaff, setSelectedStaff] = useState<string[]>([])
  const [selectedEventTypes, setSelectedEventTypes] = useState<CalendarEventType[]>([])

  // Resource view mode (columns by doctor)
  const [resourceMode, setResourceMode] = useState(false)

  // Modals
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)
  const [isEventModalOpen, setIsEventModalOpen] = useState(false)
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false)
  const [quickAddSlot, setQuickAddSlot] = useState<{ start: Date; end: Date } | null>(null)

  // Loading states
  const [isLoading, setIsLoading] = useState(false)

  // =============================================================================
  // Handlers
  // =============================================================================

  const handleNavigate = useCallback(
    (date: Date) => {
      setCurrentDate(date)
      onDateChange?.(date)
      setAnnouncement(formatDateAnnouncement(date, currentView))
    },
    [onDateChange, currentView]
  )

  const handleShortcutNavigate = useCallback(
    (direction: 'today' | 'prev' | 'next') => {
      let newDate: Date

      switch (direction) {
        case 'today':
          newDate = new Date()
          break
        case 'prev':
          newDate = new Date(currentDate)
          if (currentView === 'month') {
            newDate.setMonth(newDate.getMonth() - 1)
          } else if (currentView === 'week') {
            newDate.setDate(newDate.getDate() - 7)
          } else {
            newDate.setDate(newDate.getDate() - 1)
          }
          break
        case 'next':
          newDate = new Date(currentDate)
          if (currentView === 'month') {
            newDate.setMonth(newDate.getMonth() + 1)
          } else if (currentView === 'week') {
            newDate.setDate(newDate.getDate() + 7)
          } else {
            newDate.setDate(newDate.getDate() + 1)
          }
          break
      }

      handleNavigate(newDate)
    },
    [currentDate, currentView, handleNavigate]
  )

  const handleViewChange = useCallback(
    (view: CalendarView) => {
      setCurrentView(view)
      onViewChange?.(view)
      setAnnouncement(VIEW_LABELS[view])
    },
    [onViewChange]
  )

  const handleSelectEvent = useCallback((event: CalendarEvent) => {
    setSelectedEvent(event)
    setIsEventModalOpen(true)
  }, [])

  const handleSelectSlot = useCallback(
    (slotInfo: { start: Date; end: Date; action: string }) => {
      if (
        slotInfo.action === 'doubleClick' ||
        (slotInfo.action === 'select' && currentView !== 'month')
      ) {
        setQuickAddSlot({ start: slotInfo.start, end: slotInfo.end })
        setIsQuickAddOpen(true)
      }
    },
    [currentView]
  )

  const handleRangeChange = useCallback(
    (range: Date[] | { start: Date; end: Date }) => {
      onRangeChange?.(range)
    },
    [onRangeChange]
  )

  const handleEventEdit = useCallback(
    (event: CalendarEvent) => {
      onEventEdit?.(event)
      setIsEventModalOpen(false)
    },
    [onEventEdit]
  )

  const handleEventDelete = useCallback(
    async (event: CalendarEvent) => {
      if (!onDeleteEvent) return

      setIsLoading(true)
      try {
        await onDeleteEvent(event)
        setIsEventModalOpen(false)
        if (enableDynamicLoading) {
          invalidateEvents()
        }
      } finally {
        setIsLoading(false)
      }
    },
    [onDeleteEvent, enableDynamicLoading, invalidateEvents]
  )

  const handleQuickAddSave = useCallback(
    async (data: {
      petId: string
      serviceId?: string
      vetId?: string
      startTime: Date
      endTime: Date
      reason: string
      notes?: string
    }) => {
      if (!onCreateAppointment) return

      setIsLoading(true)
      try {
        await onCreateAppointment(data)
        setIsQuickAddOpen(false)
        setQuickAddSlot(null)
        if (enableDynamicLoading) {
          invalidateEvents()
        }
      } finally {
        setIsLoading(false)
      }
    },
    [onCreateAppointment, enableDynamicLoading, invalidateEvents]
  )

  const handleNewAppointmentShortcut = useCallback(() => {
    if (!onCreateAppointment) return
    const now = new Date()
    now.setMinutes(Math.ceil(now.getMinutes() / 30) * 30, 0, 0)
    const end = new Date(now.getTime() + 30 * 60000)
    setQuickAddSlot({ start: now, end })
    setIsQuickAddOpen(true)
  }, [onCreateAppointment])

  const handleCloseModal = useCallback(() => {
    if (isQuickAddOpen) {
      setIsQuickAddOpen(false)
      setQuickAddSlot(null)
    }
    if (isEventModalOpen) {
      setIsEventModalOpen(false)
      setSelectedEvent(null)
    }
  }, [isQuickAddOpen, isEventModalOpen])

  // =============================================================================
  // Memoized Data
  // =============================================================================

  const staffForQuickAdd = useMemo(
    () =>
      staff.map((s) => ({
        id: s.id,
        full_name: s.full_name,
        color_code: s.color_code,
      })),
    [staff]
  )

  const calendarResources = useMemo(
    () =>
      staff.map((s) => ({
        id: s.id,
        title: s.full_name,
        colorCode: s.color_code,
        jobTitle: s.job_title,
        avatarUrl: s.avatar_url,
      })),
    [staff]
  )

  // =============================================================================
  // Keyboard Shortcuts
  // =============================================================================

  useCalendarShortcuts({
    onNavigate: handleShortcutNavigate,
    onViewChange: handleViewChange,
    onNewAppointment: onCreateAppointment ? handleNewAppointmentShortcut : undefined,
    onCloseModal: handleCloseModal,
    isModalOpen: isEventModalOpen || isQuickAddOpen,
    enabled: true,
  })

  // =============================================================================
  // Render
  // =============================================================================

  return (
    <div className="flex h-full flex-col">
      {/* Screen reader announcement */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {announcement}
      </div>

      {/* Filter toolbar */}
      <FilterToolbar
        staff={staff}
        selectedStaff={selectedStaff}
        selectedEventTypes={selectedEventTypes}
        onStaffChange={setSelectedStaff}
        onEventTypeChange={setSelectedEventTypes}
        resourceMode={resourceMode}
        onResourceModeChange={setResourceMode}
        currentView={currentView}
      />

      {/* Loading indicator */}
      {isFetchingEvents && !isLoadingEvents && (
        <div className="flex items-center gap-2 border-b border-[var(--border-light)] bg-[var(--bg-subtle)] px-3 py-1.5 text-xs text-[var(--text-muted)]">
          <svg className="h-3 w-3 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          Actualizando eventos...
        </div>
      )}

      {/* Calendar */}
      <div className="min-h-0 flex-1">
        {isLoadingEvents ? (
          <CalendarSkeleton view={currentView} />
        ) : (
          <Calendar
            events={events}
            view={currentView}
            date={currentDate}
            onNavigate={handleNavigate}
            onViewChange={handleViewChange}
            onSelectEvent={handleSelectEvent}
            onSelectSlot={onCreateAppointment ? handleSelectSlot : undefined}
            onRangeChange={handleRangeChange}
            staffFilters={selectedStaff.length > 0 ? selectedStaff : undefined}
            eventTypeFilters={selectedEventTypes.length > 0 ? selectedEventTypes : undefined}
            selectable={!!onCreateAppointment}
            className="h-full"
            resourceMode={resourceMode}
            resources={calendarResources}
          />
        )}
      </div>

      {/* Event Detail Modal */}
      <EventDetailModal
        event={selectedEvent}
        isOpen={isEventModalOpen}
        onClose={() => {
          setIsEventModalOpen(false)
          setSelectedEvent(null)
        }}
        onEdit={onEventEdit ? handleEventEdit : undefined}
        onDelete={onDeleteEvent ? handleEventDelete : undefined}
      />

      {/* Quick Add Modal */}
      {onCreateAppointment && (
        <QuickAddModal
          isOpen={isQuickAddOpen}
          onClose={() => {
            setIsQuickAddOpen(false)
            setQuickAddSlot(null)
          }}
          onSave={handleQuickAddSave}
          slotInfo={quickAddSlot}
          pets={pets}
          services={services}
          staff={staffForQuickAdd}
          isLoading={isLoading}
        />
      )}
    </div>
  )
}
