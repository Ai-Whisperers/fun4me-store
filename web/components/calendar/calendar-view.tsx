'use client'

import { Calendar, dateFnsLocalizer, View, SlotInfo } from 'react-big-calendar'
import { format, parse, startOfWeek, getDay } from 'date-fns'
import { es, enUS } from 'date-fns/locale'
import { useLocale, useTranslations } from 'next-intl'
import { CalendarEvent, CalendarView as CalendarViewType, EVENT_COLORS } from '@/lib/types/calendar'
import 'react-big-calendar/lib/css/react-big-calendar.css'

const locales = { es, en: enUS }

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: (date: Date) => startOfWeek(date, { weekStartsOn: 1 }),
  getDay,
  locales,
})

interface CalendarViewProps {
  events: CalendarEvent[]
  onSelectEvent: (event: CalendarEvent) => void
  onSelectSlot: (slotInfo: SlotInfo) => void
  view: CalendarViewType
  onViewChange: (view: CalendarViewType) => void
  date: Date
  onDateChange: (date: Date) => void
  loading?: boolean
}

export function CalendarViewComponent({
  events,
  onSelectEvent,
  onSelectSlot,
  view,
  onViewChange,
  date,
  onDateChange,
  loading = false,
}: CalendarViewProps) {
  const t = useTranslations('calendar')
  const locale = useLocale()
  const dateLocale = locale === 'es' ? es : enUS

  // Calendar messages using translations
  const messages = {
    today: t('today'),
    previous: t('previous'),
    next: t('next'),
    month: t('month'),
    week: t('week'),
    day: t('day'),
    agenda: t('agenda'),
    date: t('date'),
    time: t('time'),
    event: t('event'),
    allDay: t('allDay'),
    noEventsInRange: t('noEventsInRange'),
    showMore: (total: number) => t('showMore', { total }),
  }
  // Map view type to react-big-calendar view
  const viewMap: Record<CalendarViewType, View> = {
    day: 'day',
    week: 'week',
    month: 'month',
    agenda: 'agenda',
  }

  // Custom event styling based on type/status
  const eventPropGetter = (event: CalendarEvent) => {
    let backgroundColor = event.color || EVENT_COLORS.appointment

    // Use type-specific colors if no custom color
    if (!event.color) {
      switch (event.type) {
        case 'time_off':
          backgroundColor = EVENT_COLORS.time_off
          break
        case 'block':
          backgroundColor = EVENT_COLORS.block
          break
        case 'shift':
          backgroundColor = EVENT_COLORS.shift
          break
        default: {
          // Use status color for appointments
          const eventStatus = event.resource?.status || event.status
          if (eventStatus) {
            const statusColors: Record<string, string> = {
              scheduled: EVENT_COLORS.scheduled,
              confirmed: EVENT_COLORS.confirmed,
              checked_in: EVENT_COLORS.checked_in,
              in_progress: EVENT_COLORS.in_progress,
              completed: EVENT_COLORS.completed,
              cancelled: EVENT_COLORS.cancelled,
              no_show: EVENT_COLORS.no_show,
            }
            backgroundColor = statusColors[eventStatus] || EVENT_COLORS.appointment
          }
        }
      }
    }

    return {
      style: {
        backgroundColor,
        borderRadius: '4px',
        opacity: loading ? 0.5 : 1,
        color: 'white',
        border: 'none',
        display: 'block',
      },
    }
  }

  // Custom slot styling for working hours
  const slotPropGetter = (date: Date) => {
    const hour = date.getHours()
    const isWorkingHours = hour >= 8 && hour < 18
    const isLunchBreak = hour >= 12 && hour < 14

    if (isLunchBreak) {
      return {
        style: {
          backgroundColor: 'rgba(156, 163, 175, 0.1)',
        },
      }
    }

    if (!isWorkingHours) {
      return {
        style: {
          backgroundColor: 'rgba(156, 163, 175, 0.05)',
        },
      }
    }

    return {}
  }

  // Format time for display
  const formats = {
    timeGutterFormat: (date: Date) => format(date, 'HH:mm', { locale: dateLocale }),
    eventTimeRangeFormat: ({ start, end }: { start: Date; end: Date }) =>
      `${format(start, 'HH:mm', { locale: dateLocale })} - ${format(end, 'HH:mm', { locale: dateLocale })}`,
    dayHeaderFormat: (date: Date) => format(date, 'EEEE d', { locale: dateLocale }),
    dayRangeHeaderFormat: ({ start, end }: { start: Date; end: Date }) =>
      `${format(start, 'd MMM', { locale: dateLocale })} - ${format(end, 'd MMM', { locale: dateLocale })}`,
    agendaDateFormat: (date: Date) => format(date, 'EEE d MMM', { locale: dateLocale }),
    agendaTimeFormat: (date: Date) => format(date, 'HH:mm', { locale: dateLocale }),
    agendaTimeRangeFormat: ({ start, end }: { start: Date; end: Date }) =>
      `${format(start, 'HH:mm', { locale: dateLocale })} - ${format(end, 'HH:mm', { locale: dateLocale })}`,
  }

  return (
    <div className="relative h-[700px]">
      {loading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/50">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-[var(--primary)]" />
        </div>
      )}
      <Calendar
        localizer={localizer}
        events={events}
        startAccessor="start"
        endAccessor="end"
        titleAccessor="title"
        view={viewMap[view]}
        onView={(v) => onViewChange(v as CalendarViewType)}
        date={date}
        onNavigate={onDateChange}
        onSelectEvent={onSelectEvent}
        onSelectSlot={onSelectSlot}
        selectable
        culture={locale}
        messages={messages}
        formats={formats}
        eventPropGetter={eventPropGetter}
        slotPropGetter={slotPropGetter}
        step={30}
        timeslots={2}
        min={new Date(1970, 1, 1, 7, 0, 0)}
        max={new Date(1970, 1, 1, 20, 0, 0)}
        popup
        showMultiDayTimes
      />
      <style jsx global>{`
        .rbc-calendar {
          font-family: inherit;
        }
        .rbc-toolbar {
          margin-bottom: 1rem;
          flex-wrap: wrap;
          gap: 0.5rem;
        }
        .rbc-toolbar button {
          color: var(--text-primary);
          border-color: var(--border-default);
        }
        .rbc-toolbar button:hover {
          background-color: var(--bg-secondary);
        }
        .rbc-toolbar button.rbc-active {
          background-color: var(--primary);
          color: white;
          border-color: var(--primary);
        }
        .rbc-header {
          padding: 0.5rem;
          font-weight: 600;
          color: var(--text-primary);
        }
        .rbc-today {
          background-color: rgba(var(--primary-rgb), 0.1);
        }
        .rbc-event {
          font-size: 0.75rem;
          padding: 2px 4px;
        }
        .rbc-event-label {
          font-size: 0.7rem;
        }
        .rbc-time-gutter {
          font-size: 0.75rem;
          color: var(--text-muted);
        }
        .rbc-current-time-indicator {
          background-color: var(--primary);
        }
        .rbc-off-range-bg {
          background-color: var(--bg-secondary);
        }
        .rbc-agenda-view table.rbc-agenda-table {
          border: 1px solid var(--border-default);
        }
        .rbc-agenda-view table.rbc-agenda-table tbody > tr > td {
          border-left: 1px solid var(--border-default);
        }
        .rbc-agenda-view table.rbc-agenda-table thead > tr > th {
          border-bottom: 1px solid var(--border-default);
        }
        @media (max-width: 640px) {
          .rbc-toolbar {
            flex-direction: column;
            align-items: stretch;
          }
          .rbc-toolbar-label {
            order: -1;
            margin-bottom: 0.5rem;
            text-align: center;
          }
        }
      `}</style>
    </div>
  )
}
