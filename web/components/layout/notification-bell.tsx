'use client'

/**
 * Notification Bell Component
 *
 * RES-001: Migrated to React Query for data fetching
 * - Replaced useEffect+fetch with useQuery hook
 * - Mark as read uses useMutation with cache update
 */

import { useRef, useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { Bell } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/queries'
import { staleTimes, gcTimes } from '@/lib/queries/utils'

interface Notification {
  id: string
  subject: string | null
  body: string
  notification_type: string
  status: 'queued' | 'delivered' | 'read' | 'failed'
  created_at: string
  read_at: string | null
}

interface NotificationsResponse {
  notifications: Notification[]
  unreadCount: number
}

interface NotificationBellProps {
  clinic: string
}

export function NotificationBell({ clinic }: Readonly<NotificationBellProps>) {
  const t = useTranslations('notifications')
  const queryClient = useQueryClient()
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  // React Query: Fetch notifications
  const { data, isLoading } = useQuery({
    queryKey: queryKeys.notifications.bell(),
    queryFn: async (): Promise<NotificationsResponse> => {
      const response = await fetch('/api/notifications')
      if (!response.ok) throw new Error('Error al cargar notificaciones')
      return response.json()
    },
    staleTime: staleTimes.SHORT,
    gcTime: gcTimes.SHORT,
    refetchInterval: 60000, // Refresh every minute
  })

  const notifications = data?.notifications || []
  const unreadCount = data?.unreadCount || 0

  // Mutation: Mark notifications as read
  const markAsReadMutation = useMutation({
    mutationFn: async (notificationIds: string[]): Promise<void> => {
      const response = await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationIds }),
      })
      if (!response.ok) throw new Error('Error al marcar como leída')
    },
    onSuccess: (_, notificationIds) => {
      // Optimistic update
      queryClient.setQueryData(
        queryKeys.notifications.bell(),
        (old: NotificationsResponse | undefined) => {
          if (!old) return old
          return {
            notifications: old.notifications.map((notif) =>
              notificationIds.includes(notif.id)
                ? { ...notif, status: 'read' as const, read_at: new Date().toISOString() }
                : notif
            ),
            unreadCount: Math.max(0, old.unreadCount - notificationIds.length),
          }
        }
      )
    },
  })

  // Mutation: Mark all as read
  const markAllAsReadMutation = useMutation({
    mutationFn: async (): Promise<void> => {
      const response = await fetch('/api/notifications/mark-all-read', {
        method: 'POST',
      })
      if (!response.ok) throw new Error('Error al marcar todas como leídas')
    },
    onSuccess: () => {
      // Optimistic update
      queryClient.setQueryData(
        queryKeys.notifications.bell(),
        (old: NotificationsResponse | undefined) => {
          if (!old) return old
          return {
            notifications: old.notifications.map((notif) =>
              notif.status === 'queued' || notif.status === 'delivered'
                ? { ...notif, status: 'read' as const, read_at: new Date().toISOString() }
                : notif
            ),
            unreadCount: 0,
          }
        }
      )
    },
  })

  const handleNotificationClick = (notificationId: string, status: string) => {
    if (status !== 'read') {
      markAsReadMutation.mutate([notificationId])
    }
  }

  const handleDropdownToggle = () => {
    setIsOpen(!isOpen)
  }

  const truncateText = (text: string, maxLength: number): string => {
    if (text.length <= maxLength) return text
    return text.substring(0, maxLength) + '...'
  }

  const formatTimeAgo = (dateString: string): string => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)

    if (diffInSeconds < 60) return t('justNow')
    if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60)
      return minutes === 1 ? t('minuteAgo') : t('minutesAgo', { count: minutes })
    }
    if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600)
      return hours === 1 ? t('hourAgo') : t('hoursAgo', { count: hours })
    }
    const days = Math.floor(diffInSeconds / 86400)
    if (days === 1) return t('dayAgo')
    if (days < 7) return t('daysAgo', { count: days })
    if (days < 30) {
      const weeks = Math.floor(days / 7)
      return weeks === 1 ? t('weekAgo') : t('weeksAgo', { count: weeks })
    }
    const months = Math.floor(days / 30)
    return months === 1 ? t('monthAgo') : t('monthsAgo', { count: months })
  }

  // Get recent 5 notifications for dropdown
  const recentNotifications = notifications.slice(0, 5)

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Icon with Badge */}
      <button
        onClick={handleDropdownToggle}
        className="relative p-2 text-[var(--text-secondary)] transition-colors hover:text-[var(--primary)]"
        aria-label={t('ariaLabel')}
      >
        <Bell className="h-6 w-6" />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[var(--status-error,#dc2626)] px-1 text-xs font-bold text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 z-50 mt-2 w-80 overflow-hidden rounded-3xl border border-[var(--border-light,#f3f4f6)] bg-[var(--bg-paper)] shadow-xl sm:w-96"
          >
            {/* Header */}
            <div className="bg-[var(--primary)] px-6 py-4 text-white">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold">{t('title')}</h3>
                {unreadCount > 0 && (
                  <button
                    onClick={() => markAllAsReadMutation.mutate()}
                    disabled={markAllAsReadMutation.isPending}
                    className="rounded-lg bg-white/20 px-3 py-1.5 text-xs font-semibold transition-colors hover:bg-white/30 disabled:opacity-50"
                  >
                    {t('markAllRead')}
                  </button>
                )}
              </div>
            </div>

            {/* Notifications List */}
            <div className="max-h-96 overflow-y-auto">
              {isLoading ? (
                <div className="px-6 py-8 text-center text-[var(--text-secondary)]">
                  {t('loading')}
                </div>
              ) : recentNotifications.length === 0 ? (
                <div className="px-6 py-8 text-center text-[var(--text-secondary)]">
                  {t('empty')}
                </div>
              ) : (
                <ul className="divide-y divide-[var(--border-light,#f3f4f6)]">
                  {recentNotifications.map((notification) => {
                    const isUnread =
                      notification.status === 'queued' || notification.status === 'delivered'
                    return (
                      <li
                        key={notification.id}
                        onClick={() =>
                          handleNotificationClick(notification.id, notification.status)
                        }
                        className={`cursor-pointer px-6 py-4 transition-colors hover:bg-[var(--bg-subtle)] ${
                          isUnread ? 'bg-[var(--primary)]/5' : ''
                        }`}
                      >
                        <div className="flex flex-col gap-1">
                          {/* Subject or Type */}
                          <div className="flex items-start justify-between gap-2">
                            <h4
                              className={`text-sm text-[var(--text-primary)] ${isUnread ? 'font-bold' : 'font-semibold'}`}
                            >
                              {notification.subject ||
                                notification.notification_type
                                  .replace(/_/g, ' ')
                                  .replace(/\b\w/g, (l) => l.toUpperCase())}
                            </h4>
                            {isUnread && (
                              <span className="mt-1 h-2 w-2 flex-shrink-0 rounded-full bg-[var(--primary)]"></span>
                            )}
                          </div>

                          {/* Body Preview */}
                          <p
                            className={`text-sm ${isUnread ? 'font-medium text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'}`}
                          >
                            {truncateText(notification.body, 80)}
                          </p>

                          {/* Time Ago */}
                          <p className="mt-1 text-xs text-[var(--text-muted)]">
                            {formatTimeAgo(notification.created_at)}
                          </p>
                        </div>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>

            {/* Footer - "Ver todas" link */}
            {recentNotifications.length > 0 && (
              <div className="border-t border-[var(--border-light,#f3f4f6)] bg-[var(--bg-subtle)]">
                <Link
                  href={`/${clinic}/portal/notifications`}
                  onClick={() => setIsOpen(false)}
                  className="block px-6 py-3 text-center text-sm font-semibold text-[var(--primary)] transition-colors hover:bg-[var(--bg-subtle)]"
                >
                  {t('viewAll')}
                </Link>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
