import { getClinicData } from '@/lib/clinics'
import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { logger } from '@/lib/logger'
import {
  Bell,
  Syringe,
  Calendar,
  FileText,
  DollarSign,
  Cake,
  ClipboardList,
  AlertCircle,
  CheckCircle,
  XCircle,
  MessageSquare,
  Activity,
  Check,
} from 'lucide-react'

interface Props {
  params: Promise<{ clinic: string }>
}

interface Notification {
  id: string
  subject: string | null
  body: string
  created_at: string
  status: 'queued' | 'delivered' | 'read' | 'failed'
  read_at: string | null
}

export async function generateStaticParams() {
  return [{ clinic: 'terrapet' }, { clinic: 'petlife' }]
}

// Map notification subjects to icons and colors based on keywords
function getNotificationIcon(subject: string | null) {
  if (!subject) return { Icon: Bell, color: 'text-gray-600' }

  const subjectLower = subject.toLowerCase()

  if (subjectLower.includes('vacuna')) {
    return subjectLower.includes('vencida')
      ? { Icon: AlertCircle, color: 'text-red-600' }
      : { Icon: Syringe, color: 'text-blue-600' }
  }
  if (subjectLower.includes('cita') || subjectLower.includes('appointment')) {
    if (subjectLower.includes('cancelad')) return { Icon: XCircle, color: 'text-red-600' }
    if (subjectLower.includes('confirmad')) return { Icon: CheckCircle, color: 'text-green-600' }
    return { Icon: Calendar, color: 'text-purple-600' }
  }
  if (subjectLower.includes('factura') || subjectLower.includes('invoice')) {
    return { Icon: FileText, color: 'text-gray-600' }
  }
  if (subjectLower.includes('pago') || subjectLower.includes('payment')) {
    return subjectLower.includes('vencid') || subjectLower.includes('overdue')
      ? { Icon: DollarSign, color: 'text-red-600' }
      : { Icon: DollarSign, color: 'text-green-600' }
  }
  if (subjectLower.includes('cumpleaños') || subjectLower.includes('birthday')) {
    return { Icon: Cake, color: 'text-pink-600' }
  }
  if (subjectLower.includes('seguimiento') || subjectLower.includes('follow')) {
    return { Icon: ClipboardList, color: 'text-orange-600' }
  }
  if (subjectLower.includes('laboratorio') || subjectLower.includes('lab')) {
    return { Icon: Activity, color: 'text-blue-600' }
  }
  if (subjectLower.includes('hospitalización') || subjectLower.includes('hospitalization')) {
    return { Icon: Activity, color: 'text-purple-600' }
  }

  return { Icon: MessageSquare, color: 'text-gray-600' }
}

// Format relative time in Spanish
function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'Justo ahora'
  if (diffMins < 60) return `Hace ${diffMins} min`
  if (diffHours < 24) return `Hace ${diffHours}h`
  if (diffDays < 7) return `Hace ${diffDays}d`

  return date.toLocaleDateString('es-PY', {
    day: 'numeric',
    month: 'short',
  })
}

// Group notifications by date
function groupNotificationsByDate(notifications: Notification[]) {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  const weekAgo = new Date(today)
  weekAgo.setDate(weekAgo.getDate() - 7)

  const groups: Record<string, Notification[]> = {
    Hoy: [],
    Ayer: [],
    'Esta semana': [],
    Anteriores: [],
  }

  notifications.forEach((notification) => {
    const notifDate = new Date(notification.created_at)
    const notifDateOnly = new Date(
      notifDate.getFullYear(),
      notifDate.getMonth(),
      notifDate.getDate()
    )

    if (notifDateOnly.getTime() === today.getTime()) {
      groups.Hoy.push(notification)
    } else if (notifDateOnly.getTime() === yesterday.getTime()) {
      groups.Ayer.push(notification)
    } else if (notifDateOnly >= weekAgo) {
      groups['Esta semana'].push(notification)
    } else {
      groups.Anteriores.push(notification)
    }
  })

  return groups
}

export default async function NotificationsPage({ params }: Props) {
  const { clinic } = await params
  const clinicData = await getClinicData(clinic)

  if (!clinicData) {
    notFound()
  }

  const supabase = await createClient()

  // Get authenticated user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    notFound()
  }

  // Fetch notifications for this user
  const { data: notifications, error } = await supabase
    .from('notification_queue')
    .select('*')
    .eq('client_id', user.id)
    .eq('channel_type', 'in_app')
    .order('created_at', { ascending: false })

  if (error) {
    logger.error('Error fetching notifications', { error: error.message })
  }

  const notificationsList = (notifications || []) as Notification[]
  const groupedNotifications = groupNotificationsByDate(notificationsList)
  const hasNotifications = notificationsList.length > 0
  const unreadCount = notificationsList.filter(
    (n) => n.status === 'queued' || n.status === 'delivered'
  ).length

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="mb-2 flex items-center justify-between">
          <h1 className="text-3xl font-bold text-[var(--text-primary)]">Notificaciones</h1>
          {unreadCount > 0 && (
            <span className="inline-flex items-center rounded-full bg-[var(--primary)] px-3 py-1 text-sm font-medium text-white">
              {unreadCount} {unreadCount === 1 ? 'nueva' : 'nuevas'}
            </span>
          )}
        </div>
        <p className="text-[var(--text-secondary)]">
          Mantente al día con las actualizaciones de tus mascotas
        </p>
      </div>

      {/* Mark all as read button */}
      {unreadCount > 0 && (
        <div className="mb-6">
          <form action="/api/notifications/mark-all-read" method="POST">
            <button
              type="submit"
              className="bg-[var(--primary)]/10 hover:bg-[var(--primary)]/20 inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-[var(--primary)] transition-colors"
            >
              <Check className="h-4 w-4" />
              Marcar todas como leídas
            </button>
          </form>
        </div>
      )}

      {/* Empty state */}
      {!hasNotifications && (
        <div className="flex flex-col items-center justify-center px-4 py-16">
          <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-[var(--bg-muted)]">
            <Bell className="h-10 w-10 text-[var(--text-tertiary)]" />
          </div>
          <h2 className="mb-2 text-xl font-semibold text-[var(--text-primary)]">
            No tienes notificaciones
          </h2>
          <p className="max-w-md text-center text-[var(--text-secondary)]">
            Aquí aparecerán recordatorios de vacunas, confirmaciones de citas y otras
            actualizaciones importantes
          </p>
        </div>
      )}

      {/* Notifications grouped by date */}
      {hasNotifications && (
        <div className="space-y-8">
          {Object.entries(groupedNotifications).map(([groupName, groupNotifs]) => {
            if (groupNotifs.length === 0) return null

            return (
              <div key={groupName}>
                <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
                  {groupName}
                </h2>
                <div className="space-y-3">
                  {groupNotifs.map((notification) => {
                    const isUnread =
                      notification.status === 'queued' || notification.status === 'delivered'
                    const { Icon, color } = getNotificationIcon(notification.subject)

                    return (
                      <div
                        key={notification.id}
                        className={`rounded-xl border shadow-sm transition-all hover:shadow-md ${
                          isUnread
                            ? 'bg-[var(--primary)]/5 border-[var(--primary)]/20'
                            : 'border-[var(--border-light)] bg-white'
                        }`}
                      >
                        <div className="p-4">
                          <div className="flex gap-4">
                            {/* Icon */}
                            <div
                              className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full ${
                                isUnread ? 'bg-white' : 'bg-[var(--bg-muted)]'
                              }`}
                            >
                              <Icon className={`h-5 w-5 ${color}`} />
                            </div>

                            {/* Content */}
                            <div className="min-w-0 flex-1">
                              <div className="mb-1 flex items-start justify-between gap-3">
                                <h3
                                  className={`${isUnread ? 'font-bold' : 'font-semibold'} ${
                                    isUnread
                                      ? 'text-[var(--primary)]'
                                      : 'text-[var(--text-primary)]'
                                  }`}
                                >
                                  {notification.subject || 'Notificación'}
                                </h3>
                                {isUnread && (
                                  <span className="h-2 w-2 flex-shrink-0 rounded-full bg-[var(--primary)]" />
                                )}
                              </div>

                              <p
                                className={`mb-2 text-sm ${
                                  isUnread
                                    ? 'font-medium text-[var(--text-primary)]'
                                    : 'text-[var(--text-secondary)]'
                                }`}
                              >
                                {notification.body}
                              </p>

                              <p className="text-xs text-[var(--text-tertiary)]">
                                {formatRelativeTime(notification.created_at)}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Footer info */}
      {hasNotifications && (
        <div className="mt-12 rounded-lg border border-[var(--border-light)] bg-[var(--bg-muted)] p-4">
          <p className="text-center text-sm text-[var(--text-secondary)]">
            Las notificaciones se conservan durante 90 días
          </p>
        </div>
      )}
    </div>
  )
}
