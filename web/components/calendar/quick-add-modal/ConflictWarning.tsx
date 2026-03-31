/**
 * Conflict Warning Component
 *
 * Displays schedule conflicts and availability check status.
 */

'use client'

import { format } from 'date-fns'
import type { ConflictInfo } from './types'

interface ConflictWarningProps {
  conflicts: ConflictInfo[]
  isCheckingAvailability: boolean
}

export function ConflictWarning({ conflicts, isCheckingAvailability }: ConflictWarningProps) {
  return (
    <>
      {/* Conflict warning */}
      {conflicts.length > 0 && (
        <div
          role="alert"
          aria-live="polite"
          className="rounded-lg border border-[var(--status-warning-border)] bg-[var(--status-warning-bg)] p-3"
        >
          <div className="flex items-start gap-2">
            <svg
              className="mt-0.5 h-5 w-5 shrink-0 text-[var(--status-warning)]"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <div>
              <p className="text-sm font-medium text-[var(--status-warning-text)]">
                {conflicts.length} cita{conflicts.length !== 1 ? 's' : ''} en conflicto
              </p>
              <ul className="mt-1 space-y-0.5 text-xs text-[var(--status-warning-text)]">
                {conflicts.slice(0, 3).map((conflict) => (
                  <li key={conflict.id}>
                    {conflict.pet_name} ({format(new Date(conflict.start_time), 'HH:mm')} -{' '}
                    {format(new Date(conflict.end_time), 'HH:mm')})
                  </li>
                ))}
                {conflicts.length > 3 && (
                  <li className="text-[var(--status-warning)]">... y {conflicts.length - 3} más</li>
                )}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Availability check indicator */}
      {isCheckingAvailability && (
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <svg className="h-3 w-3 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          Verificando disponibilidad...
        </div>
      )}
    </>
  )
}
