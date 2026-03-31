'use client'

import * as Icons from 'lucide-react'
import { useTranslations, useLocale } from 'next-intl'

interface VaccineReaction {
  id: string
  reaction_detail: string
  occurred_at: string
}

interface VaccineReactionAlertProps {
  reactions: VaccineReaction[]
}

export function VaccineReactionAlert({ reactions }: VaccineReactionAlertProps) {
  const t = useTranslations('vaccines.reactionAlert')
  const locale = useLocale()
  const localeStr = locale === 'es' ? 'es-PY' : 'en-US'

  if (!reactions || reactions.length === 0) return null

  return (
    <div className="flex animate-pulse items-start gap-4 rounded-3xl border-2 border-[var(--status-error-border)] bg-[var(--status-error-bg)] p-6">
      <div className="rounded-2xl bg-[var(--status-error)] p-3 text-white">
        <Icons.AlertTriangle className="h-8 w-8" />
      </div>
      <div className="flex-1">
        <h3 className="text-xl font-black text-[var(--status-error-text)]">{t('title')}</h3>
        <p className="font-medium leading-relaxed text-[var(--status-error-text)]">
          {t('description')}
        </p>
        <ul className="mt-2 space-y-1">
          {reactions.map((r) => (
            <li key={r.id} className="flex items-center gap-2 font-black text-[var(--status-error-text)]">
              • {r.reaction_detail}{' '}
              <span className="text-xs font-medium opacity-50">
                ({new Date(r.occurred_at).toLocaleDateString(localeStr)})
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs font-black uppercase tracking-widest text-[var(--status-error-text)]">
          {t('warning')}
        </p>
      </div>
    </div>
  )
}
