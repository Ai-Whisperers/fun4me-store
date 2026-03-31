'use client'

import type { JSX } from 'react'
import { useState } from 'react'
import { Save, Heart, Thermometer, Activity, Weight } from 'lucide-react'
import { useToast } from '@/components/ui/Toast'

interface Vital {
  id: string
  recorded_at: string
  temperature?: number
  heart_rate?: number
  respiratory_rate?: number
  weight?: number
  blood_pressure_systolic?: number
  blood_pressure_diastolic?: number
  mucous_membrane_color?: string
  capillary_refill_time?: string
  pain_score?: number
  notes?: string
  recorded_by?: {
    full_name: string
  }
}

interface VitalsForm {
  temperature: string
  heart_rate: string
  respiratory_rate: string
  weight: string
  blood_pressure_systolic: string
  blood_pressure_diastolic: string
  mucous_membrane_color: string
  capillary_refill_time: string
  pain_score: string
  notes: string
}

interface VitalsPanelProps {
  hospitalizationId: string
  vitals: Vital[]
  onVitalsSaved: () => void
}

export function VitalsPanel({
  hospitalizationId,
  vitals,
  onVitalsSaved,
}: VitalsPanelProps): JSX.Element {
  const { showToast } = useToast()
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<VitalsForm>({
    temperature: '',
    heart_rate: '',
    respiratory_rate: '',
    weight: '',
    blood_pressure_systolic: '',
    blood_pressure_diastolic: '',
    mucous_membrane_color: '',
    capillary_refill_time: '',
    pain_score: '',
    notes: '',
  })

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()
    setSaving(true)

    try {
      const vitalsData: Record<string, unknown> = {}
      if (form.temperature) vitalsData.temperature = parseFloat(form.temperature)
      if (form.heart_rate) vitalsData.heart_rate = parseInt(form.heart_rate, 10)
      if (form.respiratory_rate) vitalsData.respiratory_rate = parseInt(form.respiratory_rate, 10)
      if (form.weight) vitalsData.weight = parseFloat(form.weight)
      if (form.blood_pressure_systolic)
        vitalsData.blood_pressure_systolic = parseInt(form.blood_pressure_systolic, 10)
      if (form.blood_pressure_diastolic)
        vitalsData.blood_pressure_diastolic = parseInt(form.blood_pressure_diastolic, 10)
      if (form.mucous_membrane_color) vitalsData.mucous_membrane_color = form.mucous_membrane_color
      if (form.capillary_refill_time) vitalsData.capillary_refill_time = form.capillary_refill_time
      if (form.pain_score) vitalsData.pain_score = parseInt(form.pain_score, 10)
      if (form.notes) vitalsData.notes = form.notes

      const response = await fetch(`/api/hospitalizations/${hospitalizationId}/vitals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(vitalsData),
      })

      if (!response.ok) throw new Error('Error al guardar signos vitales')

      setShowForm(false)
      setForm({
        temperature: '',
        heart_rate: '',
        respiratory_rate: '',
        weight: '',
        blood_pressure_systolic: '',
        blood_pressure_diastolic: '',
        mucous_membrane_color: '',
        capillary_refill_time: '',
        pain_score: '',
        notes: '',
      })
      onVitalsSaved()
    } catch (error) {
      console.error('Error saving vitals:', error)
      showToast({
        title: 'Error al guardar signos vitales',
        variant: 'error',
      })
    } finally {
      setSaving(false)
    }
  }

  const formatDateTime = (isoString: string): string => {
    return new Date(isoString).toLocaleString('es-PY', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-[var(--text-primary)]">Signos Vitales</h3>
        <button
          onClick={() => setShowForm(!showForm)}
          className="rounded-lg bg-[var(--primary)] px-4 py-2 text-white hover:opacity-90"
        >
          {showForm ? 'Cancelar' : 'Registrar Vitales'}
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="rounded-lg border border-[var(--border)] bg-[var(--bg-default)] p-4"
        >
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-[var(--text-secondary)]">
                Temperatura (°C)
              </label>
              <input
                type="number"
                step="0.1"
                value={form.temperature}
                onChange={(e) => setForm({ ...form, temperature: e.target.value })}
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-default)] px-3 py-2 text-[var(--text-primary)]"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-[var(--text-secondary)]">
                FC (lpm)
              </label>
              <input
                type="number"
                value={form.heart_rate}
                onChange={(e) => setForm({ ...form, heart_rate: e.target.value })}
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-default)] px-3 py-2 text-[var(--text-primary)]"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-[var(--text-secondary)]">
                FR (rpm)
              </label>
              <input
                type="number"
                value={form.respiratory_rate}
                onChange={(e) => setForm({ ...form, respiratory_rate: e.target.value })}
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-default)] px-3 py-2 text-[var(--text-primary)]"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-[var(--text-secondary)]">
                Peso (kg)
              </label>
              <input
                type="number"
                step="0.1"
                value={form.weight}
                onChange={(e) => setForm({ ...form, weight: e.target.value })}
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-default)] px-3 py-2 text-[var(--text-primary)]"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-[var(--text-secondary)]">
                PA Sistólica
              </label>
              <input
                type="number"
                value={form.blood_pressure_systolic}
                onChange={(e) => setForm({ ...form, blood_pressure_systolic: e.target.value })}
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-default)] px-3 py-2 text-[var(--text-primary)]"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-[var(--text-secondary)]">
                PA Diastólica
              </label>
              <input
                type="number"
                value={form.blood_pressure_diastolic}
                onChange={(e) => setForm({ ...form, blood_pressure_diastolic: e.target.value })}
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-default)] px-3 py-2 text-[var(--text-primary)]"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-[var(--text-secondary)]">
                Color de Mucosas
              </label>
              <select
                value={form.mucous_membrane_color}
                onChange={(e) => setForm({ ...form, mucous_membrane_color: e.target.value })}
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-default)] px-3 py-2 text-[var(--text-primary)]"
              >
                <option value="">Seleccionar</option>
                <option value="pink">Rosado</option>
                <option value="pale">Pálido</option>
                <option value="cyanotic">Cianótico</option>
                <option value="icteric">Ictérico</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-[var(--text-secondary)]">
                TLLC
              </label>
              <input
                type="text"
                placeholder="ej: <2s"
                value={form.capillary_refill_time}
                onChange={(e) => setForm({ ...form, capillary_refill_time: e.target.value })}
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-default)] px-3 py-2 text-[var(--text-primary)]"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-[var(--text-secondary)]">
                Dolor (0-10)
              </label>
              <input
                type="number"
                min="0"
                max="10"
                value={form.pain_score}
                onChange={(e) => setForm({ ...form, pain_score: e.target.value })}
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-default)] px-3 py-2 text-[var(--text-primary)]"
              />
            </div>

            <div className="md:col-span-3">
              <label className="mb-1 block text-sm font-medium text-[var(--text-secondary)]">
                Notas
              </label>
              <textarea
                rows={2}
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-default)] px-3 py-2 text-[var(--text-primary)]"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="mt-4 flex items-center gap-2 rounded-lg bg-[var(--primary)] px-6 py-2 text-white hover:opacity-90 disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            {saving ? 'Guardando...' : 'Guardar Signos Vitales'}
          </button>
        </form>
      )}

      <div className="space-y-3">
        {vitals?.length === 0 ? (
          <p className="py-8 text-center text-[var(--text-secondary)]">
            No hay registros de signos vitales
          </p>
        ) : (
          vitals?.map((vital) => (
            <div
              key={vital.id}
              className="rounded-lg border border-[var(--border)] bg-[var(--bg-default)] p-4"
            >
              <div className="mb-3 flex items-start justify-between">
                <div className="text-sm text-[var(--text-secondary)]">
                  {formatDateTime(vital.recorded_at)}
                  {vital.recorded_by && ` - ${vital.recorded_by.full_name}`}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm md:grid-cols-4">
                {vital.temperature && (
                  <div className="flex items-center gap-2">
                    <Thermometer className="h-4 w-4 text-[var(--text-secondary)]" />
                    <span className="text-[var(--text-primary)]">{vital.temperature}°C</span>
                  </div>
                )}
                {vital.heart_rate && (
                  <div className="flex items-center gap-2">
                    <Heart className="h-4 w-4 text-[var(--text-secondary)]" />
                    <span className="text-[var(--text-primary)]">{vital.heart_rate} lpm</span>
                  </div>
                )}
                {vital.respiratory_rate && (
                  <div className="flex items-center gap-2">
                    <Activity className="h-4 w-4 text-[var(--text-secondary)]" />
                    <span className="text-[var(--text-primary)]">{vital.respiratory_rate} rpm</span>
                  </div>
                )}
                {vital.weight && (
                  <div className="flex items-center gap-2">
                    <Weight className="h-4 w-4 text-[var(--text-secondary)]" />
                    <span className="text-[var(--text-primary)]">{vital.weight} kg</span>
                  </div>
                )}
                {vital.blood_pressure_systolic && vital.blood_pressure_diastolic && (
                  <div>
                    <span className="text-[var(--text-secondary)]">PA:</span>{' '}
                    <span className="text-[var(--text-primary)]">
                      {vital.blood_pressure_systolic}/{vital.blood_pressure_diastolic}
                    </span>
                  </div>
                )}
                {vital.pain_score !== null && vital.pain_score !== undefined && (
                  <div>
                    <span className="text-[var(--text-secondary)]">Dolor:</span>{' '}
                    <span className="text-[var(--text-primary)]">{vital.pain_score}/10</span>
                  </div>
                )}
              </div>

              {vital.notes && (
                <p className="mt-2 text-sm italic text-[var(--text-secondary)]">{vital.notes}</p>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
