/**
 * Vaccines Sidebar Component
 *
 * Displays upcoming and missing vaccines with registration CTA.
 */

'use client'

import Link from 'next/link'
import { Syringe } from 'lucide-react'
import { useTranslations, useLocale } from 'next-intl'
import type { Vaccine, MissingVaccine } from './types'

interface VaccinesSidebarProps {
  petId: string
  clinic: string
  upcomingVaccines: Vaccine[]
  missingMandatoryVaccines: MissingVaccine[]
}

export function VaccinesSidebar({
  petId,
  clinic,
  upcomingVaccines,
  missingMandatoryVaccines,
}: VaccinesSidebarProps) {
  const t = useTranslations('pets.tabs.summary')
  const locale = useLocale()
  const localeStr = locale === 'es' ? 'es-PY' : 'en-US'

  return (
    <div className="rounded-xl border border-gray-100 bg-white p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="flex items-center gap-2 font-bold text-[var(--text-primary)]">
          <Syringe className="h-4 w-4 text-purple-500" />
          {t('upcomingVaccines')}
        </h3>
        <Link
          href={`/${clinic}/portal/pets/${petId}?tab=vaccines`}
          className="text-xs font-medium text-[var(--primary)] hover:underline"
        >
          {t('viewAll')}
        </Link>
      </div>

      {/* Missing Mandatory Vaccines (overdue first, then due) */}
      {missingMandatoryVaccines.length > 0 && (
        <div className="mb-3 space-y-2">
          {missingMandatoryVaccines
            .sort((a, b) => {
              // Overdue first, then due
              if (a.status === 'overdue' && b.status !== 'overdue') return -1
              if (a.status !== 'overdue' && b.status === 'overdue') return 1
              return 0
            })
            .slice(0, 5)
            .map((vaccine) => (
              <div
                key={vaccine.vaccine_code}
                className={`flex items-center justify-between rounded-lg p-2 ${
                  vaccine.status === 'overdue'
                    ? 'bg-[var(--status-error-bg)]'
                    : 'bg-[var(--status-warning-bg)]'
                }`}
              >
                <span className="text-sm font-medium">{vaccine.vaccine_name}</span>
                <span
                  className={`text-xs font-medium ${
                    vaccine.status === 'overdue'
                      ? 'text-[var(--status-error)]'
                      : 'text-[var(--status-warning)]'
                  }`}
                >
                  {vaccine.status === 'overdue' ? t('overdue') : t('pending')}
                </span>
              </div>
            ))}
        </div>
      )}

      {/* Scheduled Vaccines (already recorded with next_due_date) */}
      {upcomingVaccines.length > 0 && (
        <div className="space-y-2">
          {upcomingVaccines.map((vaccine) => (
            <div
              key={vaccine.id}
              className="flex items-center justify-between rounded-lg bg-gray-50 p-2"
            >
              <span className="text-sm font-medium">{vaccine.name}</span>
              <span className="text-xs text-gray-500">
                {vaccine.next_due_date &&
                  new Date(vaccine.next_due_date).toLocaleDateString(localeStr, {
                    day: 'numeric',
                    month: 'short',
                  })}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Empty state only if no missing vaccines AND no upcoming vaccines */}
      {missingMandatoryVaccines.length === 0 && upcomingVaccines.length === 0 && (
        <p className="text-sm text-gray-400">{t('noScheduledVaccines')}</p>
      )}

      {/* Add vaccine CTA */}
      {missingMandatoryVaccines.length > 0 && (
        <Link
          href={`/${clinic}/portal/pets/${petId}/vaccines/new`}
          className="mt-3 flex items-center justify-center gap-2 rounded-lg bg-[var(--primary)] py-2 text-sm font-semibold text-white transition-colors hover:bg-[var(--primary-dark)]"
        >
          <Syringe className="h-4 w-4" />
          {t('registerVaccine')}
        </Link>
      )}
    </div>
  )
}
