'use client'

import { useState, useEffect, useRef } from 'react'
import type { CalendarEvent, CalendarEventResource } from '@/lib/types/calendar'
import {
  EventDetailHeader,
  EventDetailContent,
  EventActionButtons,
  EventDetailFooter,
} from './event-detail'

// =============================================================================
// Component Props
// =============================================================================

interface EventDetailModalProps {
  event: CalendarEvent | null
  isOpen: boolean
  onClose: () => void
  onEdit?: (event: CalendarEvent) => void
  onDelete?: (event: CalendarEvent) => void
  onStatusChange?: (event: CalendarEvent, newStatus: string) => Promise<void>
  onCheckIn?: (event: CalendarEvent) => Promise<void>
  onSendReminder?: (event: CalendarEvent) => Promise<void>
  clinicSlug?: string
}

// =============================================================================
// Event Detail Modal Component
// =============================================================================

export function EventDetailModal({
  event,
  isOpen,
  onClose,
  onEdit,
  onDelete,
  onStatusChange,
  onCheckIn,
  onSendReminder,
  clinicSlug,
}: EventDetailModalProps) {
  const [isChangingStatus, setIsChangingStatus] = useState(false)
  const modalRef = useRef<HTMLDivElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)

  // Accessibility: Keyboard handling and focus trap
  useEffect(() => {
    if (!isOpen) return

    // Focus the close button when modal opens
    closeButtonRef.current?.focus()

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
        return
      }

      // Focus trap - keep focus within modal
      if (e.key === 'Tab' && modalRef.current) {
        const focusableElements = modalRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )
        const firstEl = focusableElements[0]
        const lastEl = focusableElements[focusableElements.length - 1]

        if (e.shiftKey && document.activeElement === firstEl) {
          e.preventDefault()
          lastEl?.focus()
        } else if (!e.shiftKey && document.activeElement === lastEl) {
          e.preventDefault()
          firstEl?.focus()
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen || !event) return null

  const resource = event.resource as CalendarEventResource | undefined

  const handleStatusChange = async (eventToUpdate: CalendarEvent, newStatus: string) => {
    if (!onStatusChange) return

    setIsChangingStatus(true)
    try {
      await onStatusChange(eventToUpdate, newStatus)
    } finally {
      setIsChangingStatus(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" role="presentation">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div
          ref={modalRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="event-modal-title"
          className="relative w-full max-w-md transform overflow-hidden rounded-lg bg-[var(--bg-default)] shadow-xl transition-all"
        >
          {/* Header */}
          <EventDetailHeader event={event} onClose={onClose} closeButtonRef={closeButtonRef} />

          {/* Content */}
          <EventDetailContent
            event={event}
            resource={resource}
            clinicSlug={clinicSlug}
            isChangingStatus={isChangingStatus}
            onStatusChange={onStatusChange ? handleStatusChange : undefined}
            onClose={onClose}
          />

          {/* Action buttons (Check-in, Send Reminder) */}
          <EventActionButtons
            event={event}
            resource={resource}
            onCheckIn={onCheckIn}
            onSendReminder={onSendReminder}
          />

          {/* Footer (Edit, Delete) */}
          <EventDetailFooter
            event={event}
            onEdit={onEdit}
            onDelete={onDelete}
            onClose={onClose}
          />
        </div>
      </div>
    </div>
  )
}
