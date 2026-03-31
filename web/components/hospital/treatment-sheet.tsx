'use client'

import type { JSX } from 'react'
import { useState } from 'react'
import { Check, X, Clock, Pill, Syringe, Droplet, Activity, Plus } from 'lucide-react'
import { useToast } from '@/components/ui/Toast'

interface Treatment {
  id: string
  treatment_type: string
  medication_name?: string
  dosage?: string
  route?: string
  frequency?: string
  scheduled_time: string
  administered_at?: string
  status: string
  notes?: string
  administered_by?: {
    full_name: string
  }
}

interface TreatmentSheetProps {
  hospitalizationId: string
  treatments: Treatment[]
  onTreatmentUpdate: () => void
}

export default function TreatmentSheet({
  hospitalizationId,
  treatments,
  onTreatmentUpdate,
}: TreatmentSheetProps): JSX.Element {
  const { showToast } = useToast()
  const [selectedTreatment, setSelectedTreatment] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [showAddForm, setShowAddForm] = useState(false)

  const getTreatmentIcon = (type: string) => {
    switch (type) {
      case 'medication':
        return <Pill className="h-5 w-5" />
      case 'injection':
        return <Syringe className="h-5 w-5" />
      case 'fluid_therapy':
        return <Droplet className="h-5 w-5" />
      case 'procedure':
        return <Activity className="h-5 w-5" />
      default:
        return <Clock className="h-5 w-5" />
    }
  }

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'scheduled':
        return 'bg-[var(--status-warning-bg,#fef3c7)] text-[var(--status-warning-dark,#a16207)] border-[var(--status-warning,#eab308)]/30'
      case 'administered':
        return 'bg-[var(--status-success-bg,#dcfce7)] text-[var(--status-success,#16a34a)] border-[var(--status-success,#22c55e)]/30'
      case 'skipped':
        return 'bg-[var(--status-error-bg,#fee2e2)] text-[var(--status-error,#dc2626)] border-[var(--status-error,#ef4444)]/30'
      case 'delayed':
        return 'bg-[var(--status-warning-bg,#fef3c7)] text-[var(--status-warning-dark,#a16207)] border-[var(--status-warning,#f59e0b)]/30'
      default:
        return 'bg-[var(--bg-subtle)] text-[var(--text-secondary)] border-[var(--border,#e5e7eb)]'
    }
  }

  const getStatusLabel = (status: string): string => {
    switch (status) {
      case 'scheduled':
        return 'Programado'
      case 'administered':
        return 'Administrado'
      case 'skipped':
        return 'Omitido'
      case 'delayed':
        return 'Retrasado'
      default:
        return status
    }
  }

  const handleUpdateStatus = async (treatmentId: string, newStatus: string): Promise<void> => {
    setLoading(true)
    try {
      const response = await fetch(`/api/hospitalizations/${hospitalizationId}/treatments`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          treatment_id: treatmentId,
          status: newStatus,
        }),
      })

      if (!response.ok) throw new Error('Error al actualizar tratamiento')

      onTreatmentUpdate()
      setSelectedTreatment(null)
    } catch (_error: unknown) {
      showToast({
        title: 'Error al actualizar el tratamiento',
        variant: 'error',
      })
    } finally {
      setLoading(false)
    }
  }

  const groupedTreatments = treatments.reduce(
    (acc, treatment) => {
      if (!acc[treatment.treatment_type]) {
        acc[treatment.treatment_type] = []
      }
      acc[treatment.treatment_type].push(treatment)
      return acc
    },
    {} as Record<string, Treatment[]>
  )

  const treatmentTypeLabels: Record<string, string> = {
    medication: 'Medicación',
    injection: 'Inyecciones',
    fluid_therapy: 'Fluidoterapia',
    procedure: 'Procedimientos',
    monitoring: 'Monitoreo',
  }

  const formatTime = (isoString: string): string => {
    return new Date(isoString).toLocaleTimeString('es-PY', {
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const formatDate = (isoString: string): string => {
    return new Date(isoString).toLocaleDateString('es-PY', {
      day: '2-digit',
      month: 'short',
    })
  }

  const isDue = (scheduledTime: string): boolean => {
    const now = new Date()
    const scheduled = new Date(scheduledTime)
    const hoursDiff = (scheduled.getTime() - now.getTime()) / (1000 * 60 * 60)
    return hoursDiff <= 4 && hoursDiff >= 0
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-[var(--text-primary)]">Plan de Tratamiento</h3>
        <button
          onClick={() => setShowAddForm(true)}
          className="flex items-center gap-2 rounded-lg bg-[var(--primary)] px-4 py-2 text-white hover:opacity-90"
        >
          <Plus className="h-4 w-4" />
          Agregar Tratamiento
        </button>
      </div>

      {/* Treatment Groups */}
      {Object.entries(groupedTreatments).map(([type, typeTreatments]) => (
        <div key={type} className="space-y-3">
          <div className="flex items-center gap-2">
            {getTreatmentIcon(type)}
            <h4 className="font-medium text-[var(--text-primary)]">
              {treatmentTypeLabels[type] || type}
            </h4>
            <span className="text-sm text-[var(--text-secondary)]">({typeTreatments.length})</span>
          </div>

          <div className="space-y-2">
            {typeTreatments
              .sort(
                (a, b) =>
                  new Date(a.scheduled_time).getTime() - new Date(b.scheduled_time).getTime()
              )
              .map((treatment) => (
                <div
                  key={treatment.id}
                  className={`rounded-lg border-2 bg-[var(--bg-secondary)] p-4 ${
                    isDue(treatment.scheduled_time) && treatment.status === 'scheduled'
                      ? 'border-[var(--primary)] shadow-md'
                      : 'border-[var(--border)]'
                  } `}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="mb-2 flex items-center gap-3">
                        <div className="font-medium text-[var(--text-primary)]">
                          {treatment.medication_name ||
                            treatmentTypeLabels[treatment.treatment_type]}
                        </div>
                        <span
                          className={`rounded-full border px-2 py-1 text-xs ${getStatusColor(treatment.status)}`}
                        >
                          {getStatusLabel(treatment.status)}
                        </span>
                        {isDue(treatment.scheduled_time) && treatment.status === 'scheduled' && (
                          <span className="rounded-full bg-[var(--primary)] px-2 py-1 text-xs text-white">
                            Vence pronto
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-sm text-[var(--text-secondary)]">
                        {treatment.dosage && (
                          <div>
                            <span className="font-medium">Dosis:</span> {treatment.dosage}
                          </div>
                        )}
                        {treatment.route && (
                          <div>
                            <span className="font-medium">Vía:</span> {treatment.route}
                          </div>
                        )}
                        {treatment.frequency && (
                          <div>
                            <span className="font-medium">Frecuencia:</span> {treatment.frequency}
                          </div>
                        )}
                        <div>
                          <span className="font-medium">Programado:</span>{' '}
                          {formatDate(treatment.scheduled_time)}{' '}
                          {formatTime(treatment.scheduled_time)}
                        </div>
                      </div>

                      {treatment.administered_at && (
                        <div className="mt-2 text-sm text-[var(--text-secondary)]">
                          <span className="font-medium">Administrado:</span>{' '}
                          {formatDate(treatment.administered_at)}{' '}
                          {formatTime(treatment.administered_at)}
                          {treatment.administered_by &&
                            ` por ${treatment.administered_by.full_name}`}
                        </div>
                      )}

                      {treatment.notes && (
                        <div className="mt-2 text-sm italic text-[var(--text-secondary)]">
                          {treatment.notes}
                        </div>
                      )}
                    </div>

                    {treatment.status === 'scheduled' && (
                      <div className="ml-4 flex gap-2">
                        <button
                          onClick={() => handleUpdateStatus(treatment.id, 'administered')}
                          disabled={loading}
                          className="rounded-lg bg-green-100 p-2 text-green-700 hover:bg-green-200 disabled:opacity-50"
                          title="Marcar como administrado"
                        >
                          <Check className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleUpdateStatus(treatment.id, 'skipped')}
                          disabled={loading}
                          className="rounded-lg bg-red-100 p-2 text-red-700 hover:bg-red-200 disabled:opacity-50"
                          title="Marcar como omitido"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
          </div>
        </div>
      ))}

      {treatments.length === 0 && (
        <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] py-12 text-center">
          <Activity className="mx-auto mb-4 h-12 w-12 text-[var(--text-secondary)]" />
          <p className="text-[var(--text-secondary)]">No hay tratamientos programados</p>
          <button
            onClick={() => setShowAddForm(true)}
            className="mt-4 text-[var(--primary)] hover:underline"
          >
            Agregar primer tratamiento
          </button>
        </div>
      )}
    </div>
  )
}
