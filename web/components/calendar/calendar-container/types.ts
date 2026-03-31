/**
 * Calendar Container Types
 *
 * Shared type definitions for calendar container components.
 */

import type { CalendarEvent, CalendarView, CalendarEventType } from '@/lib/types/calendar'

// =============================================================================
// Entity Types
// =============================================================================

export interface Pet {
  id: string
  name: string
  species: string
  owner_name?: string
}

export interface Service {
  id: string
  name: string
  duration_minutes: number
}

export interface Staff {
  id: string
  user_id: string
  full_name: string
  job_title: string
  color_code: string
  avatar_url?: string | null
}

// =============================================================================
// Component Props
// =============================================================================

export interface CalendarContainerProps {
  initialEvents: CalendarEvent[]
  initialDate?: Date
  initialView?: CalendarView
  pets?: Pet[]
  services?: Service[]
  staff?: Staff[]
  clinicSlug: string
  /** Enable dynamic event loading when navigating beyond initial date range */
  enableDynamicLoading?: boolean
  onCreateAppointment?: (data: {
    petId: string
    serviceId?: string
    vetId?: string
    startTime: Date
    endTime: Date
    reason: string
    notes?: string
  }) => Promise<void>
  onDeleteEvent?: (event: CalendarEvent) => Promise<void>
  onEventEdit?: (event: CalendarEvent) => void
  onDateChange?: (date: Date) => void
  onViewChange?: (view: CalendarView) => void
  onRangeChange?: (range: Date[] | { start: Date; end: Date }) => void
}

export interface FilterToolbarProps {
  staff: Staff[]
  selectedStaff: string[]
  selectedEventTypes: CalendarEventType[]
  onStaffChange: (staffIds: string[]) => void
  onEventTypeChange: (types: CalendarEventType[]) => void
  /** Resource view toggle (columns by doctor) */
  resourceMode: boolean
  onResourceModeChange: (enabled: boolean) => void
  /** Current view - resource mode only works in day/week */
  currentView: CalendarView
}
