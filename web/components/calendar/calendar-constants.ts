/**
 * Calendar Constants and Messages
 * Spanish language strings and configuration constants for the calendar
 */

// =============================================================================
// SPANISH MESSAGES
// =============================================================================

export const CALENDAR_MESSAGES = {
  allDay: 'Todo el día',
  previous: 'Anterior',
  next: 'Siguiente',
  today: 'Hoy',
  month: 'Mes',
  week: 'Semana',
  day: 'Día',
  agenda: 'Agenda',
  date: 'Fecha',
  time: 'Hora',
  event: 'Evento',
  noEventsInRange: 'No hay eventos en este rango.',
  showMore: (total: number) => `+ Ver ${total} más`,
}

// =============================================================================
// EVENT STATUS COLORS
// =============================================================================

export const STATUS_COLORS = {
  cancelled: '#EF4444',
  completed: '#9CA3AF',
  in_progress: '#8B5CF6',
  confirmed: '#10B981',
} as const

export const EVENT_TYPE_COLORS = {
  time_off: '#EC4899', // pink
  shift: '#06B6D4', // cyan
  block: '#6B7280', // gray
  appointment: '#3B82F6', // blue
} as const

// =============================================================================
// WORK HOURS
// =============================================================================

export const DEFAULT_WORK_HOURS = {
  start: { hour: 7, minute: 0 },
  end: { hour: 21, minute: 0 },
} as const

// =============================================================================
// CALENDAR CONFIGURATION
// =============================================================================

export const CALENDAR_CONFIG = {
  step: 15, // 15-minute intervals
  timeslots: 4, // 4 timeslots per hour
  weekStartsOn: 1, // Monday
} as const
