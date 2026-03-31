'use client'

import type { JSX } from 'react'
import { useState } from 'react'
import { Save } from 'lucide-react'
import { useToast } from '@/components/ui/Toast'

interface Feeding {
  id: string
  feeding_time: string
  food_type: string
  amount_offered: number
  amount_consumed: number
  appetite_level: string
  notes?: string
  fed_by?: {
    full_name: string
  }
}

interface FeedingForm {
  food_type: string
  amount_offered: string
  amount_consumed: string
  appetite_level: string
  notes: string
}

interface FeedingsPanelProps {
  hospitalizationId: string
  feedings: Feeding[]
  onFeedingSaved: () => void
}

export function FeedingsPanel({
  hospitalizationId,
  feedings,
  onFeedingSaved,
}: FeedingsPanelProps): JSX.Element {
  const { showToast } = useToast()
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<FeedingForm>({
    food_type: '',
    amount_offered: '',
    amount_consumed: '',
    appetite_level: 'normal',
    notes: '',
  })

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()
    setSaving(true)

    try {
      const response = await fetch(`/api/hospitalizations/${hospitalizationId}/feedings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          food_type: form.food_type,
          amount_offered: parseFloat(form.amount_offered),
          amount_consumed: parseFloat(form.amount_consumed),
          appetite_level: form.appetite_level,
          notes: form.notes || null,
        }),
      })

      if (!response.ok) throw new Error('Error al guardar alimentación')

      setShowForm(false)
      setForm({
        food_type: '',
        amount_offered: '',
        amount_consumed: '',
        appetite_level: 'normal',
        notes: '',
      })
      onFeedingSaved()
    } catch (error) {
      console.error('Error saving feeding:', error)
      showToast({
        title: 'Error al guardar alimentación',
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
        <h3 className="text-lg font-semibold text-[var(--text-primary)]">
          Registro de Alimentación
        </h3>
        <button
          onClick={() => setShowForm(!showForm)}
          className="rounded-lg bg-[var(--primary)] px-4 py-2 text-white hover:opacity-90"
        >
          {showForm ? 'Cancelar' : 'Registrar Alimentación'}
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="rounded-lg border border-[var(--border)] bg-[var(--bg-default)] p-4"
        >
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-[var(--text-secondary)]">
                Tipo de Alimento *
              </label>
              <input
                type="text"
                required
                value={form.food_type}
                onChange={(e) => setForm({ ...form, food_type: e.target.value })}
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-default)] px-3 py-2 text-[var(--text-primary)]"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-[var(--text-secondary)]">
                Apetito
              </label>
              <select
                value={form.appetite_level}
                onChange={(e) => setForm({ ...form, appetite_level: e.target.value })}
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-default)] px-3 py-2 text-[var(--text-primary)]"
              >
                <option value="excellent">Excelente</option>
                <option value="good">Bueno</option>
                <option value="normal">Normal</option>
                <option value="poor">Pobre</option>
                <option value="none">Ninguno</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-[var(--text-secondary)]">
                Cantidad Ofrecida (g) *
              </label>
              <input
                type="number"
                step="0.1"
                required
                value={form.amount_offered}
                onChange={(e) => setForm({ ...form, amount_offered: e.target.value })}
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-default)] px-3 py-2 text-[var(--text-primary)]"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-[var(--text-secondary)]">
                Cantidad Consumida (g)
              </label>
              <input
                type="number"
                step="0.1"
                value={form.amount_consumed}
                onChange={(e) => setForm({ ...form, amount_consumed: e.target.value })}
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-default)] px-3 py-2 text-[var(--text-primary)]"
              />
            </div>

            <div className="md:col-span-2">
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
            {saving ? 'Guardando...' : 'Guardar Registro'}
          </button>
        </form>
      )}

      <div className="space-y-3">
        {feedings?.length === 0 ? (
          <p className="py-8 text-center text-[var(--text-secondary)]">
            No hay registros de alimentación
          </p>
        ) : (
          feedings?.map((feeding) => (
            <div
              key={feeding.id}
              className="rounded-lg border border-[var(--border)] bg-[var(--bg-default)] p-4"
            >
              <div className="mb-2 flex items-start justify-between">
                <div className="text-sm text-[var(--text-secondary)]">
                  {formatDateTime(feeding.feeding_time)}
                  {feeding.fed_by && ` - ${feeding.fed_by.full_name}`}
                </div>
                <span
                  className={`rounded-full px-2 py-1 text-xs ${
                    feeding.appetite_level === 'excellent' || feeding.appetite_level === 'good'
                      ? 'bg-green-100 text-green-800'
                      : feeding.appetite_level === 'poor' || feeding.appetite_level === 'none'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-yellow-100 text-yellow-800'
                  }`}
                >
                  {feeding.appetite_level}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-[var(--text-secondary)]">Alimento:</span>{' '}
                  <span className="text-[var(--text-primary)]">{feeding.food_type}</span>
                </div>
                <div>
                  <span className="text-[var(--text-secondary)]">Ofrecido:</span>{' '}
                  <span className="text-[var(--text-primary)]">{feeding.amount_offered}g</span>
                </div>
                <div>
                  <span className="text-[var(--text-secondary)]">Consumido:</span>{' '}
                  <span className="text-[var(--text-primary)]">{feeding.amount_consumed}g</span>
                </div>
                <div>
                  <span className="text-[var(--text-secondary)]">Porcentaje:</span>{' '}
                  <span className="text-[var(--text-primary)]">
                    {Math.round((feeding.amount_consumed / feeding.amount_offered) * 100)}%
                  </span>
                </div>
              </div>

              {feeding.notes && (
                <p className="mt-2 text-sm italic text-[var(--text-secondary)]">{feeding.notes}</p>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
