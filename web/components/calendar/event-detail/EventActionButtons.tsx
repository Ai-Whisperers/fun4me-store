'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import type { CalendarEvent, CalendarEventResource } from '@/lib/types/calendar'

// =============================================================================
// Types
// =============================================================================

interface EventActionButtonsProps {
  event: CalendarEvent
  resource: CalendarEventResource | undefined
  onCheckIn?: (event: CalendarEvent) => Promise<void>
  onSendReminder?: (event: CalendarEvent) => Promise<void>
}

// =============================================================================
// Spinner Component
// =============================================================================

function LoadingSpinner() {
  return (
    <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden="true">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  )
}

// =============================================================================
// Icons
// =============================================================================

const CheckInIcon = () => (
  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
    />
  </svg>
)

const ReminderIcon = () => (
  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
    />
  </svg>
)

// =============================================================================
// Main Component
// =============================================================================

export function EventActionButtons({
  event,
  resource,
  onCheckIn,
  onSendReminder,
}: EventActionButtonsProps) {
  const t = useTranslations('calendar.eventDetail')
  const [isCheckingIn, setIsCheckingIn] = useState(false)
  const [isSendingReminder, setIsSendingReminder] = useState(false)

  // Only show for appointments with relevant callbacks
  if (event.type !== 'appointment' || (!onCheckIn && !onSendReminder)) {
    return null
  }

  const handleCheckIn = async () => {
    if (!onCheckIn || !event) return

    setIsCheckingIn(true)
    try {
      await onCheckIn(event)
    } finally {
      setIsCheckingIn(false)
    }
  }

  const handleSendReminder = async () => {
    if (!onSendReminder || !event) return

    setIsSendingReminder(true)
    try {
      await onSendReminder(event)
    } finally {
      setIsSendingReminder(false)
    }
  }

  const showCheckIn = onCheckIn && resource?.status === 'confirmed'
  const showReminder = onSendReminder && ['scheduled', 'confirmed'].includes(resource?.status || '')

  if (!showCheckIn && !showReminder) {
    return null
  }

  return (
    <div className="flex gap-2 border-t border-gray-200 bg-gray-50 px-6 py-3">
      {showCheckIn && (
        <button
          onClick={handleCheckIn}
          disabled={isCheckingIn}
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-[var(--status-success-bg)] px-3 py-2 text-sm font-medium text-[var(--status-success-text)] hover:opacity-80 disabled:opacity-50"
        >
          {isCheckingIn ? <LoadingSpinner /> : <CheckInIcon />}
          {t('checkIn')}
        </button>
      )}
      {showReminder && (
        <button
          onClick={handleSendReminder}
          disabled={isSendingReminder}
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-[var(--status-info-bg)] px-3 py-2 text-sm font-medium text-[var(--status-info-text)] hover:opacity-80 disabled:opacity-50"
        >
          {isSendingReminder ? <LoadingSpinner /> : <ReminderIcon />}
          {t('sendReminder')}
        </button>
      )}
    </div>
  )
}
