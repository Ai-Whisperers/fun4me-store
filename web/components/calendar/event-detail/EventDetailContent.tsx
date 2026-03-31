'use client'

import { useLocale, useTranslations } from 'next-intl'
import { format } from 'date-fns'
import { es, enUS } from 'date-fns/locale'
import Link from 'next/link'
import type { CalendarEvent, CalendarEventResource } from '@/lib/types/calendar'
import { statusConfig } from '@/lib/types/appointments'

// =============================================================================
// Types
// =============================================================================

type Locale = typeof es
type AppointmentStatusKey = `appointmentStatus.${string}`
type TimeOffStatusKey = `timeOffStatus.${string}`
type ShiftStatusKey = `shiftStatus.${string}`
type ShiftTypeKey = `shiftTypes.${string}`

interface EventDetailContentProps {
  event: CalendarEvent
  resource: CalendarEventResource | undefined
  clinicSlug?: string
  isChangingStatus: boolean
  onStatusChange?: (event: CalendarEvent, newStatus: string) => Promise<void>
  onClose: () => void
}

// =============================================================================
// Helper Functions
// =============================================================================

function formatEventTime(
  start: Date,
  end: Date,
  allDay: boolean | undefined,
  allDayLabel: string,
  dateLocale: Locale
): string {
  if (allDay) {
    return allDayLabel
  }
  const startStr = format(start, 'HH:mm', { locale: dateLocale })
  const endStr = format(end, 'HH:mm', { locale: dateLocale })
  return `${startStr} - ${endStr}`
}

function formatEventDate(start: Date, end: Date, allDay: boolean | undefined, dateLocale: Locale): string {
  const dateFormat = dateLocale === es ? "EEEE, d 'de' MMMM" : 'EEEE, MMMM d'
  const startDate = format(start, dateFormat, { locale: dateLocale })

  if (allDay && start.toDateString() !== end.toDateString()) {
    const endFormat = dateLocale === es ? "d 'de' MMMM" : 'MMMM d'
    const endDate = format(end, endFormat, { locale: dateLocale })
    return `${startDate} - ${endDate}`
  }

  return startDate
}

// =============================================================================
// Status Badge Component
// =============================================================================

interface StatusBadgeProps {
  status: string
  type: 'appointment' | 'time_off' | 'shift'
  t: ReturnType<typeof useTranslations<'calendar.eventDetail'>>
}

function StatusBadge({ status, type, t }: StatusBadgeProps) {
  let label = status
  let className = 'bg-gray-100 text-gray-800'

  if (type === 'appointment' && statusConfig[status]) {
    const key: AppointmentStatusKey = `appointmentStatus.${status}`
    label = t(key) || statusConfig[status].label
    className = statusConfig[status].className
  } else if (type === 'time_off') {
    const timeOffColors: Record<string, string> = {
      pending: 'bg-[var(--status-warning-bg)] text-[var(--status-warning-text)]',
      approved: 'bg-[var(--status-success-bg)] text-[var(--status-success-text)]',
      denied: 'bg-[var(--status-error-bg)] text-[var(--status-error-text)]',
      cancelled: 'bg-gray-100 text-gray-500',
      withdrawn: 'bg-gray-100 text-gray-500',
    }
    const key: TimeOffStatusKey = `timeOffStatus.${status}`
    label = t(key) || status
    className = timeOffColors[status] || className
  } else if (type === 'shift') {
    const shiftColors: Record<string, string> = {
      scheduled: 'bg-[var(--status-info-bg)] text-[var(--status-info-text)]',
      confirmed: 'bg-[var(--status-success-bg)] text-[var(--status-success-text)]',
      in_progress: 'bg-[var(--status-info-bg)] text-[var(--status-info-text)]',
      completed: 'bg-gray-100 text-gray-800',
      no_show: 'bg-[var(--status-warning-bg)] text-[var(--status-warning-text)]',
      cancelled: 'bg-[var(--status-error-bg)] text-[var(--status-error-text)]',
    }
    const key: ShiftStatusKey = `shiftStatus.${status}`
    label = t(key) || status
    className = shiftColors[status] || className
  }

  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${className}`}>
      {label}
    </span>
  )
}

// =============================================================================
// Detail Row Component
// =============================================================================

interface DetailRowProps {
  icon: React.ReactNode
  children: React.ReactNode
  alignTop?: boolean
}

function DetailRow({ icon, children, alignTop }: DetailRowProps) {
  return (
    <div className={`flex ${alignTop ? 'items-start' : 'items-center'} gap-3`}>
      <span className={`h-5 w-5 text-gray-400 ${alignTop ? 'mt-0.5' : ''}`}>{icon}</span>
      {children}
    </div>
  )
}

// =============================================================================
// Icons
// =============================================================================

const CalendarIcon = () => (
  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="h-5 w-5">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
    />
  </svg>
)

const CheckIcon = () => (
  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="h-5 w-5">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
    />
  </svg>
)

const UserIcon = () => (
  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="h-5 w-5">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
    />
  </svg>
)

const PetIcon = () => (
  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="h-5 w-5">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5"
    />
  </svg>
)

const GroupIcon = () => (
  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="h-5 w-5">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
    />
  </svg>
)

const ClipboardIcon = () => (
  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="h-5 w-5">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
    />
  </svg>
)

const ChatIcon = () => (
  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="h-5 w-5">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"
    />
  </svg>
)

const NoteIcon = () => (
  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="h-5 w-5">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
    />
  </svg>
)

const TagIcon = () => (
  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="h-5 w-5">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
    />
  </svg>
)

const BoxIcon = () => (
  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="h-5 w-5">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
    />
  </svg>
)

const ExternalLinkIcon = () => (
  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
    />
  </svg>
)

// =============================================================================
// Main Component
// =============================================================================

export function EventDetailContent({
  event,
  resource,
  clinicSlug,
  isChangingStatus,
  onStatusChange,
  onClose,
}: EventDetailContentProps) {
  const t = useTranslations('calendar.eventDetail')
  const tc = useTranslations('calendar')
  const locale = useLocale()
  const dateLocale = locale === 'es' ? es : enUS

  const handleStatusChange = async (newStatus: string) => {
    if (!onStatusChange || !event) return
    await onStatusChange(event, newStatus)
  }

  return (
    <div className="space-y-4 px-6 py-4">
      {/* Date and Time */}
      <DetailRow icon={<CalendarIcon />} alignTop>
        <div>
          <p className="text-sm font-medium text-gray-900">
            {formatEventDate(event.start, event.end, event.allDay, dateLocale)}
          </p>
          <p className="text-sm text-gray-500">
            {formatEventTime(event.start, event.end, event.allDay, tc('allDay'), dateLocale)}
          </p>
        </div>
      </DetailRow>

      {/* Status */}
      {resource?.status && (
        <DetailRow icon={<CheckIcon />}>
          {onStatusChange && event.type === 'appointment' ? (
            <select
              value={resource.status}
              onChange={(e) => handleStatusChange(e.target.value)}
              disabled={isChangingStatus}
              className="rounded-lg border border-gray-300 px-2 py-1 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[var(--primary)] disabled:opacity-50"
              aria-label={t('changeStatusLabel')}
            >
              <option value="scheduled">{t('appointmentStatus.scheduled')}</option>
              <option value="confirmed">{t('appointmentStatus.confirmed')}</option>
              <option value="in_progress">{t('appointmentStatus.in_progress')}</option>
              <option value="completed">{t('appointmentStatus.completed')}</option>
              <option value="cancelled">{t('appointmentStatus.cancelled')}</option>
              <option value="no_show">{t('appointmentStatus.no_show')}</option>
            </select>
          ) : (
            <StatusBadge
              status={resource.status}
              type={event.type as 'appointment' | 'time_off' | 'shift'}
              t={t}
            />
          )}
        </DetailRow>
      )}

      {/* Staff */}
      {resource?.staffName && (
        <DetailRow icon={<UserIcon />}>
          <p className="text-sm text-gray-900">{resource.staffName}</p>
        </DetailRow>
      )}

      {/* Pet (for appointments) */}
      {resource?.petName && event.type === 'appointment' && (
        <DetailRow icon={<PetIcon />}>
          <div className="flex-1">
            {clinicSlug && resource.petId ? (
              <Link
                href={`/${clinicSlug}/dashboard/pets/${resource.petId}`}
                className="text-sm font-medium text-[var(--primary)] hover:underline"
                onClick={onClose}
              >
                {resource.petName}
              </Link>
            ) : (
              <p className="text-sm text-gray-900">{resource.petName}</p>
            )}
            {resource.species && <p className="text-xs text-gray-500">{resource.species}</p>}
          </div>
          {clinicSlug && resource.petId && (
            <Link
              href={`/${clinicSlug}/dashboard/pets/${resource.petId}`}
              className="text-xs text-gray-400 hover:text-[var(--primary)]"
              onClick={onClose}
              title={t('viewPetProfile')}
            >
              <ExternalLinkIcon />
            </Link>
          )}
        </DetailRow>
      )}

      {/* Owner (for appointments) */}
      {resource?.ownerName && event.type === 'appointment' && (
        <DetailRow icon={<GroupIcon />}>
          <p className="text-sm text-gray-900">{resource.ownerName}</p>
        </DetailRow>
      )}

      {/* Service (for appointments) */}
      {resource?.serviceName && (
        <DetailRow icon={<ClipboardIcon />}>
          <p className="text-sm text-gray-900">{resource.serviceName}</p>
        </DetailRow>
      )}

      {/* Reason (for appointments) */}
      {resource?.reason && (
        <DetailRow icon={<ChatIcon />} alignTop>
          <p className="text-sm text-gray-700">{resource.reason}</p>
        </DetailRow>
      )}

      {/* Notes */}
      {resource?.notes && (
        <DetailRow icon={<NoteIcon />} alignTop>
          <p className="text-sm text-gray-700">{resource.notes}</p>
        </DetailRow>
      )}

      {/* Time off type */}
      {resource?.timeOffType && event.type === 'time_off' && (
        <DetailRow icon={<TagIcon />}>
          <p className="text-sm text-gray-900">{resource.timeOffType}</p>
        </DetailRow>
      )}

      {/* Shift type */}
      {resource?.shiftType && event.type === 'shift' && (
        <DetailRow icon={<BoxIcon />}>
          <p className="text-sm text-gray-900">
            {t(`shiftTypes.${resource.shiftType}` as ShiftTypeKey) || resource.shiftType}
          </p>
        </DetailRow>
      )}
    </div>
  )
}
