/**
 * Calendar Filtering Utilities
 * Functions for filtering calendar events
 */

import type { CalendarEvent, CalendarEventResource, CalendarEventType } from '@/lib/types/calendar'

/**
 * Filter events by staff IDs
 */
export function filterByStaff(events: CalendarEvent[], staffFilters: string[]): CalendarEvent[] {
  if (!staffFilters || staffFilters.length === 0) {
    return events
  }

  return events.filter((event) => {
    const resource = event.resource as CalendarEventResource | undefined
    if (!resource?.staffId) return true // Show events without staff
    return staffFilters.includes(resource.staffId)
  })
}

/**
 * Filter events by event types
 */
export function filterByEventType(
  events: CalendarEvent[],
  eventTypeFilters: CalendarEventType[]
): CalendarEvent[] {
  if (!eventTypeFilters || eventTypeFilters.length === 0) {
    return events
  }

  return events.filter((event) => eventTypeFilters.includes(event.type))
}

/**
 * Apply all filters to events
 */
export function applyFilters(
  events: CalendarEvent[],
  staffFilters?: string[],
  eventTypeFilters?: CalendarEventType[]
): CalendarEvent[] {
  let filtered = events

  if (staffFilters && staffFilters.length > 0) {
    filtered = filterByStaff(filtered, staffFilters)
  }

  if (eventTypeFilters && eventTypeFilters.length > 0) {
    filtered = filterByEventType(filtered, eventTypeFilters)
  }

  return filtered
}
