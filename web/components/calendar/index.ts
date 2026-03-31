// Calendar Components
export { Calendar, type CalendarResource } from './calendar'
export { CalendarDnD } from './calendar-dnd'
export { CalendarContainer } from './calendar-container'
export { EventDetailModal } from './event-detail-modal'
export { QuickAddModal } from './quick-add-modal'
export { ScheduleEditor } from './schedule-editor'
export { TimeOffRequestForm } from './time-off-request-form'

// Sub-components
export { CalendarEventComponent } from './CalendarEvent'
export { CalendarStyles } from './CalendarStyles'
export { CalendarSkeleton } from './calendar-skeleton'
export { ResourceHeader } from './calendar-resource-header'

// Hooks
export { useCalendarState } from './useCalendarState'

// Utilities
export { calendarLocalizer } from './calendar-localizer'
export { getEventStyle } from './calendar-styling'
export { applyFilters, filterByStaff, filterByEventType } from './calendar-filters'

// Constants
export {
  CALENDAR_MESSAGES,
  CALENDAR_CONFIG,
  STATUS_COLORS,
  EVENT_TYPE_COLORS,
  DEFAULT_WORK_HOURS,
} from './calendar-constants'
