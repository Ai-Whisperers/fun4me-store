'use client'

/**
 * Activity Feed Component
 *
 * RES-001: Migrated to React Query for data fetching
 * - Replaced useEffect+fetch with useQuery hook
 * - Native refetchInterval replaces setInterval
 * - Manual refetch via refetch() method
 */

import { useMemo } from 'react'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import {
  CheckCircle2,
  PawPrint,
  Calendar,
  Syringe,
  Receipt,
  UserPlus,
  Clock,
  Activity,
  RefreshCw,
  LucideIcon,
} from 'lucide-react'
import { queryKeys } from '@/lib/queries'
import { staleTimes, gcTimes } from '@/lib/queries/utils'

type ActivityType =
  | 'appointment_completed'
  | 'appointment_scheduled'
  | 'pet_registered'
  | 'vaccine_administered'
  | 'invoice_paid'
  | 'client_registered'

interface ActivityItem {
  id: string
  type: ActivityType
  title: string
  description: string
  timestamp: string
  href?: string
  actor?: string
  meta?: Record<string, string | number | boolean>
}

interface ActivityFeedProps {
  clinic: string
  maxItems?: number
}

interface Appointment {
  id: string
  status: string
  pet_name?: string
  service_name?: string
  updated_at?: string
  end_time?: string
  start_time: string
  created_at?: string
  vet_name?: string
}

interface Pet {
  id: string
  name: string
  species: 'dog' | 'cat'
  breed?: string
  created_at: string
}

const activityConfig: Record<ActivityType, { icon: LucideIcon; color: string; bgColor: string }> = {
  appointment_completed: {
    icon: CheckCircle2,
    color: 'text-[var(--status-success)]',
    bgColor: 'bg-[var(--status-success-bg)]',
  },
  appointment_scheduled: {
    icon: Calendar,
    color: 'text-[var(--status-info)]',
    bgColor: 'bg-[var(--status-info-bg)]',
  },
  pet_registered: {
    icon: PawPrint,
    color: 'text-[var(--primary)]',
    bgColor: 'bg-[var(--primary)]/10',
  },
  vaccine_administered: {
    icon: Syringe,
    color: 'text-[var(--status-warning)]',
    bgColor: 'bg-[var(--status-warning-bg)]',
  },
  invoice_paid: {
    icon: Receipt,
    color: 'text-[var(--status-success)]',
    bgColor: 'bg-[var(--status-success-bg)]',
  },
  client_registered: {
    icon: UserPlus,
    color: 'text-[var(--status-info)]',
    bgColor: 'bg-[var(--status-info-bg)]',
  },
}

function formatRelativeTime(timestamp: string): string {
  const date = new Date(timestamp)
  const now = new Date()
  const diffSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)

  if (diffSeconds < 60) return 'hace un momento'
  if (diffSeconds < 3600) return `hace ${Math.floor(diffSeconds / 60)} min`
  if (diffSeconds < 86400) return `hace ${Math.floor(diffSeconds / 3600)} h`
  if (diffSeconds < 172800) return 'ayer'
  return date.toLocaleDateString('es-PY', { day: 'numeric', month: 'short' })
}

function ActivityItemRow({ item }: { item: ActivityItem }) {
  const config = activityConfig[item.type]
  const Icon = config.icon

  const content = (
    <div className="group flex items-start gap-3 rounded-xl p-3 transition-colors hover:bg-[var(--bg-subtle)]">
      <div className={`rounded-lg p-2 ${config.bgColor} ${config.color} flex-shrink-0`}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm text-[var(--text-primary)] transition-colors group-hover:text-[var(--primary)]">
          <span className="font-medium">{item.title}</span>
          {item.description && (
            <span className="text-[var(--text-muted)]"> - {item.description}</span>
          )}
        </p>
        <div className="mt-0.5 flex items-center gap-2">
          <span className="flex items-center gap-1 text-xs text-[var(--text-muted)]">
            <Clock className="h-3 w-3" />
            {formatRelativeTime(item.timestamp)}
          </span>
          {item.actor && <span className="text-xs text-[var(--text-muted)]">por {item.actor}</span>}
        </div>
      </div>
    </div>
  )

  if (item.href) {
    return <Link href={item.href}>{content}</Link>
  }
  return content
}

function LoadingSkeleton() {
  return (
    <div className="space-y-2">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="flex animate-pulse items-start gap-3 p-3">
          <div className="h-8 w-8 flex-shrink-0 rounded-lg bg-[var(--border-light)]" />
          <div className="flex-1">
            <div className="mb-2 h-4 w-3/4 rounded bg-[var(--border-light)]" />
            <div className="h-3 w-1/3 rounded bg-[var(--border-light)]" />
          </div>
        </div>
      ))}
    </div>
  )
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--bg-subtle)]">
        <Activity className="h-6 w-6 text-[var(--text-muted)]" />
      </div>
      <p className="text-sm text-[var(--text-muted)]">Sin actividad reciente</p>
    </div>
  )
}

export function ActivityFeed({ clinic, maxItems = 8 }: ActivityFeedProps) {
  // React Query: Fetch activities with 30-second auto-refresh
  const {
    data: rawActivities = [],
    isLoading: loading,
    isFetching: refreshing,
    refetch,
  } = useQuery({
    queryKey: queryKeys.dashboard.activity(clinic, maxItems),
    queryFn: async (): Promise<ActivityItem[]> => {
      // Fetch recent activities from multiple sources
      const [appointmentsRes, petsRes] = await Promise.all([
        fetch(`/api/dashboard/today-appointments?clinic=${clinic}`),
        fetch(`/api/dashboard/pets?clinic=${clinic}&limit=5`),
      ])

      const activityItems: ActivityItem[] = []

      // Process completed appointments
      if (appointmentsRes.ok) {
        const data = await appointmentsRes.json()
        const appointments: Appointment[] = data.appointments || []

        appointments
          .filter((apt: Appointment) => apt.status === 'completed')
          .slice(0, 4)
          .forEach((apt: Appointment) => {
            activityItems.push({
              id: `apt-${apt.id}`,
              type: 'appointment_completed',
              title: apt.pet_name || 'Cita completada',
              description: apt.service_name || 'Consulta',
              timestamp: apt.updated_at || apt.end_time || apt.start_time,
              href: `/${clinic}/dashboard/appointments/${apt.id}`,
              actor: apt.vet_name,
            })
          })

        // Scheduled appointments
        appointments
          .filter((apt: Appointment) => apt.status === 'scheduled' || apt.status === 'confirmed')
          .slice(0, 3)
          .forEach((apt: Appointment) => {
            activityItems.push({
              id: `apt-scheduled-${apt.id}`,
              type: 'appointment_scheduled',
              title: apt.pet_name || 'Nueva cita',
              description: formatTime(apt.start_time),
              timestamp: apt.created_at || apt.start_time,
              href: `/${clinic}/dashboard/appointments/${apt.id}`,
            })
          })
      }

      // Process recently registered pets
      if (petsRes.ok) {
        const data = await petsRes.json()
        const pets: Pet[] = data.data || data.pets || []

        pets.slice(0, 3).forEach((pet: Pet) => {
          activityItems.push({
            id: `pet-${pet.id}`,
            type: 'pet_registered',
            title: pet.name,
            description: `${pet.species === 'dog' ? 'Perro' : 'Gato'} ${pet.breed || 'mestizo'}`,
            timestamp: pet.created_at,
            href: `/${clinic}/dashboard/patients/${pet.id}`,
          })
        })
      }

      return activityItems
    },
    staleTime: staleTimes.SHORT, // 30 seconds
    gcTime: gcTimes.SHORT, // 5 minutes
    refetchInterval: 30 * 1000, // Refresh every 30 seconds
  })

  // Sort by timestamp and limit (memoized)
  const activities = useMemo(() => {
    return [...rawActivities]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, maxItems)
  }, [rawActivities, maxItems])

  return (
    <div className="overflow-hidden rounded-2xl border border-[var(--border-light)] bg-[var(--bg-paper)] shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[var(--border-light)] px-5 py-4">
        <div className="flex items-center gap-2">
          <div className="bg-[var(--primary)]/10 rounded-lg p-2">
            <Activity className="h-5 w-5 text-[var(--primary)]" />
          </div>
          <div>
            <h3 className="font-bold text-[var(--text-primary)]">Actividad Reciente</h3>
            <p className="text-xs text-[var(--text-muted)]">Actualizaciones en tiempo real</p>
          </div>
        </div>
        <button
          onClick={() => refetch()}
          disabled={refreshing}
          className="rounded-lg p-2 transition-colors hover:bg-[var(--bg-subtle)] disabled:opacity-50"
          title="Actualizar"
        >
          <RefreshCw
            className={`h-4 w-4 text-[var(--text-muted)] ${refreshing ? 'animate-spin' : ''}`}
          />
        </button>
      </div>

      {/* Content */}
      <div className="max-h-[400px] overflow-y-auto">
        {loading ? (
          <div className="p-2">
            <LoadingSkeleton />
          </div>
        ) : activities.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="divide-[var(--border-light)]/50 divide-y">
            {activities.map((activity) => (
              <ActivityItemRow key={activity.id} item={activity} />
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      {activities.length > 0 && (
        <div className="bg-[var(--bg-subtle)]/50 border-t border-[var(--border-light)] px-5 py-3">
          <Link
            href={`/${clinic}/dashboard/activity`}
            className="text-sm font-medium text-[var(--primary)] hover:underline"
          >
            Ver toda la actividad
          </Link>
        </div>
      )}
    </div>
  )
}

function formatTime(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleTimeString('es-PY', { hour: '2-digit', minute: '2-digit' })
}
