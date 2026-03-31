'use client'

import { useTranslations } from 'next-intl'
import type { CalendarEvent } from '@/lib/types/calendar'

// =============================================================================
// Types
// =============================================================================

type EventTypeKey = `eventTypes.${string}`

interface EventDetailHeaderProps {
  event: CalendarEvent
  onClose: () => void
  closeButtonRef: React.RefObject<HTMLButtonElement | null>
}

// =============================================================================
// Event Type Icons
// =============================================================================

function EventTypeIcon({ type }: { type: string }) {
  switch (type) {
    case 'appointment':
      return (
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
      )
    case 'shift':
      return (
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      )
    case 'time_off':
      return (
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
          />
        </svg>
      )
    default:
      return (
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      )
  }
}

// =============================================================================
// Main Component
// =============================================================================

export function EventDetailHeader({ event, onClose, closeButtonRef }: EventDetailHeaderProps) {
  const t = useTranslations('calendar.eventDetail')

  const getTypeLabel = () => {
    const typeKey: EventTypeKey = `eventTypes.${event.type}`
    return t(typeKey) || t('eventTypes.event')
  }

  return (
    <div className="border-b border-[var(--border)] px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-lg text-white"
            style={{ backgroundColor: event.color || '#3B82F6' }}
          >
            <EventTypeIcon type={event.type} />
          </div>
          <div>
            <p className="text-sm text-[var(--text-muted)]">{getTypeLabel()}</p>
            <h3 id="event-modal-title" className="text-lg font-semibold text-[var(--text-primary)]">
              {event.title}
            </h3>
          </div>
        </div>
        <button
          ref={closeButtonRef}
          onClick={onClose}
          aria-label={t('close')}
          className="rounded-lg p-2 text-[var(--text-muted)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text-secondary)]"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>
    </div>
  )
}
