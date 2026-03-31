'use client'

import { createContext, useContext, useState, useCallback, useMemo, type ReactNode } from 'react'
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react'

/**
 * Notification types for visual distinction
 */
export type NotificationType = 'success' | 'error' | 'warning' | 'info'

/**
 * Notification object structure
 */
export interface Notification {
  id: string
  type: NotificationType
  title?: string
  message: string
  duration?: number
  dismissible?: boolean
  action?: {
    label: string
    onClick: () => void
  }
}

/**
 * Input for creating a notification
 */
export interface NotificationInput {
  type?: NotificationType
  title?: string
  message: string
  duration?: number
  dismissible?: boolean
  action?: {
    label: string
    onClick: () => void
  }
}

/**
 * Context value type
 */
interface NotificationContextType {
  notifications: Notification[]
  addNotification: (notification: NotificationInput) => string
  removeNotification: (id: string) => void
  clearAll: () => void
  // Convenience methods
  success: (message: string, options?: Partial<NotificationInput>) => string
  error: (message: string, options?: Partial<NotificationInput>) => string
  warning: (message: string, options?: Partial<NotificationInput>) => string
  info: (message: string, options?: Partial<NotificationInput>) => string
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined)

/**
 * Generate unique ID for notifications
 */
function generateId(): string {
  return `notification-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

/**
 * Default durations per notification type (in milliseconds)
 */
const DEFAULT_DURATIONS: Record<NotificationType, number> = {
  success: 3000,
  error: 5000,
  warning: 4000,
  info: 3000,
}

/**
 * Icon configuration per notification type
 */
const NOTIFICATION_CONFIG: Record<
  NotificationType,
  { icon: typeof CheckCircle; bgColor: string; iconColor: string; borderColor: string }
> = {
  success: {
    icon: CheckCircle,
    bgColor: 'bg-green-50',
    iconColor: 'text-green-500',
    borderColor: 'border-green-200',
  },
  error: {
    icon: XCircle,
    bgColor: 'bg-red-50',
    iconColor: 'text-red-500',
    borderColor: 'border-red-200',
  },
  warning: {
    icon: AlertTriangle,
    bgColor: 'bg-amber-50',
    iconColor: 'text-amber-500',
    borderColor: 'border-amber-200',
  },
  info: {
    icon: Info,
    bgColor: 'bg-blue-50',
    iconColor: 'text-blue-500',
    borderColor: 'border-blue-200',
  },
}

/**
 * Notification Provider Component
 *
 * Provides a notification system for the application with support for
 * multiple notification types, auto-dismiss, and action buttons.
 *
 * @example
 * ```tsx
 * // In your layout
 * <NotificationProvider>
 *   <App />
 * </NotificationProvider>
 *
 * // In your component
 * const { success, error } = useNotifications();
 *
 * const handleSave = async () => {
 *   try {
 *     await saveData();
 *     success('Datos guardados exitosamente');
 *   } catch (e) {
 *     error('Error al guardar los datos');
 *   }
 * };
 * ```
 */
export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([])

  const removeNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id))
  }, [])

  const addNotification = useCallback(
    (input: NotificationInput): string => {
      const id = generateId()
      const type = input.type || 'info'
      const duration = input.duration ?? DEFAULT_DURATIONS[type]
      const dismissible = input.dismissible ?? true

      const notification: Notification = {
        id,
        type,
        title: input.title,
        message: input.message,
        duration,
        dismissible,
        action: input.action,
      }

      setNotifications((prev) => [...prev, notification])

      // Auto-remove after duration (unless duration is 0)
      if (duration > 0) {
        setTimeout(() => {
          removeNotification(id)
        }, duration)
      }

      return id
    },
    [removeNotification]
  )

  const clearAll = useCallback(() => {
    setNotifications([])
  }, [])

  // Convenience methods
  const success = useCallback(
    (message: string, options?: Partial<NotificationInput>) =>
      addNotification({ ...options, message, type: 'success' }),
    [addNotification]
  )

  const error = useCallback(
    (message: string, options?: Partial<NotificationInput>) =>
      addNotification({ ...options, message, type: 'error' }),
    [addNotification]
  )

  const warning = useCallback(
    (message: string, options?: Partial<NotificationInput>) =>
      addNotification({ ...options, message, type: 'warning' }),
    [addNotification]
  )

  const info = useCallback(
    (message: string, options?: Partial<NotificationInput>) =>
      addNotification({ ...options, message, type: 'info' }),
    [addNotification]
  )

  const contextValue = useMemo(
    () => ({
      notifications,
      addNotification,
      removeNotification,
      clearAll,
      success,
      error,
      warning,
      info,
    }),
    [notifications, addNotification, removeNotification, clearAll, success, error, warning, info]
  )

  return (
    <NotificationContext.Provider value={contextValue}>
      {children}
      <NotificationContainer notifications={notifications} onDismiss={removeNotification} />
    </NotificationContext.Provider>
  )
}

/**
 * Hook to access notification functions
 *
 * @example
 * ```tsx
 * const { success, error, info, warning } = useNotifications();
 *
 * success('Operacion completada');
 * error('Error al procesar', { duration: 5000 });
 * info('Recordatorio: Actualiza tus datos', {
 *   action: { label: 'Actualizar', onClick: () => navigate('/settings') }
 * });
 * ```
 */
export function useNotifications(): NotificationContextType {
  const context = useContext(NotificationContext)
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider')
  }
  return context
}

/**
 * Container component that renders all active notifications
 */
function NotificationContainer({
  notifications,
  onDismiss,
}: {
  notifications: Notification[]
  onDismiss: (id: string) => void
}) {
  if (notifications.length === 0) return null

  return (
    <div
      className="pointer-events-none fixed bottom-4 right-4 z-50 flex w-full max-w-sm flex-col gap-2"
      aria-live="polite"
      aria-atomic="false"
    >
      {notifications.map((notification) => (
        <NotificationItem
          key={notification.id}
          notification={notification}
          onDismiss={() => onDismiss(notification.id)}
        />
      ))}
    </div>
  )
}

/**
 * Individual notification item component
 */
function NotificationItem({
  notification,
  onDismiss,
}: {
  notification: Notification
  onDismiss: () => void
}) {
  const config = NOTIFICATION_CONFIG[notification.type]
  const Icon = config.icon

  return (
    <div
      className={`animate-in slide-in-from-right-full fade-in pointer-events-auto flex items-start gap-3 rounded-xl border p-4 shadow-lg duration-300 ${config.bgColor} ${config.borderColor} `}
      role="alert"
    >
      <Icon className={`mt-0.5 h-5 w-5 flex-shrink-0 ${config.iconColor}`} />

      <div className="min-w-0 flex-1">
        {notification.title && (
          <p className="mb-0.5 text-sm font-semibold text-gray-900">{notification.title}</p>
        )}
        <p className="text-sm text-gray-700">{notification.message}</p>

        {notification.action && (
          <button
            onClick={() => {
              notification.action?.onClick()
              onDismiss()
            }}
            className={`mt-2 text-sm font-medium underline-offset-2 hover:underline ${config.iconColor}`}
          >
            {notification.action.label}
          </button>
        )}
      </div>

      {notification.dismissible && (
        <button
          onClick={onDismiss}
          className="-m-1 p-1 text-gray-400 transition-colors hover:text-gray-600"
          aria-label="Cerrar"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  )
}
