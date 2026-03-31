'use client'

import { useState, useMemo } from 'react'
import * as Icons from 'lucide-react'
import { useTranslations } from 'next-intl'

interface QoLAssessmentProps {
  onComplete: (score: number, notes: string) => void
}

// Critical thresholds for individual categories
const CRITICAL_THRESHOLD = 2 // Score <= 2 in any category is critical
const POOR_TOTAL_THRESHOLD = 35

export function QoLAssessment({ onComplete }: QoLAssessmentProps) {
  const t = useTranslations('clinical.qolAssessment')
  const [scores, setScores] = useState({
    hurt: 5,
    hunger: 5,
    hydration: 5,
    hygiene: 5,
    happiness: 5,
    mobility: 5,
    goodDays: 5,
  })

  const categoryIds = ['hurt', 'hunger', 'hydration', 'hygiene', 'happiness', 'mobility', 'goodDays'] as const
  type CategoryId = typeof categoryIds[number]

  const categories = categoryIds.map((id) => ({
    id,
    label: t(`categories.${id}.label`),
    desc: t(`categories.${id}.desc`),
    critical: ['hurt', 'hunger', 'hydration'].includes(id),
  }))

  const total = Object.values(scores).reduce((a, b) => a + b, 0)

  // Check for critical individual scores
  const criticalWarnings = useMemo(() => {
    const warnings: string[] = []
    categories.forEach((cat) => {
      const score = scores[cat.id as keyof typeof scores]
      if (score <= CRITICAL_THRESHOLD && cat.critical) {
        warnings.push(t('criticalWarningScore', { category: cat.label, score }))
      }
    })
    return warnings
  }, [scores, categories, t])

  return (
    <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-xl">
      <h3 className="mb-2 text-xl font-black text-gray-900">{t('title')}</h3>
      <p className="mb-4 text-sm text-gray-500">
        {t('subtitle')}
      </p>

      {/* Important disclaimer */}
      <div className="mb-6 rounded-xl border border-[var(--status-warning-border)] bg-[var(--status-warning-bg)] p-4">
        <div className="flex gap-3">
          <Icons.AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-[var(--status-warning)]" />
          <div className="text-sm text-[var(--status-warning-text)]">
            <p className="mb-1 font-bold">{t('disclaimerTitle')}</p>
            <p className="text-[var(--status-warning-text)]">
              {t('disclaimerText')}
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {categories.map((cat) => (
          <div key={cat.id}>
            <div className="mb-1 flex items-center justify-between">
              <label className="text-sm font-bold text-gray-700">{cat.label}</label>
              <span className="text-lg font-black text-[var(--primary)]">
                {scores[cat.id as keyof typeof scores]}
              </span>
            </div>
            <p className="mb-2 text-xs text-gray-400">{cat.desc}</p>
            <input
              type="range"
              min="0"
              max="10"
              value={scores[cat.id as keyof typeof scores]}
              onChange={(e) => setScores({ ...scores, [cat.id]: parseInt(e.target.value) })}
              className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-gray-100 accent-[var(--primary)]"
            />
          </div>
        ))}
      </div>

      {/* Critical warnings */}
      {criticalWarnings.length > 0 && (
        <div className="mt-6 rounded-xl border border-[var(--status-error-border)] bg-[var(--status-error-bg)] p-4">
          <div className="flex gap-3">
            <Icons.AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-[var(--status-error)]" />
            <div>
              <p className="mb-2 font-bold text-[var(--status-error-text)]">{t('criticalWarningsTitle')}</p>
              <ul className="space-y-1 text-sm text-[var(--status-error-text)]">
                {criticalWarnings.map((warning, idx) => (
                  <li key={idx}>• {warning}</li>
                ))}
              </ul>
              <p className="mt-2 text-sm font-medium text-[var(--status-error)]">
                {t('criticalWarningNote')}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="mt-8 rounded-2xl bg-gray-900 p-6 text-white">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest opacity-50">{t('totalScore')}</p>
            <p className="text-4xl font-black">{total} / 70</p>
          </div>
          <div className="text-right">
            <p
              className={`text-xl font-black uppercase tracking-tighter ${total > POOR_TOTAL_THRESHOLD ? 'text-[var(--status-success)]' : 'text-[var(--status-error)]'}`}
            >
              {total > POOR_TOTAL_THRESHOLD ? t('acceptableQuality') : t('compromisedQuality')}
            </p>
          </div>
        </div>

        {/* Score interpretation guide */}
        <div className="mt-4 border-t border-gray-700 pt-4 text-xs opacity-70">
          <p className="mb-1">
            <span className="text-[var(--status-success)]">{t('interpretationGuide.acceptable')}</span>
          </p>
          <p className="mb-1">
            <span className="text-[var(--status-warning)]">{t('interpretationGuide.compromised')}</span>
          </p>
          <p>
            <span className="text-[var(--status-error)]">{t('interpretationGuide.poor')}</span>
          </p>
        </div>
      </div>

      <button
        onClick={() => {
          const criticalNote =
            criticalWarnings.length > 0 ? ` ALERTA: ${criticalWarnings.join('; ')}.` : ''
          const quality = total > POOR_TOTAL_THRESHOLD ? t('acceptableNote') : t('compromisedNote')
          onComplete(
            total,
            t('resultNote', { total, criticalNote, quality })
          )
        }}
        className="mt-6 w-full rounded-xl bg-[var(--primary)] py-4 font-bold text-white shadow-lg transition-all hover:shadow-xl"
      >
        {t('submitButton')}
      </button>
    </div>
  )
}
