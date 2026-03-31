'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo, useCallback } from 'react'
import {
  format,
  addDays,
  subDays,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
} from 'date-fns'
import type { CalendarEvent, CalendarView } from '@/lib/types/calendar'

/**
 * Hook for fetching calendar events with TanStack Query
 *
 * Features:
 * - Dynamic date range fetching based on current view and date
 * - Automatic refetching when date range changes
 * - Caching for previously fetched ranges
 * - Merge with initial SSR events
 */

interface UseCalendarEventsOptions {
  initialEvents?: CalendarEvent[]
  currentDate: Date
  currentView: CalendarView
  enabled?: boolean
}

interface CalendarEventsResponse {
  events: CalendarEvent[]
  meta: {
    start: string
    end: string
    count: number
  }
}

// Calculate the date range to fetch based on view
function getDateRangeForView(date: Date, view: CalendarView): { start: string; end: string } {
  let startDate: Date
  let endDate: Date

  switch (view) {
    case 'day':
      // Fetch current day plus 7 days buffer
      startDate = subDays(date, 7)
      endDate = addDays(date, 7)
      break

    case 'week':
      // Fetch current week plus 2 weeks buffer on each side
      startDate = subDays(startOfWeek(date, { weekStartsOn: 1 }), 14)
      endDate = addDays(endOfWeek(date, { weekStartsOn: 1 }), 14)
      break

    case 'month':
      // Fetch current month plus 1 month buffer on each side
      startDate = subDays(startOfMonth(date), 7)
      endDate = addDays(endOfMonth(date), 7)
      break

    case 'agenda':
      // Fetch 60 days for agenda view
      startDate = date
      endDate = addDays(date, 60)
      break

    default:
      // Default: 31 days on each side
      startDate = subDays(date, 31)
      endDate = addDays(date, 31)
  }

  return {
    start: format(startDate, 'yyyy-MM-dd'),
    end: format(endDate, 'yyyy-MM-dd'),
  }
}

// Parse events from API response (convert date strings to Date objects)
function parseEvents(events: CalendarEvent[]): CalendarEvent[] {
  return events.map((event) => ({
    ...event,
    start: new Date(event.start),
    end: new Date(event.end),
  }))
}

export function useCalendarEvents({
  initialEvents = [],
  currentDate,
  currentView,
  enabled = true,
}: UseCalendarEventsOptions) {
  const queryClient = useQueryClient()

  // Calculate date range based on current view
  const dateRange = useMemo(
    () => getDateRangeForView(currentDate, currentView),
    [currentDate, currentView]
  )

  // Query key includes the date range for proper caching
  const queryKey = ['calendar-events', dateRange.start, dateRange.end]

  // Fetch events from API
  const { data, isLoading, isError, error, refetch, isFetching } = useQuery<CalendarEventsResponse>(
    {
      queryKey,
      queryFn: async () => {
        const response = await fetch(
          `/api/calendar/events?start=${dateRange.start}&end=${dateRange.end}`
        )

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.error || 'Error al cargar eventos')
        }

        return response.json()
      },
      enabled,
      staleTime: 1000 * 60 * 2, // Consider data stale after 2 minutes
      gcTime: 1000 * 60 * 10, // Keep in cache for 10 minutes
      refetchOnWindowFocus: false, // Don't refetch on window focus
      retry: 2, // Retry failed requests twice
    }
  )

  // Merge initial events with fetched events
  // For SSR hydration, initial events take priority for the first render
  const events = useMemo(() => {
    if (!data?.events) {
      return parseEvents(initialEvents)
    }

    // Parse fetched events
    const fetchedEvents = parseEvents(data.events)

    // Create a map of fetched events by ID for efficient lookup
    const fetchedEventMap = new Map(fetchedEvents.map((e) => [e.id, e]))

    // Merge: fetched events take priority over initial events
    const mergedEvents: CalendarEvent[] = []

    // Add all fetched events
    for (const event of fetchedEvents) {
      mergedEvents.push(event)
    }

    // Add initial events that weren't in the fetched set (edge case)
    for (const event of initialEvents) {
      const parsedEvent = {
        ...event,
        start: new Date(event.start),
        end: new Date(event.end),
      }
      if (!fetchedEventMap.has(event.id)) {
        // Only add if within the current date range
        const eventDate = format(parsedEvent.start, 'yyyy-MM-dd')
        if (eventDate >= dateRange.start && eventDate <= dateRange.end) {
          mergedEvents.push(parsedEvent)
        }
      }
    }

    return mergedEvents
  }, [data?.events, initialEvents, dateRange])

  // Invalidate and refetch events
  const invalidateEvents = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['calendar-events'] })
  }, [queryClient])

  // Prefetch events for a date (useful for smoother navigation)
  const prefetchEvents = useCallback(
    async (date: Date, view: CalendarView) => {
      const range = getDateRangeForView(date, view)
      await queryClient.prefetchQuery({
        queryKey: ['calendar-events', range.start, range.end],
        queryFn: async () => {
          const response = await fetch(`/api/calendar/events?start=${range.start}&end=${range.end}`)
          if (!response.ok) throw new Error('Prefetch failed')
          return response.json()
        },
        staleTime: 1000 * 60 * 2,
      })
    },
    [queryClient]
  )

  return {
    events,
    isLoading,
    isFetching,
    isError,
    error: error as Error | null,
    refetch,
    invalidateEvents,
    prefetchEvents,
    meta: data?.meta,
  }
}
