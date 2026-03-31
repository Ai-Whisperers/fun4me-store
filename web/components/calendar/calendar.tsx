'use client'

import { useMemo, useCallback } from 'react'
import {
  Calendar as BigCalendar,
  Views,
  type DateCellWrapperProps,
  type Components,
} from 'react-big-calendar'
import type {
  CalendarEvent,
  CalendarView,
  CalendarEventType,
  CalendarEventResource,
} from '@/lib/types/calendar'

import 'react-big-calendar/lib/css/react-big-calendar.css'

// Internal modules
import { calendarLocalizer } from './calendar-localizer'
import { CALENDAR_MESSAGES, CALENDAR_CONFIG } from './calendar-constants'
import { getEventStyle } from './calendar-styling'
import { CalendarEventComponent } from './CalendarEvent'
import { calendarStyles, getCalendarWrapperClass } from './CalendarStyles'
import { useCalendarState } from './useCalendarState'
import {
  ResourceHeader,
  resourceAccessor,
  resourceIdAccessor,
  resourceTitleAccessor,
  type CalendarResourceData,
} from './calendar-resource-header'

// Custom formats to hide time range inside event chips
const CALENDAR_FORMATS = {
  // Don't show time range in event - we show pet name instead
  eventTimeRangeFormat: () => '',
  // Time gutter format
  timeGutterFormat: 'HH:mm',
}

// =============================================================================
// TYPES
// =============================================================================

// Re-export the resource type for external use
export type CalendarResource = CalendarResourceData

// =============================================================================
// COMPONENT PROPS
// =============================================================================

interface CalendarProps {
  events: CalendarEvent[]
  view?: CalendarView
  date?: Date
  onNavigate?: (date: Date) => void
  onViewChange?: (view: CalendarView) => void
  onSelectEvent?: (event: CalendarEvent) => void
  onSelectSlot?: (slotInfo: { start: Date; end: Date; action: string }) => void
  onRangeChange?: (range: Date[] | { start: Date; end: Date }) => void
  staffFilters?: string[]
  eventTypeFilters?: CalendarEventType[]
  minTime?: Date
  maxTime?: Date
  selectable?: boolean
  className?: string
  /** Enable resource view (columns by staff) - only works in day/week views */
  resourceMode?: boolean
  /** Staff resources for resource view */
  resources?: CalendarResource[]
}

// =============================================================================
// CALENDAR COMPONENT
// =============================================================================

export function Calendar({
  events,
  view = 'week',
  date = new Date(),
  onNavigate,
  onViewChange,
  onSelectEvent,
  onSelectSlot,
  onRangeChange,
  staffFilters,
  eventTypeFilters,
  minTime,
  maxTime,
  selectable = true,
  className = '',
  resourceMode = false,
  resources = [],
}: CalendarProps) {
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

  // Capacity color helper - extracted to avoid recreation
  const getCapacityColor = useCallback((count: number): string => {
    if (count === 0) return 'transparent'
    if (count <= 3) return 'var(--status-success, #22C55E)' // Green (low)
    if (count <= 6) return 'var(--status-warning, #F59E0B)' // Amber (medium)
    if (count <= 10) return 'var(--status-error, #EF4444)' // Red (high)
    return 'var(--status-error-dark, #DC2626)' // Dark red (overbooked)
  }, [])

  // Pre-compute daily event details for month view summary
  const dailyEventDetails = useMemo(() => {
    const details = new Map<
      string,
      {
        appointments: Array<{ petName: string; time: string; service?: string }>
        shifts: number
        timeOff: Array<{ staffName: string }>
        blocks: number
        firstTime?: string
        lastTime?: string
      }
    >()

    for (const event of filteredEvents) {
      const dateKey = event.start.toISOString().split('T')[0]
      if (!details.has(dateKey)) {
        details.set(dateKey, { appointments: [], shifts: 0, timeOff: [], blocks: 0 })
      }
      // Non-null assertion safe: key guaranteed to exist after lines 166-167
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const day = details.get(dateKey)!
      const resource = event.resource as CalendarEventResource | undefined
      const timeStr = event.start.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })

      switch (event.type) {
        case 'appointment':
          day.appointments.push({
            petName: resource?.petName || event.title.split(' - ')[0] || 'Mascota',
            time: timeStr,
            service: resource?.serviceName || resource?.reason,
          })
          // Track time range
          if (!day.firstTime || timeStr < day.firstTime) day.firstTime = timeStr
          if (!day.lastTime || timeStr > day.lastTime) day.lastTime = timeStr
          break
        case 'shift':
          day.shifts++
          break
        case 'time_off':
          day.timeOff.push({ staffName: resource?.staffName || 'Personal' })
          break
        case 'block':
          day.blocks++
          break
      }
    }

    // Sort appointments by time
    details.forEach((day) => {
      day.appointments.sort((a, b) => a.time.localeCompare(b.time))
    })

    return details
  }, [filteredEvents])

  // Custom date cell wrapper for month view - shows readable day summary
  const DateCellWrapper = useCallback(
    ({ value, children }: DateCellWrapperProps) => {
      const dateKey = value.toISOString().split('T')[0]
      const dayDetails = dailyEventDetails.get(dateKey)
      const appointmentCount = dayDetails?.appointments.length || 0

      const capacityWidth = Math.min((appointmentCount / 15) * 100, 100)
      const capacityColor = getCapacityColor(appointmentCount)

      // Get unique pet names (max 3 for display)
      const petNames = dayDetails?.appointments.map((a) => a.petName) || []
      const uniquePets = [...new Set(petNames)]
      const displayPets = uniquePets.slice(0, 3)
      const morePets = uniquePets.length - 3

      const hasEvents =
        dayDetails &&
        (dayDetails.appointments.length > 0 ||
          dayDetails.shifts > 0 ||
          dayDetails.timeOff.length > 0 ||
          dayDetails.blocks > 0)

      return (
        <div className="rbc-day-bg relative flex h-full flex-col">
          {children}

          {/* Readable day summary - only in month view */}
          {currentView === 'month' && hasEvents && (
            <div className={calendarStyles.monthDaySummary}>
              {/* Appointments section */}
              {dayDetails.appointments.length > 0 && (
                <div className={calendarStyles.appointmentsSection}>
                  <div className={calendarStyles.sectionHeader}>
                    <span className={calendarStyles.sectionIcon}>🐾</span>
                    <span className={calendarStyles.sectionCount}>{appointmentCount}</span>
                    <span className={calendarStyles.sectionLabel}>
                      {appointmentCount === 1 ? 'cita' : 'citas'}
                    </span>
                  </div>
                  {dayDetails.firstTime && (
                    <div className={calendarStyles.timeRange}>
                      {dayDetails.firstTime}
                      {dayDetails.lastTime && dayDetails.lastTime !== dayDetails.firstTime && (
                        <> - {dayDetails.lastTime}</>
                      )}
                    </div>
                  )}
                  <div className={calendarStyles.petNames}>
                    {displayPets.join(', ')}
                    {morePets > 0 && <span className={calendarStyles.morePets}>+{morePets}</span>}
                  </div>
                </div>
              )}

              {/* Staff time off */}
              {dayDetails.timeOff.length > 0 && (
                <div className={calendarStyles.timeoffSection}>
                  <span className={calendarStyles.sectionIcon}>🏖️</span>
                  <span className="section-text">
                    {dayDetails.timeOff.length === 1
                      ? dayDetails.timeOff[0].staffName
                      : `${dayDetails.timeOff.length} ausencias`}
                  </span>
                </div>
              )}

              {/* Shifts */}
              {dayDetails.shifts > 0 && (
                <div className={calendarStyles.shiftsSection}>
                  <span className={calendarStyles.sectionIcon}>👤</span>
                  <span className="section-text">
                    {dayDetails.shifts} {dayDetails.shifts === 1 ? 'turno' : 'turnos'}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Capacity indicator bar at bottom of cell */}
          {appointmentCount > 0 && (
            <div
              className={calendarStyles.capacityBar}
              title={`${appointmentCount} cita${appointmentCount !== 1 ? 's' : ''} - ${
                appointmentCount <= 3
                  ? 'Disponible'
                  : appointmentCount <= 6
                    ? 'Moderado'
                    : appointmentCount <= 10
                      ? 'Ocupado'
                      : 'Muy ocupado'
              }`}
            >
              <div
                className={calendarStyles.capacityFill}
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
    [dailyEventDetails, getCapacityColor, currentView]
  )

  // Resource view only works in day/week views
  const showResourceView =
    resourceMode && resources.length > 0 && (currentView === 'day' || currentView === 'week')

  // Calendar components - add resource header when in resource mode
  const calendarComponents = useMemo(
    (): Components<CalendarEvent, CalendarResourceData> => ({
      event: CalendarEventComponent,
      dateCellWrapper: DateCellWrapper,
      ...(showResourceView && {
        resourceHeader: ResourceHeader,
      }),
    }),
    [DateCellWrapper, showResourceView]
  )

  // Resource-specific props
  const resourceProps = showResourceView
    ? {
        resources,
        resourceAccessor,
        resourceIdAccessor,
        resourceTitleAccessor,
      }
    : {}

  return (
    <div className={`${getCalendarWrapperClass(showResourceView)} ${className}`}>
      <BigCalendar
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
        selectable={selectable}
        eventPropGetter={getEventStyle}
        titleAccessor={titleAccessor}
        tooltipAccessor={tooltipAccessor}
        formats={CALENDAR_FORMATS}
        components={calendarComponents}
        messages={CALENDAR_MESSAGES}
        min={defaultMinTime}
        max={defaultMaxTime}
        step={CALENDAR_CONFIG.step}
        timeslots={CALENDAR_CONFIG.timeslots}
        culture="es"
        popup
        showMultiDayTimes
        dayLayoutAlgorithm="no-overlap"
        {...resourceProps}
      />
    </div>
  )
}
