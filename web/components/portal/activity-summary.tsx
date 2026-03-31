'use client'

import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { Activity, Clock, CheckCircle2, ArrowRight } from 'lucide-react'
import { useAsyncData } from '@/lib/hooks'

interface ActivityItem {
  id: string
  type: 'visit' | 'purchase' | 'vaccine'
  title: string
  date: string
  pet_name?: string
}

interface PortalActivitySummaryProps {
  userId: string
  clinic: string
}

function SkeletonLoader(): React.ReactElement {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <div className="h-5 w-5 animate-pulse rounded bg-gray-200" />
        <div className="h-4 w-32 animate-pulse rounded bg-gray-200" />
      </div>
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="h-8 w-8 animate-pulse rounded-full bg-gray-200" />
            <div className="flex-1 space-y-1">
              <div className="h-3 w-full animate-pulse rounded bg-gray-200" />
              <div className="h-2 w-20 animate-pulse rounded bg-gray-200" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function ActivityRow({ item }: { item: ActivityItem }): React.ReactElement {
  const date = new Date(item.date)
  const formattedDate = date.toLocaleDateString('es-PY', {
    day: 'numeric',
    month: 'short',
  })

  return (
    <div className="flex items-center gap-3">
      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-[var(--bg-subtle)]">
        <CheckCircle2 className="h-4 w-4 text-[var(--status-success)]" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-[var(--text-primary)]">{item.title}</p>
        <p className="flex items-center gap-1 text-xs text-[var(--text-muted)]">
          <Clock className="h-3 w-3" />
          {formattedDate}
          {item.pet_name && <span>• {item.pet_name}</span>}
        </p>
      </div>
    </div>
  )
}

export function PortalActivitySummary({
  userId,
  clinic,
}: PortalActivitySummaryProps): React.ReactElement {
  const t = useTranslations('portal.activity')
  const { data, isLoading } = useAsyncData<ActivityItem[]>(
    () =>
      fetch(`/api/portal/activity?userId=${userId}&limit=3`)
        .then((r) => r.json())
        .then((d) => d.activities || []),
    [userId],
    { refetchInterval: 120000 } // Refresh every 2 minutes
  )

  if (isLoading && !data) return <SkeletonLoader />

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
      <h3 className="mb-4 flex items-center gap-2 font-bold text-[var(--text-primary)]">
        <Activity className="h-5 w-5 text-[var(--primary)]" />
        {t('title')}
      </h3>

      {!data || data.length === 0 ? (
        <p className="py-2 text-center text-sm text-[var(--text-secondary)]">
          {t('noActivity')}
        </p>
      ) : (
        <div className="space-y-3">
          {data.map((item) => (
            <ActivityRow key={item.id} item={item} />
          ))}
        </div>
      )}

      <Link
        href={`/${clinic}/portal/appointments`}
        className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-[var(--primary)] hover:underline"
      >
        {t('viewHistory')}
        <ArrowRight className="h-3 w-3" />
      </Link>
    </div>
  )
}
