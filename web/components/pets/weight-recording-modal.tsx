'use client'

import { useState } from 'react'
import { X, Weight, Loader2 } from 'lucide-react'
import { useTranslations } from 'next-intl'

interface WeightRecordingModalProps {
  petId: string
  petName: string
  currentWeight?: number | null
  isOpen: boolean
  onClose: () => void
  onSuccess: (newWeight: number) => void
}

export function WeightRecordingModal({
  petId,
  petName,
  currentWeight,
  isOpen,
  onClose,
  onSuccess,
}: WeightRecordingModalProps) {
  const t = useTranslations('pets.weightRecording')
  const [weight, setWeight] = useState<string>(currentWeight?.toString() || '')
  const [notes, setNotes] = useState<string>('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!isOpen) return null

  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault()
    setError(null)

    const weightValue = parseFloat(weight)
    if (isNaN(weightValue) || weightValue <= 0) {
      setError(t('invalidWeight'))
      return
    }

    if (weightValue > 500) {
      setError(t('maxWeightError'))
      return
    }

    setIsSubmitting(true)

    try {
      const response = await fetch(`/api/pets/${petId}/weight`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          weight_kg: weightValue,
          notes: notes.trim() || undefined,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || t('saveError'))
      }

      onSuccess(weightValue)
      onClose()
      // Reset form
      setWeight('')
      setNotes('')
      // Force page refresh to update server data
      window.location.reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : t('saveError'))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="mx-4 w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--primary-light)]">
              <Weight className="h-5 w-5 text-[var(--primary)]" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[var(--text-primary)]">{t('title')}</h2>
              <p className="text-sm text-gray-500">{petName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Current weight reference */}
          {currentWeight && (
            <div className="rounded-lg bg-gray-50 p-3">
              <p className="text-sm text-gray-500">
                {t('currentWeight')} <span className="font-semibold text-gray-700">{currentWeight} kg</span>
              </p>
            </div>
          )}

          {/* Weight input */}
          <div>
            <label
              htmlFor="weight"
              className="mb-1.5 block text-sm font-medium text-[var(--text-primary)]"
            >
              {t('newWeight')}
            </label>
            <div className="relative">
              <input
                type="number"
                id="weight"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                step="0.01"
                min="0.01"
                max="500"
                placeholder={t('weightPlaceholder')}
                className="w-full rounded-lg border border-gray-200 px-4 py-3 pr-12 text-lg font-semibold transition-colors focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
                autoFocus
                required
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">kg</span>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label
              htmlFor="notes"
              className="mb-1.5 block text-sm font-medium text-[var(--text-primary)]"
            >
              {t('notes')}
            </label>
            <textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t('notesPlaceholder')}
              rows={2}
              maxLength={500}
              className="w-full resize-none rounded-lg border border-gray-200 px-4 py-3 text-sm transition-colors focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
            />
          </div>

          {/* Error message */}
          {error && (
            <div className="rounded-lg bg-[var(--status-error-bg)] p-3 text-sm text-[var(--status-error)]">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 rounded-lg border border-gray-200 py-3 font-medium text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-50"
            >
              {t('cancel')}
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !weight}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-[var(--primary)] py-3 font-semibold text-white transition-colors hover:bg-[var(--primary-dark)] disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t('saving')}
                </>
              ) : (
                t('save')
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
