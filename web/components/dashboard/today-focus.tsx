'use client'

/**
 * Today Focus Component
 *
 * RES-001: Migrated to React Query for data fetching
 * - Replaced useEffect+fetch with useQuery hook
 * - Native refetchInterval replaces setInterval
 * - Parallel fetching maintained inside queryFn
 */

import { useMemo } from 'react'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import {
  AlertTriangle,
  Clock,
  Syringe,
  ChevronRight,
  Bell,
  AlertCircle,
  CheckCircle2,
  Activity,
} from 'lucide-react'
import { queryKeys } from '@/lib/queries'
import { staleTimes, gcTimes } from '@/lib/queries/utils'

interface FocusItem {
  id: string
  type: 'urgent' | 'reminder' | 'followup' | 'vaccine'
  title: string
  description: string
  time?: string
  petName?: string
  ownerName?: string
  href: string
  priority: 'high' | 'medium' | 'low'
}

interface TodayFocusProps {
  clinic: string
}

interface VaccineRecord {
  pet_id: string
  pet_name?: string
  owner_name?: string
  vaccine_name: string
  due_date: string
  is_overdue: boolean
}

interface AppointmentRecord {
  id: string
  status: string
  start_time: string
  pet?: { name: string; owner?: { full_name: string } }
  pet_name?: string
  owner_name?: string
  service?: { name: string }
  service_name?: string
}

const priorityColors = {
  high: 'border-l-[var(--status-error)] bg-[var(--status-error-bg)]/50',
  medium: 'border-l-[var(--status-warning)] bg-[var(--status-warning-bg)]/50',
  low: 'border-l-[var(--status-info)] bg-[var(--status-info-bg)]/50',
}

const typeIcons = {
  urgent: AlertTriangle,
  reminder: Bell,
  followup: Activity,
  vaccine: Syringe,
}

const typeLabels = {
  urgent: 'Urgente',
  reminder: 'Recordatorio',
  followup: 'Seguimiento',
  vaccine: 'Vacuna',
}

function FocusItemCard({ item, clinic: _clinic }: { item: FocusItem; clinic: string }) {
  const Icon = typeIcons[item.type]

  return (
    <Link
      href={item.href}
      className={`group flex items-start gap-3 rounded-xl border-l-4 p-3 transition-all duration-200 hover:shadow-md ${priorityColors[item.priority]}`}
    >
      <div
        className={`flex-shrink-0 rounded-lg p-2 ${
          item.priority === 'high'
            ? 'bg-[var(--status-error-bg)] text-[var(--status-error)]'
            : item.priority === 'medium'
              ? 'bg-[var(--status-warning-bg)] text-[var(--status-warning)]'
              : 'bg-[var(--status-info-bg)] text-[var(--status-info)]'
        }`}
      >
        <Icon className="h-4 w-4" />
      </div>

      <div className="min-w-0 flex-1">
        <div className="mb-0.5 flex items-center gap-2">
          <span
            className={`rounded px-1.5 py-0.5 text-xs font-medium ${
              item.priority === 'high'
                ? 'bg-[var(--status-error-bg)] text-[var(--status-error)]'
                : item.priority === 'medium'
                  ? 'bg-[var(--status-warning-bg)] text-[var(--status-warning)]'
                  : 'bg-[var(--status-info-bg)] text-[var(--status-info)]'
            }`}
          >
            {typeLabels[item.type]}
          </span>
          {item.time && (
            <span className="flex items-center gap-1 text-xs text-[var(--text-muted)]">
              <Clock className="h-3 w-3" />
              {item.time}
            </span>
          )}
        </div>
        <h4 className="truncate text-sm font-semibold text-[var(--text-primary)] transition-colors group-hover:text-[var(--primary)]">
          {item.title}
        </h4>
        <p className="truncate text-xs text-[var(--text-muted)]">{item.description}</p>
        {(item.petName || item.ownerName) && (
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            {item.petName && <span className="font-medium">{item.petName}</span>}
            {item.petName && item.ownerName && ' - '}
            {item.ownerName}
          </p>
        )}
      </div>

      <ChevronRight className="h-4 w-4 flex-shrink-0 self-center text-[var(--text-muted)] transition-all group-hover:translate-x-1 group-hover:text-[var(--primary)]" />
    </Link>
  )
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--status-success-bg)]">
        <CheckCircle2 className="h-6 w-6 text-[var(--status-success)]" />
      </div>
      <h4 className="mb-1 text-sm font-semibold text-[var(--text-primary)]">Todo al día</h4>
      <p className="text-xs text-[var(--text-muted)]">No hay elementos urgentes pendientes</p>
    </div>
  )
}

function LoadingSkeleton() {
  return (
    <div className="space-y-3">
      {[...Array(3)].map((_, i) => (
        <div
          key={i}
          className="flex animate-pulse items-start gap-3 rounded-xl bg-[var(--bg-subtle)] p-3"
        >
          <div className="h-8 w-8 rounded-lg bg-[var(--border-light)]" />
          <div className="flex-1">
            <div className="mb-2 h-3 w-20 rounded bg-[var(--border-light)]" />
            <div className="mb-1 h-4 w-40 rounded bg-[var(--border-light)]" />
            <div className="h-3 w-32 rounded bg-[var(--border-light)]" />
          </div>
        </div>
      ))}
    </div>
  )
}

export function TodayFocus({ clinic }: TodayFocusProps) {
  // React Query: Fetch focus items with 1-minute auto-refresh
  const { data: rawItems = [], isLoading: loading } = useQuery({
    queryKey: queryKeys.dashboard.todayFocus(clinic),
    queryFn: async (): Promise<FocusItem[]> => {
      // Fetch from multiple sources in parallel
      const [vaccinesRes, appointmentsRes] = await Promise.all([
        fetch(`/api/dashboard/vaccines?clinic=${clinic}&days=3`),
        fetch(`/api/dashboard/today-appointments?clinic=${clinic}`),
      ])

      const focusItems: FocusItem[] = []

      // Process overdue vaccines
      if (vaccinesRes.ok) {
        const vaccinesData = await vaccinesRes.json()
        // API returns array with is_overdue flag, filter for overdue ones
        const overdue: VaccineRecord[] = Array.isArray(vaccinesData)
          ? vaccinesData.filter((v: VaccineRecord) => v.is_overdue)
          : vaccinesData.overdue || []
        overdue.slice(0, 3).forEach((v: VaccineRecord) => {
          focusItems.push({
            id: `vaccine-${v.pet_id}-${v.vaccine_name}`,
            type: 'vaccine',
            title: `Vacuna vencida: ${v.vaccine_name}`,
            description: `Venció ${formatDaysAgo(v.due_date)}`,
            petName: v.pet_name,
            ownerName: v.owner_name,
            href: `/${clinic}/dashboard/patients/${v.pet_id}`,
            priority: 'high',
          })
        })
      }

      // Process today's appointments that need attention
      if (appointmentsRes.ok) {
        const appointmentsData = await appointmentsRes.json()
        // API returns array directly or { appointments: [...] }
        const appointments: AppointmentRecord[] = Array.isArray(appointmentsData)
          ? appointmentsData
          : appointmentsData.appointments || []

        // Find appointments that should have started but aren't in progress
        const now = new Date()
        appointments.forEach((apt: AppointmentRecord) => {
          const startTime = new Date(apt.start_time)
          const petName = apt.pet?.name || apt.pet_name
          const ownerName = apt.pet?.owner?.full_name || apt.owner_name
          const serviceName = apt.service?.name || apt.service_name || 'Consulta'

          if (apt.status === 'confirmed' && startTime < now) {
            focusItems.push({
              id: `apt-${apt.id}`,
              type: 'urgent',
              title: `Cita sin iniciar`,
              description: serviceName,
              time: formatTime(apt.start_time),
              petName,
              ownerName,
              href: `/${clinic}/dashboard/appointments/${apt.id}`,
              priority: 'high',
            })
          } else if (apt.status === 'scheduled') {
            // Upcoming scheduled appointments
            const minutesUntil = Math.floor((startTime.getTime() - now.getTime()) / 60000)
            if (minutesUntil <= 30 && minutesUntil > 0) {
              focusItems.push({
                id: `apt-upcoming-${apt.id}`,
                type: 'reminder',
                title: `Próxima cita en ${minutesUntil} min`,
                description: serviceName,
                time: formatTime(apt.start_time),
                petName,
                href: `/${clinic}/dashboard/appointments/${apt.id}`,
                priority: 'medium',
              })
            }
          }
        })
      }

      return focusItems
    },
    staleTime: staleTimes.SHORT, // 30 seconds
    gcTime: gcTimes.SHORT, // 5 minutes
    refetchInterval: 60 * 1000, // Refresh every minute
  })

  // Sort by priority and limit to 5 items (memoized)
  const items = useMemo(() => {
    const priorityOrder = { high: 0, medium: 1, low: 2 }
    return [...rawItems]
      .sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority])
      .slice(0, 5)
  }, [rawItems])

  return (
    <div className="overflow-hidden rounded-2xl border border-[var(--border-light)] bg-[var(--bg-paper)] shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[var(--border-light)] px-5 py-4">
        <div className="flex items-center gap-2">
          <div className="bg-[var(--primary)]/10 rounded-lg p-2">
            <AlertCircle className="h-5 w-5 text-[var(--primary)]" />
          </div>
          <div>
            <h3 className="font-bold text-[var(--text-primary)]">Foco de Hoy</h3>
            <p className="text-xs text-[var(--text-muted)]">Elementos que requieren atención</p>
          </div>
        </div>
        {items.length > 0 && (
          <span className="rounded-full bg-[var(--status-error-bg)] px-2.5 py-1 text-xs font-bold text-[var(--status-error)]">
            {items.length}
          </span>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        {loading ? (
          <LoadingSkeleton />
        ) : items.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="space-y-2">
            {items.map((item) => (
              <FocusItemCard key={item.id} item={item} clinic={clinic} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// Helper functions
function formatTime(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleTimeString('es-PY', { hour: '2-digit', minute: '2-digit' })
}

function formatDaysAgo(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return 'hoy'
  if (diffDays === 1) return 'ayer'
  if (diffDays < 7) return `hace ${diffDays} días`
  if (diffDays < 30) return `hace ${Math.floor(diffDays / 7)} semanas`
  return `hace ${Math.floor(diffDays / 30)} meses`
}
