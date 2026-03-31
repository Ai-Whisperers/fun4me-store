'use client'

import Link from 'next/link'
import * as Icons from 'lucide-react'
import { useTranslations, useLocale } from 'next-intl'
import type { Vaccine } from '@/lib/types/database'

interface PetSidebarInfoProps {
  pet: {
    id: string
    temperament?: string
    allergies?: string
    existing_conditions?: string
    diet_category?: string
    diet_notes?: string
  }
  vaccines: Vaccine[]
  clinic: string
}

export function PetSidebarInfo({ pet, vaccines, clinic }: PetSidebarInfoProps) {
  const t = useTranslations('pets.sidebar')
  const locale = useLocale()
  const localeStr = locale === 'es' ? 'es-PY' : 'en-US'

  return (
    <div className="space-y-6">
      {/* Bio & Health Card */}
      <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
        <h3 className="mb-4 flex items-center gap-2 text-lg font-bold text-[var(--text-primary)]">
          <Icons.Info className="h-5 w-5 text-[var(--status-info)]" /> {t('bioHealthTitle')}
        </h3>
        <div className="space-y-4">
          {pet.temperament && (
            <div>
              <span className="text-xs font-bold uppercase text-gray-400">{t('temperament')}</span>
              <p className="font-medium capitalize text-gray-700">{pet.temperament}</p>
            </div>
          )}

          {pet.allergies && (
            <div>
              <span className="text-xs font-bold uppercase text-[var(--status-error)]">{t('allergies')}</span>
              <p className="inline-block rounded-lg bg-[var(--status-error-bg)] px-2 py-1 font-medium text-[var(--status-error-text)]">
                {pet.allergies}
              </p>
            </div>
          )}

          {pet.existing_conditions && (
            <div>
              <span className="text-xs font-bold uppercase text-gray-400">{t('conditions')}</span>
              <p className="text-sm italic text-gray-600">{pet.existing_conditions}</p>
            </div>
          )}

          {!pet.temperament && !pet.allergies && !pet.existing_conditions && (
            <p className="text-sm text-gray-400">{t('noAdditionalData')}</p>
          )}
        </div>
      </div>

      {/* Vaccines Card */}
      <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-lg font-bold text-[var(--text-primary)]">
            <Icons.Syringe className="h-5 w-5 text-purple-500" /> {t('vaccinesTitle')}
          </h3>
          <Link
            href={`/${clinic}/portal/pets/${pet.id}/vaccines/new`}
            className="text-sm font-bold text-[var(--primary)] hover:underline"
          >
            {t('addVaccine')}
          </Link>
        </div>

        <div className="space-y-3">
          {vaccines.map((v: Vaccine) => (
            <div
              key={v.id}
              className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50 p-3"
            >
              <div>
                <p className="text-sm font-bold text-[var(--text-primary)]">{v.name}</p>
                <p className="text-xs text-gray-500">
                  {v.administered_date
                    ? new Date(v.administered_date).toLocaleDateString(localeStr)
                    : t('noDate')}
                </p>
              </div>
              {v.status === 'verified' ? (
                <Icons.CheckCircle2 className="h-4 w-4 text-[var(--status-success)]" />
              ) : (
                <Icons.Clock className="h-4 w-4 text-[var(--status-warning)]" />
              )}
            </div>
          ))}
          {vaccines.length === 0 && <p className="text-sm text-gray-400">{t('noVaccines')}</p>}
        </div>
      </div>

      {/* Diet Card */}
      <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
        <h3 className="mb-4 flex items-center gap-2 text-lg font-bold text-[var(--text-primary)]">
          <Icons.Bone className="h-5 w-5 text-orange-500" /> {t('dietTitle')}
        </h3>
        {pet.diet_category ? (
          <div>
            <span className="mb-2 inline-block rounded-full bg-orange-100 px-3 py-1 text-xs font-bold uppercase text-orange-700">
              {pet.diet_category}
            </span>
            <p className="text-sm text-gray-600">{pet.diet_notes || t('noDetails')}</p>
          </div>
        ) : (
          <p className="text-sm text-gray-400">{t('notSpecified')}</p>
        )}
      </div>
    </div>
  )
}
