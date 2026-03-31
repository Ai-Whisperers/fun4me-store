/**
 * Diet Info Component
 *
 * Displays pet diet category and notes.
 */

'use client'

import { Bone } from 'lucide-react'
import { useTranslations } from 'next-intl'

interface DietInfoProps {
  dietCategory?: string | null
  dietNotes?: string | null
}

export function DietInfo({ dietCategory, dietNotes }: DietInfoProps) {
  const t = useTranslations('pets.tabs.summary')

  const dietLabels: Record<string, string> = {
    balanced: t('dietBalanced'),
    wet: t('dietWet'),
    raw: t('dietRaw'),
    mixed: t('dietMixed'),
    prescription: t('dietPrescription'),
  }

  return (
    <div className="rounded-xl border border-gray-100 bg-white p-5">
      <h3 className="mb-4 flex items-center gap-2 font-bold text-[var(--text-primary)]">
        <Bone className="h-4 w-4 text-orange-500" />
        {t('diet')}
      </h3>
      {dietCategory ? (
        <div>
          <span className="mb-2 inline-block rounded-full bg-orange-100 px-3 py-1 text-xs font-bold uppercase text-orange-700">
            {dietLabels[dietCategory] || dietCategory}
          </span>
          {dietNotes && <p className="text-sm text-gray-600">{dietNotes}</p>}
        </div>
      ) : (
        <p className="text-sm text-gray-400">{t('notSpecified')}</p>
      )}
    </div>
  )
}
