'use client'

/**
 * Calendar Localizer
 * Date-fns localizer configuration for react-big-calendar
 */

import { dateFnsLocalizer } from 'react-big-calendar'
import { format, parse, startOfWeek, getDay } from 'date-fns'
import { es } from 'date-fns/locale'
import { CALENDAR_CONFIG } from './calendar-constants'

// =============================================================================
// LOCALE SETUP
// =============================================================================

const locales = { es }

export const calendarLocalizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: CALENDAR_CONFIG.weekStartsOn }),
  getDay,
  locales,
})
