'use client'

import Link from 'next/link'
import {
  Activity,
  Calendar,
  Stethoscope,
  Pill,
  Download,
  Paperclip,
  Plus,
  Filter,
  Search,
  ChevronDown,
  Scissors,
  Heart,
  Thermometer,
} from 'lucide-react'
import { useState } from 'react'
import { useTranslations, useLocale } from 'next-intl'

interface TimelineItem {
  id: string
  created_at: string
  type: 'record' | 'prescription'
  record_type?: string
  title: string
  diagnosis?: string | null
  notes?: string | null
  vitals?: {
    weight?: number
    temp?: number
    hr?: number
    rr?: number
  } | null
  medications?: Array<{
    name: string
    dose: string
    frequency: string
    duration: string
  }>
  attachments?: string[]
  vet_name?: string
}

interface PetHistoryTabProps {
  petId: string
  petName: string
  timelineItems: TimelineItem[]
  clinic: string
  isStaff?: boolean
}

type FilterType = 'all' | 'consultation' | 'surgery' | 'prescription' | 'vaccination' | 'emergency'

export function PetHistoryTab({
  petId,
  petName,
  timelineItems,
  clinic,
  isStaff = false,
}: PetHistoryTabProps) {
  const t = useTranslations('pets.tabs.history')
  const locale = useLocale()
  const localeStr = locale === 'es' ? 'es-PY' : 'en-US'

  const [filter, setFilter] = useState<FilterType>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set())

  const toggleExpanded = (id: string) => {
    const newExpanded = new Set(expandedItems)
    if (newExpanded.has(id)) {
      newExpanded.delete(id)
    } else {
      newExpanded.add(id)
    }
    setExpandedItems(newExpanded)
  }

  // Filter items
  const filteredItems = timelineItems.filter((item) => {
    // Type filter
    if (filter !== 'all') {
      if (filter === 'prescription' && item.type !== 'prescription') return false
      if (filter !== 'prescription' && item.type === 'prescription') return false
      if (filter !== 'prescription' && item.record_type !== filter) return false
    }

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      return (
        item.title.toLowerCase().includes(query) ||
        item.diagnosis?.toLowerCase().includes(query) ||
        item.notes?.toLowerCase().includes(query)
      )
    }

    return true
  })

  const formatDate = (dateStr: string): string => {
    return new Date(dateStr).toLocaleDateString(localeStr, {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
  }

  const getTypeIcon = (item: TimelineItem) => {
    if (item.type === 'prescription') return <Pill className="h-4 w-4" />
    switch (item.record_type) {
      case 'surgery':
        return <Scissors className="h-4 w-4" />
      case 'emergency':
        return <Heart className="h-4 w-4" />
      case 'vaccination':
        return <Thermometer className="h-4 w-4" />
      default:
        return <Stethoscope className="h-4 w-4" />
    }
  }

  const getTypeColor = (item: TimelineItem): string => {
    if (item.type === 'prescription') return 'bg-[var(--primary)]'
    switch (item.record_type) {
      case 'surgery':
        return 'bg-[var(--status-error)]'
      case 'emergency':
        return 'bg-[var(--status-warning)]'
      case 'vaccination':
        return 'bg-[var(--status-success)]'
      default:
        return 'bg-[var(--status-info)]'
    }
  }

  const getTypeBadge = (item: TimelineItem): { label: string; color: string } => {
    if (item.type === 'prescription') {
      return { label: t('typePrescription'), color: 'bg-[var(--primary)]/10 text-[var(--primary)]' }
    }
    switch (item.record_type) {
      case 'surgery':
        return { label: t('typeSurgery'), color: 'bg-[var(--status-error-bg)] text-[var(--status-error-text)]' }
      case 'emergency':
        return { label: t('typeEmergency'), color: 'bg-[var(--status-warning-bg)] text-[var(--status-warning-text)]' }
      case 'vaccination':
        return { label: t('typeVaccination'), color: 'bg-[var(--status-success-bg)] text-[var(--status-success-text)]' }
      default:
        return { label: t('typeConsultation'), color: 'bg-[var(--status-info-bg)] text-[var(--status-info-text)]' }
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-xl font-bold text-[var(--text-primary)]">{t('title')}</h2>
          <p className="text-sm text-gray-500">
            {timelineItems.length !== 1 ? t('recordCountPlural', { count: timelineItems.length }) : t('recordCount', { count: timelineItems.length })}
          </p>
        </div>
        {isStaff && (
          <div className="flex gap-2">
            <Link
              href={`/${clinic}/portal/prescriptions/new?pet_id=${petId}`}
              className="flex items-center gap-2 rounded-xl bg-purple-100 px-4 py-2 text-sm font-medium text-purple-700 transition-colors hover:bg-purple-200"
            >
              <Pill className="h-4 w-4" />
              {t('newPrescription')}
            </Link>
            <Link
              href={`/${clinic}/portal/pets/${petId}/records/new`}
              className="flex items-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
            >
              <Plus className="h-4 w-4" />
              {t('newConsultation')}
            </Link>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder={t('searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="focus:ring-[var(--primary)]/10 w-full rounded-xl border border-gray-200 py-2.5 pl-10 pr-4 text-sm outline-none focus:border-[var(--primary)] focus:ring-2"
          />
        </div>

        {/* Type filter */}
        <div className="relative">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as FilterType)}
            className="focus:ring-[var(--primary)]/10 cursor-pointer appearance-none rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-8 text-sm outline-none focus:border-[var(--primary)] focus:ring-2"
          >
            <option value="all">{t('filterAll')}</option>
            <option value="consultation">{t('filterConsultation')}</option>
            <option value="surgery">{t('filterSurgery')}</option>
            <option value="prescription">{t('filterPrescription')}</option>
            <option value="vaccination">{t('filterVaccination')}</option>
            <option value="emergency">{t('filterEmergency')}</option>
          </select>
          <Filter className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <ChevronDown className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        </div>
      </div>

      {/* Timeline */}
      {filteredItems.length > 0 ? (
        <div className="relative ml-4 space-y-6 border-l-2 border-dashed border-gray-200 pb-6">
          {filteredItems.map((item) => {
            const isExpanded = expandedItems.has(item.id)
            const typeBadge = getTypeBadge(item)

            return (
              <div key={item.id} className="relative ml-8">
                {/* Timeline Node */}
                <div
                  className={`absolute -left-[41px] top-0 h-5 w-5 rounded-full border-4 border-white shadow-sm ${getTypeColor(item)}`}
                />

                <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition-shadow hover:shadow-md">
                  {/* Header - Always visible */}
                  <button
                    onClick={() => toggleExpanded(item.id)}
                    className="flex w-full items-start justify-between gap-3 p-4 text-left"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="mb-1 flex flex-wrap items-center gap-2">
                        <span
                          className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-medium ${typeBadge.color}`}
                        >
                          {getTypeIcon(item)}
                          {typeBadge.label}
                        </span>
                        <span className="flex items-center gap-1 text-xs text-gray-400">
                          <Calendar className="h-3 w-3" />
                          {formatDate(item.created_at)}
                        </span>
                      </div>
                      <h3 className="font-bold text-[var(--text-primary)]">{item.title}</h3>
                      {item.diagnosis && (
                        <p className="mt-1 line-clamp-1 text-sm text-gray-600">{item.diagnosis}</p>
                      )}
                      {item.vet_name && (
                        <p className="mt-1 text-xs text-gray-400">Dr. {item.vet_name}</p>
                      )}
                    </div>
                    <ChevronDown
                      className={`h-5 w-5 flex-shrink-0 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                    />
                  </button>

                  {/* Expanded content */}
                  {isExpanded && (
                    <div className="space-y-4 border-t border-gray-100 px-4 pb-4 pt-4">
                      {/* Vitals */}
                      {item.vitals &&
                        (item.vitals.weight ||
                          item.vitals.temp ||
                          item.vitals.hr ||
                          item.vitals.rr) && (
                          <div className="rounded-xl border border-[var(--status-info-border)]/50 bg-[var(--status-info-bg)]/50 p-3">
                            <span className="mb-2 block text-xs font-bold uppercase text-[var(--status-info)]">
                              {t('vitalSigns')}
                            </span>
                            <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                              {item.vitals.weight && (
                                <div>
                                  <span className="text-xs text-gray-400">{t('weight')}</span>
                                  <p className="font-bold text-gray-700">{item.vitals.weight} kg</p>
                                </div>
                              )}
                              {item.vitals.temp && (
                                <div>
                                  <span className="text-xs text-gray-400">{t('temp')}</span>
                                  <p className="font-bold text-gray-700">{item.vitals.temp}°C</p>
                                </div>
                              )}
                              {item.vitals.hr && (
                                <div>
                                  <span className="text-xs text-gray-400">{t('heartRate')}</span>
                                  <p className="font-bold text-gray-700">{item.vitals.hr} lpm</p>
                                </div>
                              )}
                              {item.vitals.rr && (
                                <div>
                                  <span className="text-xs text-gray-400">{t('respRate')}</span>
                                  <p className="font-bold text-gray-700">{item.vitals.rr} rpm</p>
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                      {/* Medications (for prescriptions) */}
                      {item.medications && item.medications.length > 0 && (
                        <div>
                          <span className="mb-2 block text-xs font-bold uppercase text-purple-600">
                            {t('medications')}
                          </span>
                          <div className="space-y-2">
                            {item.medications.map((med, idx) => (
                              <div
                                key={idx}
                                className="rounded-lg border border-purple-100/50 bg-purple-50/50 p-3"
                              >
                                <p className="text-sm font-bold text-purple-900">{med.name}</p>
                                <p className="text-xs text-purple-700">
                                  {med.dose} • {med.frequency} • {med.duration}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Notes */}
                      {item.notes && (
                        <div className="rounded-xl bg-gray-50 p-3 text-sm italic text-gray-600">
                          "{item.notes}"
                        </div>
                      )}

                      {/* Attachments and actions */}
                      <div className="flex flex-wrap gap-2">
                        {item.type === 'prescription' && (
                          <button className="flex items-center gap-2 rounded-lg bg-purple-600 px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-purple-700">
                            <Download className="h-3 w-3" />
                            {t('downloadPdf')}
                          </button>
                        )}
                        {item.attachments?.map((url, idx) => (
                          <a
                            key={idx}
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 rounded-lg bg-gray-100 px-3 py-2 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-200"
                          >
                            <Paperclip className="h-3 w-3" />
                            {t('attachment')} {idx + 1}
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50 py-12 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
            <Activity className="h-8 w-8 text-gray-400" />
          </div>
          <h3 className="mb-2 font-bold text-gray-900">
            {searchQuery || filter !== 'all' ? t('noResults') : t('noHistory')}
          </h3>
          <p className="mx-auto mb-4 max-w-xs text-sm text-gray-500">
            {searchQuery || filter !== 'all'
              ? t('noResultsDesc')
              : t('noHistoryDesc', { petName })}
          </p>
          {filter !== 'all' && (
            <button
              onClick={() => {
                setFilter('all')
                setSearchQuery('')
              }}
              className="text-sm font-medium text-[var(--primary)] hover:underline"
            >
              {t('clearFilters')}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
