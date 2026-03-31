/**
 * Calendar Styling Utilities
 * Clean card design with colored left border accent
 */

import type { CalendarEvent, CalendarEventResource } from '@/lib/types/calendar'

// =============================================================================
// STATUS COLORS (for left border accent)
// =============================================================================

const STATUS_ACCENT_COLORS = {
  confirmed: '#22C55E', // Green
  scheduled: '#3B82F6', // Blue
  in_progress: '#A855F7', // Purple
  completed: '#9CA3AF', // Gray
  cancelled: '#EF4444', // Red
  no_show: '#F59E0B', // Amber
} as const

const EVENT_TYPE_ACCENT_COLORS = {
  appointment: '#3B82F6', // Blue
  time_off: '#EC4899', // Pink
  shift: '#06B6D4', // Cyan
  block: '#6B7280', // Gray
} as const

// =============================================================================
// EVENT STYLING
// =============================================================================

export interface EventStyle {
  style: {
    backgroundColor: string
    borderColor: string
    borderRadius: string
    opacity: number
    color: string
    border: string
    borderLeft: string
    fontSize: string
    minHeight: string
    boxShadow: string
  }
}

/**
 * Get styling for calendar events - Clean white cards with colored left border
 */
export function getEventStyle(event: CalendarEvent): EventStyle {
  const resource = event.resource as CalendarEventResource | undefined

  // Determine accent color for left border
  let accentColor: string = EVENT_TYPE_ACCENT_COLORS.appointment

  // Style by event type first
  switch (event.type) {
    case 'time_off':
      accentColor = EVENT_TYPE_ACCENT_COLORS.time_off
      break
    case 'shift':
      accentColor = EVENT_TYPE_ACCENT_COLORS.shift
      break
    case 'block':
      accentColor = EVENT_TYPE_ACCENT_COLORS.block
      break
    case 'appointment':
    default:
      // For appointments, use status color
      if (resource?.status && resource.status in STATUS_ACCENT_COLORS) {
        accentColor = STATUS_ACCENT_COLORS[resource.status as keyof typeof STATUS_ACCENT_COLORS]
      }
      break
  }

  // Use staff color for left border if available (doctor identification)
  const borderAccent = resource?.staffColor || accentColor

  // Different styling for different event types
  const isBlock = event.type === 'block'
  const isTimeOff = event.type === 'time_off'

  return {
    style: {
      backgroundColor: isBlock ? '#F3F4F6' : isTimeOff ? '#FDF2F8' : '#FFFFFF',
      borderColor: '#E5E7EB',
      borderRadius: '6px',
      opacity: isBlock ? 0.8 : 1,
      color: '#1F2937',
      border: '1px solid #E5E7EB',
      borderLeft: `4px solid ${borderAccent}`,
      fontSize: '0.8125rem',
      minHeight: '40px',
      boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
    },
  }
}
