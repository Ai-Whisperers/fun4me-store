'use client'

import { useState, useEffect } from 'react'
import { Lightbulb, ChevronDown, ChevronUp, Calendar, AlertTriangle, Clock, X } from 'lucide-react'

interface DailyBriefingProps {
  clinic: string
  todayAppointments: number
  waitingCount: number
  alertCount?: number
}

export function DailyBriefing({
  clinic: _clinic,
  todayAppointments,
  waitingCount,
  alertCount = 0,
}: DailyBriefingProps): React.ReactElement | null {
  const [isExpanded, setIsExpanded] = useState(true)
  const [isDismissed, setIsDismissed] = useState(false)

  // Check localStorage for dismissal
  useEffect(() => {
    const dismissedKey = `daily-briefing-dismissed-${new Date().toISOString().split('T')[0]}`
    const wasDismissed = localStorage.getItem(dismissedKey) === 'true'
    setIsDismissed(wasDismissed)
  }, [])

  const handleDismiss = (): void => {
    const dismissedKey = `daily-briefing-dismissed-${new Date().toISOString().split('T')[0]}`
    localStorage.setItem(dismissedKey, 'true')
    setIsDismissed(true)
  }

  if (isDismissed) return null

  // Calculate estimated work time (assuming 30 min average per appointment)
  const estimatedMinutes = todayAppointments * 30
  const estimatedHours = Math.floor(estimatedMinutes / 60)
  const remainingMinutes = estimatedMinutes % 60

  // Build summary message
  let summaryMessage = `Tienes ${todayAppointments} cita${todayAppointments !== 1 ? 's' : ''} programada${todayAppointments !== 1 ? 's' : ''} para hoy`
  if (waitingCount > 0) {
    summaryMessage += ` y ${waitingCount} paciente${waitingCount !== 1 ? 's' : ''} en espera`
  }
  summaryMessage += '.'

  return (
    <div className="rounded-2xl border border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50">
      {/* Header - always visible */}
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-amber-100">
            <Lightbulb className="h-5 w-5 text-amber-600" />
          </div>
          <div>
            <h3 className="font-bold text-[var(--text-primary)]">Resumen del Día</h3>
            <p className="text-sm text-[var(--text-secondary)]">{summaryMessage}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="rounded-lg p-2 text-amber-600 transition-colors hover:bg-amber-100"
            aria-label={isExpanded ? 'Colapsar' : 'Expandir'}
          >
            {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
          </button>
          <button
            onClick={handleDismiss}
            className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
            aria-label="Cerrar por hoy"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Expanded content */}
      {isExpanded && (
        <div className="border-t border-amber-200 px-4 pb-4 pt-3">
          <div className="grid gap-3 sm:grid-cols-3">
            {/* Appointments stat */}
            <div className="flex items-center gap-3 rounded-xl bg-white/60 p-3">
              <Calendar className="h-5 w-5 text-amber-600" />
              <div>
                <p className="text-lg font-bold text-[var(--text-primary)]">{todayAppointments}</p>
                <p className="text-xs text-[var(--text-muted)]">Citas programadas</p>
              </div>
            </div>

            {/* Estimated time */}
            <div className="flex items-center gap-3 rounded-xl bg-white/60 p-3">
              <Clock className="h-5 w-5 text-amber-600" />
              <div>
                <p className="text-lg font-bold text-[var(--text-primary)]">
                  {estimatedHours > 0 ? `${estimatedHours}h ` : ''}
                  {remainingMinutes}min
                </p>
                <p className="text-xs text-[var(--text-muted)]">Tiempo estimado</p>
              </div>
            </div>

            {/* Alerts */}
            <div className="flex items-center gap-3 rounded-xl bg-white/60 p-3">
              <AlertTriangle
                className={`h-5 w-5 ${alertCount > 0 ? 'text-red-500' : 'text-gray-400'}`}
              />
              <div>
                <p className="text-lg font-bold text-[var(--text-primary)]">{alertCount}</p>
                <p className="text-xs text-[var(--text-muted)]">Alertas pendientes</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
