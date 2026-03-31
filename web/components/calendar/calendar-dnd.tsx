'use client'

import { useMemo, useCallback } from 'react'
import { Calendar as BigCalendar, Views, type DateCellWrapperProps } from 'react-big-calendar'
import withDragAndDrop, {
  type EventInteractionArgs,
} from 'react-big-calendar/lib/addons/dragAndDrop'
import type {
  CalendarEvent,
  CalendarView,
  CalendarEventType,
  CalendarEventResource,
} from '@/lib/types/calendar'

import 'react-big-calendar/lib/css/react-big-calendar.css'
import 'react-big-calendar/lib/addons/dragAndDrop/styles.css'

// Internal modules
import { calendarLocalizer } from './calendar-localizer'
import { CALENDAR_MESSAGES, CALENDAR_CONFIG } from './calendar-constants'
import { getEventStyle } from './calendar-styling'
import { CalendarEventComponent } from './CalendarEvent'
import { calendarStyles } from './CalendarStyles'
import { useCalendarState } from './useCalendarState'

// Create DnD-enhanced calendar with proper types
const DnDCalendar = withDragAndDrop<CalendarEvent>(BigCalendar)

// Custom formats to hide time range inside event chips
const CALENDAR_FORMATS = {
  eventTimeRangeFormat: () => '',
  timeGutterFormat: 'HH:mm',
}

// =============================================================================
// COMPONENT PROPS
// =============================================================================

interface CalendarDnDProps {
  events: CalendarEvent[]
  view?: CalendarView
  date?: Date
  onNavigate?: (date: Date) => void
  onViewChange?: (view: CalendarView) => void
  onSelectEvent?: (event: CalendarEvent) => void
  onSelectSlot?: (slotInfo: { start: Date; end: Date; action: string }) => void
  onRangeChange?: (range: Date[] | { start: Date; end: Date }) => void
  onEventDrop?: (args: { event: CalendarEvent; start: Date; end: Date }) => void
  onEventResize?: (args: { event: CalendarEvent; start: Date; end: Date }) => void
  staffFilters?: string[]
  eventTypeFilters?: CalendarEventType[]
  minTime?: Date
  maxTime?: Date
  selectable?: boolean
  resizable?: boolean
  className?: string
}

// =============================================================================
// DRAG AND DROP CALENDAR COMPONENT
// =============================================================================

export function CalendarDnD({
  events,
  view = 'week',
  date = new Date(),
  onNavigate,
  onViewChange,
  onSelectEvent,
  onSelectSlot,
  onRangeChange,
  onEventDrop,
  onEventResize,
  staffFilters,
  eventTypeFilters,
  minTime,
  maxTime,
  selectable = true,
  resizable = true,
  className = '',
}: CalendarDnDProps) {
  // Use custom hook for state management
  const { currentView, currentDate, filteredEvents, defaultMinTime, defaultMaxTime, handlers } =
    useCalendarState({
      events,
      initialView: view,
      initialDate: date,
      staffFilters,
      eventTypeFilters,
      minTime,
      maxTime,
      onNavigate,
      onViewChange,
      onSelectEvent,
      onSelectSlot,
      onRangeChange,
      selectable,
    })

  // Custom title accessor - show pet name for appointments
  const titleAccessor = useMemo(
    () => (event: CalendarEvent) => {
      const resource = event.resource as CalendarEventResource | undefined
      if (resource?.type === 'appointment' && resource.petName) {
        return resource.petName
      }
      return event.title
    },
    []
  )

  // Tooltip accessor - show full details on hover
  const tooltipAccessor = useMemo(
    () => (event: CalendarEvent) => {
      const resource = event.resource as CalendarEventResource | undefined
      if (resource?.type === 'appointment') {
        const parts = [resource.petName || event.title]
        if (resource.reason) parts.push(resource.reason)
        if (resource.ownerName) parts.push(`Dueño: ${resource.ownerName}`)
        return parts.join('\n')
      }
      return event.title
    },
    []
  )

  // Pre-compute daily appointment counts for O(1) lookup
  const dailyAppointmentCounts = useMemo(() => {
    const counts = new Map<string, number>()
    for (const event of filteredEvents) {
      if (event.type !== 'appointment') continue
      const dateKey = event.start.toISOString().split('T')[0]
      counts.set(dateKey, (counts.get(dateKey) || 0) + 1)
    }
    return counts
  }, [filteredEvents])

  // Capacity color helper
  const getCapacityColor = useCallback((count: number): string => {
    if (count === 0) return 'transparent'
    if (count <= 3) return 'var(--status-success, #22C55E)'
    if (count <= 6) return 'var(--status-warning, #F59E0B)'
    if (count <= 10) return 'var(--status-error, #EF4444)'
    return 'var(--status-error-dark, #DC2626)'
  }, [])

  // Date cell wrapper for month view capacity indicator
  const DateCellWrapper = useCallback(
    ({ value, children }: DateCellWrapperProps) => {
      const dateKey = value.toISOString().split('T')[0]
      const dayEventCount = dailyAppointmentCounts.get(dateKey) || 0
      const capacityWidth = Math.min((dayEventCount / 15) * 100, 100)
      const capacityColor = getCapacityColor(dayEventCount)

      return (
        <div className="rbc-day-bg relative h-full">
          {children}
          {dayEventCount > 0 && (
            <div
              className="absolute bottom-1 left-1 right-1 h-1.5 overflow-hidden rounded-full bg-gray-100"
              title={`${dayEventCount} cita${dayEventCount !== 1 ? 's' : ''}`}
            >
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{
                  width: `${capacityWidth}%`,
                  backgroundColor: capacityColor,
                }}
              />
            </div>
          )}
        </div>
      )
    },
    [dailyAppointmentCounts, getCapacityColor]
  )

  // Determine if an event is draggable
  const draggableAccessor = useCallback((event: CalendarEvent): boolean => {
    // Only appointments can be dragged
    if (event.type !== 'appointment') return false

    // Don't allow dragging past events
    if (event.end < new Date()) return false

    // Don't allow dragging completed/cancelled events
    const resource = event.resource as CalendarEventResource | undefined
    if (resource?.status === 'completed' || resource?.status === 'cancelled') {
      return false
    }

    return true
  }, [])

  // Handle event drop (drag to new time/date)
  const handleEventDrop = useCallback(
    (args: EventInteractionArgs<CalendarEvent>) => {
      const { event, start, end } = args

      // Validate the drop
      if (new Date(start) < new Date()) {
        // Can't drop in the past
        return
      }

      onEventDrop?.({
        event,
        start: new Date(start),
        end: new Date(end),
      })
    },
    [onEventDrop]
  )

  // Handle event resize
  const handleEventResize = useCallback(
    (args: EventInteractionArgs<CalendarEvent>) => {
      const { event, start, end } = args

      onEventResize?.({
        event,
        start: new Date(start),
        end: new Date(end),
      })
    },
    [onEventResize]
  )

  return (
    <div className={`${calendarStyles.calendarWrapper} ${className}`}>
      <style jsx global>{`
        /* DnD specific styles */
        .rbc-addons-dnd .rbc-event {
          cursor: grab;
        }
        .rbc-addons-dnd .rbc-event:active {
          cursor: grabbing;
        }
        .rbc-addons-dnd-dragging .rbc-event {
          opacity: 0.5;
        }
        .rbc-addons-dnd .rbc-addons-dnd-resize-ns-icon,
        .rbc-addons-dnd .rbc-addons-dnd-resize-ew-icon {
          display: none;
        }
        .rbc-addons-dnd .rbc-event:hover .rbc-addons-dnd-resize-ns-icon,
        .rbc-addons-dnd .rbc-event:hover .rbc-addons-dnd-resize-ew-icon {
          display: block;
        }
        /* Non-draggable events */
        .rbc-addons-dnd .rbc-event[data-draggable='false'] {
          cursor: default;
        }
      `}</style>
      <DnDCalendar
        localizer={calendarLocalizer}
        events={filteredEvents}
        view={currentView}
        date={currentDate}
        views={[Views.MONTH, Views.WEEK, Views.DAY, Views.AGENDA]}
        onNavigate={handlers.handleNavigate}
        onView={handlers.handleViewChange as (view: string) => void}
        onSelectEvent={handlers.handleSelectEvent}
        onSelectSlot={handlers.handleSelectSlot}
        onRangeChange={handlers.handleRangeChange}
        onEventDrop={handleEventDrop}
        onEventResize={handleEventResize}
        draggableAccessor={draggableAccessor}
        resizable={resizable}
        selectable={selectable}
        eventPropGetter={getEventStyle}
        titleAccessor={titleAccessor}
        tooltipAccessor={tooltipAccessor}
        formats={CALENDAR_FORMATS}
        components={{
          event: CalendarEventComponent,
          dateCellWrapper: DateCellWrapper,
        }}
        messages={CALENDAR_MESSAGES}
        min={defaultMinTime}
        max={defaultMaxTime}
        step={CALENDAR_CONFIG.step}
        timeslots={CALENDAR_CONFIG.timeslots}
        culture="es"
        popup
        showMultiDayTimes
        dayLayoutAlgorithm="no-overlap"
      />
    </div>
  )
}
