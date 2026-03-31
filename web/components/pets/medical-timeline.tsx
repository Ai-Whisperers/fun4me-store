'use client'

import Link from 'next/link'
import * as Icons from 'lucide-react'
import { useTranslations, useLocale } from 'next-intl'
import { ErrorBoundary } from '@/components/error/error-boundary'

interface TimelineItem {
  id: string
  created_at: string
  timelineType: 'record' | 'prescription'
  title: string
  type?: string
  diagnosis?: string
  vitals?: {
    weight?: number
    temp?: number
    hr?: number
    rr?: number
  }
  drugs?: Array<{
    name: string
    dose: string
    instructions: string
  }>
  notes?: string
  attachments?: string[]
}

interface MedicalTimelineProps {
  timelineItems: TimelineItem[]
  clinic: string
  petId: string
  isStaff: boolean
}

export function MedicalTimeline({ timelineItems, clinic, petId, isStaff }: MedicalTimelineProps) {
  const t = useTranslations('pets.timeline')
  const locale = useLocale()
  const localeStr = locale === 'es' ? 'es-ES' : 'en-US'

  return (
    <div className="space-y-6 md:col-span-2">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-2xl font-black text-[var(--text-primary)]">
          <Icons.Activity className="h-6 w-6 text-[var(--primary)]" />
          {t('title')}
        </h2>
        {isStaff && (
          <div className="flex gap-2">
            <Link
              href={`/${clinic}/portal/prescriptions/new?pet_id=${petId}`}
              className="flex items-center gap-2 rounded-xl bg-purple-100 px-4 py-2 text-sm font-bold text-purple-700 transition-colors hover:bg-purple-200"
            >
              <Icons.Pill className="h-4 w-4" /> {t('newPrescription')}
            </Link>
            <Link
              href={`/${clinic}/portal/pets/${petId}/records/new`}
              className="flex items-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-2 text-sm font-bold text-white shadow-md hover:shadow-lg"
            >
              <Icons.Plus className="h-4 w-4" /> {t('newConsultation')}
            </Link>
          </div>
        )}
      </div>

      <div className="relative ml-4 space-y-8 border-l-2 border-dashed border-gray-200 pb-8">
        {timelineItems.length === 0 ? (
          <div className="ml-8 rounded-2xl border border-gray-100 bg-gray-50 p-6 text-center">
            <p className="italic text-gray-500">{t('noRecords')}</p>
          </div>
        ) : (
          <ErrorBoundary>
            {timelineItems.map((item: TimelineItem) => (
            <div key={item.id} className="relative ml-8">
              {/* Timeline Node */}
              <div
                className={`absolute -left-[41px] top-0 h-5 w-5 rounded-full border-4 border-white shadow-sm ${
                  item.timelineType === 'prescription'
                    ? 'bg-[var(--primary)]'
                    : item.type === 'surgery'
                      ? 'bg-[var(--status-error)]'
                      : item.type === 'consultation'
                        ? 'bg-[var(--status-info)]'
                        : 'bg-[var(--status-success)]'
                }`}
              ></div>

              <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm transition-shadow hover:shadow-md">
                <div className="mb-2 flex items-start justify-between">
                  <h3 className="flex items-center gap-2 text-lg font-bold text-[var(--text-primary)]">
                    {item.timelineType === 'prescription' && (
                      <Icons.Pill className="h-5 w-5 text-purple-500" />
                    )}
                    {item.title}
                  </h3>
                  <span
                    className={`rounded px-2 py-1 text-xs font-bold uppercase tracking-wider ${
                      item.timelineType === 'prescription'
                        ? 'bg-purple-50 text-purple-600'
                        : 'bg-gray-100 text-gray-400'
                    }`}
                  >
                    {item.timelineType === 'prescription' ? t('prescription') : item.type}
                  </span>
                </div>

                <p className="mb-4 flex items-center gap-2 text-sm text-gray-500">
                  <Icons.Calendar className="h-4 w-4" />
                  {new Date(item.created_at).toLocaleDateString(localeStr, {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>

                {item.diagnosis && (
                  <div className="mb-3">
                    <span className="text-xs font-bold uppercase text-gray-400">{t('diagnosis')}</span>
                    <p className="font-medium text-gray-800">{item.diagnosis}</p>
                  </div>
                )}

                {/* Vitals Display (Records only) */}
                {item.timelineType === 'record' &&
                  item.vitals &&
                  (item.vitals.weight || item.vitals.temp || item.vitals.hr || item.vitals.rr) && (
                    <div className="mb-4 rounded-xl border border-blue-100/50 bg-blue-50/50 p-3">
                      <span className="mb-2 block text-xs font-bold uppercase text-blue-400">
                        {t('vitals')}
                      </span>
                      <div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
                        {item.vitals.weight && (
                          <div>
                            <span className="text-xs text-gray-400">{t('weight')}</span>{' '}
                            <p className="font-bold text-gray-700">{item.vitals.weight} kg</p>
                          </div>
                        )}
                        {item.vitals.temp && (
                          <div>
                            <span className="text-xs text-gray-400">{t('temp')}</span>{' '}
                            <p className="font-bold text-gray-700">{item.vitals.temp}°C</p>
                          </div>
                        )}
                        {item.vitals.hr && (
                          <div>
                            <span className="text-xs text-gray-400">{t('heartRate')}</span>{' '}
                            <p className="font-bold text-gray-700">{item.vitals.hr} lpm</p>
                          </div>
                        )}
                        {item.vitals.rr && (
                          <div>
                            <span className="text-xs text-gray-400">{t('respRate')}</span>{' '}
                            <p className="font-bold text-gray-700">{item.vitals.rr} rpm</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                {/* Drugs Display (Prescriptions only) */}
                {item.timelineType === 'prescription' && item.drugs && item.drugs.length > 0 && (
                  <div className="mb-4 space-y-2">
                    {item.drugs.map(
                      (drug: { name: string; dose: string; instructions: string }, idx: number) => (
                        <div
                          key={idx}
                          className="rounded-lg border border-purple-100/50 bg-purple-50/30 p-2 text-sm"
                        >
                          <p className="font-bold text-purple-900">{drug.name}</p>
                          <p className="text-xs text-purple-700">
                            {drug.dose} - <span className="italic">{drug.instructions}</span>
                          </p>
                        </div>
                      )
                    )}
                  </div>
                )}

                {item.notes && (
                  <div className="mb-4 rounded-xl bg-gray-50 p-3 text-sm italic text-gray-600">
                    "{item.notes}"
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2">
                  {item.timelineType === 'prescription' && (
                    <button className="flex items-center gap-2 rounded-lg bg-purple-600 px-3 py-2 text-xs font-bold text-white transition-colors hover:bg-purple-700">
                      <Icons.Download className="h-3 w-3" /> {t('viewPdf')}
                    </button>
                  )}
                  {item.attachments &&
                    item.attachments.map((url: string, idx: number) => (
                      <a
                        key={idx}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 rounded-lg bg-gray-100 px-3 py-2 text-xs font-bold text-gray-600 transition-colors hover:bg-gray-200"
                      >
                        <Icons.Paperclip className="h-3 w-3" />
                        {t('attachment')} {idx + 1}
                      </a>
                    ))}
                </div>
              </div>
            </div>
          ))}
          </ErrorBoundary>
        )}
      </div>
    </div>
  )
}
