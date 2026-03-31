'use client'

/**
 * Calendar State Management Hook
 * Custom hook for managing calendar state and handlers
 */

import { useState, useCallback, useMemo } from 'react'
import type { CalendarView, CalendarEvent, CalendarEventType } from '@/lib/types/calendar'
import { applyFilters } from './calendar-filters'
import { DEFAULT_WORK_HOURS } from './calendar-constants'

// =============================================================================
// HOOK PROPS
// =============================================================================

interface UseCalendarStateProps {
  events: CalendarEvent[]
  initialView?: CalendarView
  initialDate?: Date
  staffFilters?: string[]
  eventTypeFilters?: CalendarEventType[]
  minTime?: Date
  maxTime?: Date
  onNavigate?: (date: Date) => void
  onViewChange?: (view: CalendarView) => void
  onSelectEvent?: (event: CalendarEvent) => void
  onSelectSlot?: (slotInfo: { start: Date; end: Date; action: string }) => void
  onRangeChange?: (range: Date[] | { start: Date; end: Date }) => void
  selectable?: boolean
}

// =============================================================================
// HOOK
// =============================================================================

export function useCalendarState({
  events,
  initialView = 'week',
  initialDate = new Date(),
  staffFilters,
  eventTypeFilters,
  minTime,
  maxTime,
  onNavigate,
  onViewChange,
  onSelectEvent,
  onSelectSlot,
  onRangeChange,
  selectable = true,
}: UseCalendarStateProps) {
  // State
  const [currentView, setCurrentView] = useState<CalendarView>(initialView)
  const [currentDate, setCurrentDate] = useState<Date>(initialDate)

  // Filter events based on staff and event type filters
  const filteredEvents = useMemo(() => {
    return applyFilters(events, staffFilters, eventTypeFilters)
  }, [events, staffFilters, eventTypeFilters])

  // Handlers
  const handleNavigate = useCallback(
    (newDate: Date) => {
      setCurrentDate(newDate)
      onNavigate?.(newDate)
    },
    [onNavigate]
  )

  const handleViewChange = useCallback(
    (newView: CalendarView) => {
      setCurrentView(newView)
      onViewChange?.(newView)
    },
    [onViewChange]
  )

  const handleSelectEvent = useCallback(
    (event: CalendarEvent) => {
      onSelectEvent?.(event)
    },
    [onSelectEvent]
  )

  const handleSelectSlot = useCallback(
    (slotInfo: { start: Date; end: Date; action: string }) => {
      if (selectable) {
        onSelectSlot?.(slotInfo)
      }
    },
    [selectable, onSelectSlot]
  )

  const handleRangeChange = useCallback(
    (range: Date[] | { start: Date; end: Date }) => {
      onRangeChange?.(range)
    },
    [onRangeChange]
  )

  // Default work hours
  const defaultMinTime = useMemo(() => {
    const min = minTime || new Date()
    if (!minTime) {
      min.setHours(DEFAULT_WORK_HOURS.start.hour, DEFAULT_WORK_HOURS.start.minute, 0, 0)
    }
    return min
  }, [minTime])

  const defaultMaxTime = useMemo(() => {
    const max = maxTime || new Date()
    if (!maxTime) {
      max.setHours(DEFAULT_WORK_HOURS.end.hour, DEFAULT_WORK_HOURS.end.minute, 0, 0)
    }
    return max
  }, [maxTime])

  return {
    currentView,
    currentDate,
    filteredEvents,
    defaultMinTime,
    defaultMaxTime,
    handlers: {
      handleNavigate,
      handleViewChange,
      handleSelectEvent,
      handleSelectSlot,
      handleRangeChange,
    },
  }
}
