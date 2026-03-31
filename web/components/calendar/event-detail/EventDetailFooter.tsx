'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import type { CalendarEvent } from '@/lib/types/calendar'

// =============================================================================
// Types
// =============================================================================

interface EventDetailFooterProps {
  event: CalendarEvent
  onEdit?: (event: CalendarEvent) => void
  onDelete?: (event: CalendarEvent) => void
  onClose: () => void
}

// =============================================================================
// Spinner Component
// =============================================================================

function LoadingSpinner() {
  return (
    <svg
      className="h-4 w-4 animate-spin"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
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
// Main Component
// =============================================================================

export function EventDetailFooter({ event, onEdit, onDelete, onClose }: EventDetailFooterProps) {
  const t = useTranslations('calendar.eventDetail')
  const [isDeleting, setIsDeleting] = useState(false)

  // Don't render if no actions available
  if (!onEdit && !onDelete) {
    return null
  }

  const handleEdit = () => {
    onEdit?.(event)
    onClose()
  }

  const handleDelete = async () => {
    if (!confirm(t('confirmDelete'))) {
      return
    }

    setIsDeleting(true)
    try {
      onDelete?.(event)
      onClose()
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="flex justify-end gap-3 border-t border-gray-200 px-6 py-4">
      {onDelete && (
        <button
          onClick={handleDelete}
          disabled={isDeleting}
          className="inline-flex items-center gap-2 rounded-lg bg-[var(--status-error-bg)] px-4 py-2 text-sm font-medium text-[var(--status-error-text)] hover:opacity-80 disabled:opacity-50"
        >
          {isDeleting && <LoadingSpinner />}
          {isDeleting ? t('deleting') : t('delete')}
        </button>
      )}
      {onEdit && (
        <button
          onClick={handleEdit}
          className="rounded-lg px-4 py-2 text-sm font-medium text-white hover:opacity-90"
          style={{ backgroundColor: 'var(--primary, #3B82F6)' }}
        >
          {t('edit')}
        </button>
      )}
    </div>
  )
}
