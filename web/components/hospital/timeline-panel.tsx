'use client'

import type { JSX } from 'react'

interface TimelineEvent {
  type: 'vital' | 'treatment' | 'feeding' | 'transfer' | 'visit'
  date: string
  data: unknown
}

interface TimelinePanelProps {
  hospitalization: {
    vitals: Array<{
      id: string
      recorded_at: string
      temperature?: number
      heart_rate?: number
      respiratory_rate?: number
      [key: string]: unknown
    }>
    treatments: Array<{
      id: string
      administered_at?: string
      medication_name?: string
      treatment_type: string
      dosage?: string
      [key: string]: unknown
    }>
    feedings: Array<{
      id: string
      feeding_time: string
      food_type: string
      amount_offered: number
      amount_consumed: number
      [key: string]: unknown
    }>
    transfers: Array<{
      id: string
      transfer_date: string
      from_kennel: {
        kennel_number: string
        [key: string]: unknown
      }
      to_kennel: {
        kennel_number: string
        [key: string]: unknown
      }
      [key: string]: unknown
    }>
    visits: Array<{
      id: string
      visit_start: string
      visitor_name: string
      [key: string]: unknown
    }>
  }
}

export function TimelinePanel({ hospitalization }: TimelinePanelProps): JSX.Element {
  const formatDateTime = (isoString: string): string => {
    return new Date(isoString).toLocaleString('es-PY', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const events: TimelineEvent[] = [
    ...(hospitalization.vitals || []).map((v) => ({
      type: 'vital' as const,
      date: v.recorded_at,
      data: v,
    })),
    ...(hospitalization.treatments || [])
      .filter((t) => t.administered_at)
      // Non-null assertion safe: filter ensures administered_at exists
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      .map((t) => ({ type: 'treatment' as const, date: t.administered_at!, data: t })),
    ...(hospitalization.feedings || []).map((f) => ({
      type: 'feeding' as const,
      date: f.feeding_time,
      data: f,
    })),
    ...(hospitalization.transfers || []).map((t) => ({
      type: 'transfer' as const,
      date: t.transfer_date,
      data: t,
    })),
    ...(hospitalization.visits || []).map((v) => ({
      type: 'visit' as const,
      date: v.visit_start,
      data: v,
    })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-[var(--text-primary)]">Línea de Tiempo</h3>

      <div className="space-y-3">
        {events.map((event, index) => (
          <div key={index} className="flex gap-4">
            <div className="flex flex-col items-center">
              <div
                className={`h-3 w-3 rounded-full ${
                  event.type === 'vital'
                    ? 'bg-blue-500'
                    : event.type === 'treatment'
                      ? 'bg-green-500'
                      : event.type === 'feeding'
                        ? 'bg-orange-500'
                        : event.type === 'transfer'
                          ? 'bg-purple-500'
                          : 'bg-gray-500'
                }`}
              />
              {index < events.length - 1 && (
                <div className="mt-2 h-full w-0.5 bg-[var(--border)]" />
              )}
            </div>

            <div className="flex-1 pb-6">
              <div className="mb-1 text-sm text-[var(--text-secondary)]">
                {formatDateTime(event.date)}
              </div>
              <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-default)] p-3">
                {event.type === 'vital' && (
                  <div>
                    <div className="mb-1 font-medium text-[var(--text-primary)]">
                      Signos Vitales Registrados
                    </div>
                    <div className="text-sm text-[var(--text-secondary)]">
                      {(event.data as (typeof hospitalization.vitals)[0]).temperature &&
                        `T: ${(event.data as (typeof hospitalization.vitals)[0]).temperature}°C `}
                      {(event.data as (typeof hospitalization.vitals)[0]).heart_rate &&
                        `FC: ${(event.data as (typeof hospitalization.vitals)[0]).heart_rate} lpm `}
                      {(event.data as (typeof hospitalization.vitals)[0]).respiratory_rate &&
                        `FR: ${(event.data as (typeof hospitalization.vitals)[0]).respiratory_rate} rpm`}
                    </div>
                  </div>
                )}

                {event.type === 'treatment' && (
                  <div>
                    <div className="mb-1 font-medium text-[var(--text-primary)]">
                      Tratamiento Administrado
                    </div>
                    <div className="text-sm text-[var(--text-secondary)]">
                      {(event.data as (typeof hospitalization.treatments)[0]).medication_name ||
                        (event.data as (typeof hospitalization.treatments)[0]).treatment_type}
                      {(event.data as (typeof hospitalization.treatments)[0]).dosage &&
                        ` - ${(event.data as (typeof hospitalization.treatments)[0]).dosage}`}
                    </div>
                  </div>
                )}

                {event.type === 'feeding' && (
                  <div>
                    <div className="mb-1 font-medium text-[var(--text-primary)]">Alimentación</div>
                    <div className="text-sm text-[var(--text-secondary)]">
                      {(event.data as (typeof hospitalization.feedings)[0]).food_type} -{' '}
                      {(event.data as (typeof hospitalization.feedings)[0]).amount_consumed}g de{' '}
                      {(event.data as (typeof hospitalization.feedings)[0]).amount_offered}g
                    </div>
                  </div>
                )}

                {event.type === 'transfer' && (
                  <div>
                    <div className="mb-1 font-medium text-[var(--text-primary)]">
                      Transferencia de Jaula
                    </div>
                    <div className="text-sm text-[var(--text-secondary)]">
                      De Jaula{' '}
                      {
                        (event.data as (typeof hospitalization.transfers)[0]).from_kennel
                          .kennel_number
                      }{' '}
                      a Jaula{' '}
                      {
                        (event.data as (typeof hospitalization.transfers)[0]).to_kennel
                          .kennel_number
                      }
                    </div>
                  </div>
                )}

                {event.type === 'visit' && (
                  <div>
                    <div className="mb-1 font-medium text-[var(--text-primary)]">Visita</div>
                    <div className="text-sm text-[var(--text-secondary)]">
                      {(event.data as (typeof hospitalization.visits)[0]).visitor_name}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
