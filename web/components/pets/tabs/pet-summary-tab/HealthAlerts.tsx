/**
 * Health Alerts Component
 *
 * Displays allergies, conditions, and overdue vaccines alerts.
 */

'use client'

import { AlertTriangle } from 'lucide-react'
import { useTranslations } from 'next-intl'
import type { Vaccine, MissingVaccine } from './types'

interface HealthAlertsProps {
  allergies: string[]
  conditions: string[]
  overdueVaccines: Vaccine[]
  missingMandatoryVaccines: MissingVaccine[]
}

export function HealthAlerts({
  allergies,
  conditions,
  overdueVaccines,
  missingMandatoryVaccines,
}: HealthAlertsProps) {
  const t = useTranslations('pets.tabs.summary')

  // Don't render if no alerts
  if (
    allergies.length === 0 &&
    conditions.length === 0 &&
    overdueVaccines.length === 0 &&
    missingMandatoryVaccines.length === 0
  ) {
    return null
  }

  return (
    <div className="rounded-xl border border-[var(--status-warning-border)] bg-[var(--status-warning-bg)] p-4">
      <div className="mb-3 flex items-center gap-2 font-bold text-[var(--status-warning-text)]">
        <AlertTriangle className="h-5 w-5" />
        {t('healthAlerts')}
      </div>
      <div className="space-y-2">
        {allergies.length > 0 && (
          <div className="flex items-start gap-2">
            <span className="rounded bg-[var(--status-error-bg)] px-2 py-0.5 text-xs font-medium text-[var(--status-error-text)]">
              {t('allergiesLabel')}
            </span>
            <span className="text-sm text-[var(--status-warning-text)]">{allergies.join(', ')}</span>
          </div>
        )}
        {conditions.length > 0 && (
          <div className="flex items-start gap-2">
            <span className="rounded bg-[var(--status-warning-bg)] px-2 py-0.5 text-xs font-medium text-[var(--status-warning-text)]">
              {t('conditionsLabel')}
            </span>
            <span className="text-sm text-[var(--status-warning-text)]">{conditions.join(', ')}</span>
          </div>
        )}
        {overdueVaccines.length > 0 && (
          <div className="flex items-start gap-2">
            <span className="rounded bg-[var(--status-error-bg)] px-2 py-0.5 text-xs font-medium text-[var(--status-error-text)]">
              {t('overdueVaccines')}
            </span>
            <span className="text-sm text-[var(--status-warning-text)]">
              {overdueVaccines.map((v) => v.name).join(', ')}
            </span>
          </div>
        )}
        {missingMandatoryVaccines.length > 0 && (
          <div className="flex items-start gap-2">
            <span className="rounded bg-[var(--status-error-bg)] px-2 py-0.5 text-xs font-medium text-[var(--status-error-text)]">
              {t('missingMandatory')}
            </span>
            <span className="text-sm text-[var(--status-warning-text)]">
              {missingMandatoryVaccines.map((v) => v.vaccine_name).join(', ')}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
