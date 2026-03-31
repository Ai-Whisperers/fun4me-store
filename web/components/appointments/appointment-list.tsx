'use client'

import { useState } from 'react'
import * as Icons from 'lucide-react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { AppointmentCard } from './appointment-card'

type TabType = 'upcoming' | 'past'

interface AppointmentListProps {
  upcoming: Array<{
    id: string
    tenant_id: string
    start_time: string
    end_time: string
    status: string
    reason: string
    notes?: string | null
    pets: {
      id: string
      name: string
      species: string
      photo_url?: string | null
    }
  }>
  past: Array<{
    id: string
    tenant_id: string
    start_time: string
    end_time: string
    status: string
    reason: string
    notes?: string | null
    pets: {
      id: string
      name: string
      species: string
      photo_url?: string | null
    }
  }>
  clinic: string
}

export function AppointmentList({ upcoming, past, clinic }: AppointmentListProps) {
  const [activeTab, setActiveTab] = useState<TabType>('upcoming')
  const t = useTranslations('appointments')

  const tabs: {
    id: TabType
    label: string
    count: number
    icon: React.ComponentType<{ className?: string }>
  }[] = [
    { id: 'upcoming', label: t('tabs.upcoming'), count: upcoming.length, icon: Icons.CalendarCheck },
    { id: 'past', label: t('tabs.past'), count: past.length, icon: Icons.History },
  ]

  const appointments = activeTab === 'upcoming' ? upcoming : past

  return (
    <div className="container mx-auto min-h-screen px-4 sm:px-6 lg:px-8">
      {/* Tabs */}
      <div
        className="mb-6 flex gap-2 rounded-xl bg-gray-100 p-1"
        role="tablist"
        aria-label={t('tabs.ariaLabel')}
      >
        {tabs.map((tab) => {
          const Icon = tab.icon
          return (
            <button
              key={tab.id}
              role="tab"
              aria-selected={activeTab === tab.id}
              aria-controls={`${tab.id}-panel`}
              id={`${tab.id}-tab`}
              tabIndex={activeTab === tab.id ? 0 : -1}
              onClick={() => setActiveTab(tab.id)}
              className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-bold transition-all ${
                activeTab === tab.id
                  ? 'bg-white text-[var(--text-primary)] shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
              {tab.label}
              <span
                className={`rounded-full px-2 py-0.5 text-xs ${
                  activeTab === tab.id
                    ? 'bg-[var(--primary)]/10 text-[var(--primary)]'
                    : 'bg-gray-200 text-gray-500'
                }`}
                aria-label={t('tabs.countLabel', { count: tab.count })}
              >
                {tab.count}
              </span>
            </button>
          )
        })}
      </div>

      {/* Appointment List */}
      <div role="tabpanel" id={`${activeTab}-panel`} aria-labelledby={`${activeTab}-tab`}>
        {appointments.length > 0 ? (
          <div className="space-y-4">
            {appointments.map((appointment) => (
              <AppointmentCard
                key={appointment.id}
                appointment={appointment}
                clinic={clinic}
                showActions={activeTab === 'upcoming'}
              />
            ))}
          </div>
        ) : (
          <EmptyState tab={activeTab} clinic={clinic} />
        )}
      </div>
    </div>
  )
}

function EmptyState({ tab, clinic }: { tab: TabType; clinic: string }) {
  const t = useTranslations('appointments')

  if (tab === 'upcoming') {
    return (
      <div className="rounded-2xl bg-gray-50 py-16 text-center">
        <div className="bg-[var(--primary)]/10 mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full">
          <Icons.CalendarPlus className="h-10 w-10 text-[var(--primary)]" />
        </div>
        <h3 className="mb-2 text-xl font-bold text-[var(--text-primary)]">
          {t('emptyState.upcomingTitle')}
        </h3>
        <p className="mx-auto mb-6 max-w-sm text-[var(--text-secondary)]">
          {t('emptyState.upcomingDescription')}
        </p>
        <Link
          href={`/${clinic}/book`}
          className="inline-flex items-center gap-2 rounded-xl bg-[var(--primary)] px-6 py-3 font-bold text-white shadow-lg transition-all hover:-translate-y-0.5 hover:shadow-xl"
        >
          <Icons.Plus className="h-5 w-5" />
          {t('emptyState.upcomingAction')}
        </Link>
      </div>
    )
  }

  return (
    <div className="rounded-2xl bg-gray-50 py-16 text-center">
      <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-gray-100">
        <Icons.History className="h-10 w-10 text-gray-400" />
      </div>
      <h3 className="mb-2 text-xl font-bold text-[var(--text-primary)]">{t('emptyState.pastTitle')}</h3>
      <p className="mx-auto max-w-sm text-[var(--text-secondary)]">
        {t('emptyState.pastDescription')}
      </p>
    </div>
  )
}
