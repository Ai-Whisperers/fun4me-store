'use client'

import { useEffect, useCallback, useRef } from 'react'
import type { CalendarView } from '@/lib/types/calendar'

/**
 * Calendar Keyboard Shortcuts Hook
 *
 * Shortcuts:
 * - T: Go to Today
 * - ←/→: Navigate prev/next
 * - D: Day view
 * - W: Week view
 * - M: Month view
 * - A: Agenda view
 * - N: New appointment (optional)
 * - Escape: Close modal
 *
 * Shortcuts are disabled when:
 * - Input/textarea is focused
 * - Modal is open
 */

interface UseCalendarShortcutsOptions {
  onNavigate: (direction: 'today' | 'prev' | 'next') => void
  onViewChange: (view: CalendarView) => void
  onNewAppointment?: () => void
  onCloseModal?: () => void
  isModalOpen?: boolean
  enabled?: boolean
}

export function useCalendarShortcuts({
  onNavigate,
  onViewChange,
  onNewAppointment,
  onCloseModal,
  isModalOpen = false,
  enabled = true,
}: UseCalendarShortcutsOptions): void {
  // Use ref to avoid stale closures
  const handlersRef = useRef({
    onNavigate,
    onViewChange,
    onNewAppointment,
    onCloseModal,
  })

  // Update ref on each render
  handlersRef.current = {
    onNavigate,
    onViewChange,
    onNewAppointment,
    onCloseModal,
  }

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      // Check if shortcuts should be disabled
      if (!enabled) return

      // Check if typing in an input field
      const target = event.target as HTMLElement
      const tagName = target.tagName.toLowerCase()
      const isEditable = target.isContentEditable

      if (tagName === 'input' || tagName === 'textarea' || tagName === 'select' || isEditable) {
        // Only allow Escape to close modal when in input
        if (event.key === 'Escape' && isModalOpen) {
          handlersRef.current.onCloseModal?.()
          event.preventDefault()
        }
        return
      }

      // Handle modal-specific shortcuts
      if (isModalOpen) {
        if (event.key === 'Escape') {
          handlersRef.current.onCloseModal?.()
          event.preventDefault()
        }
        // Don't process other shortcuts when modal is open
        return
      }

      // Ignore if modifier keys are pressed (except for arrow keys)
      const hasModifier = event.ctrlKey || event.metaKey || event.altKey
      if (hasModifier && event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') {
        return
      }

      switch (event.key.toLowerCase()) {
        // Navigation
        case 't':
          handlersRef.current.onNavigate('today')
          event.preventDefault()
          break

        case 'arrowleft':
          handlersRef.current.onNavigate('prev')
          event.preventDefault()
          break

        case 'arrowright':
          handlersRef.current.onNavigate('next')
          event.preventDefault()
          break

        // View changes
        case 'd':
          handlersRef.current.onViewChange('day')
          event.preventDefault()
          break

        case 'w':
          handlersRef.current.onViewChange('week')
          event.preventDefault()
          break

        case 'm':
          handlersRef.current.onViewChange('month')
          event.preventDefault()
          break

        case 'a':
          handlersRef.current.onViewChange('agenda')
          event.preventDefault()
          break

        // New appointment
        case 'n':
          if (handlersRef.current.onNewAppointment) {
            handlersRef.current.onNewAppointment()
            event.preventDefault()
          }
          break
      }
    },
    [enabled, isModalOpen]
  )

  useEffect(() => {
    if (!enabled) return

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [handleKeyDown, enabled])
}

/**
 * Keyboard shortcuts display info for help modal
 */
export const CALENDAR_SHORTCUTS = [
  { key: 'T', description: 'Ir a hoy' },
  { key: '←', description: 'Anterior' },
  { key: '→', description: 'Siguiente' },
  { key: 'D', description: 'Vista de día' },
  { key: 'W', description: 'Vista de semana' },
  { key: 'M', description: 'Vista de mes' },
  { key: 'A', description: 'Vista de agenda' },
  { key: 'N', description: 'Nueva cita' },
  { key: 'Esc', description: 'Cerrar modal' },
] as const
