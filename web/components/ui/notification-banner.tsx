'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import * as Icons from 'lucide-react'

type BannerVariant = 'info' | 'warning' | 'error' | 'success' | 'urgent'

interface NotificationBannerProps {
  variant?: BannerVariant
  title: string
  message?: string
  icon?: keyof typeof Icons
  action?: {
    label: string
    href?: string
    onClick?: () => void
  }
  dismissible?: boolean
  onDismiss?: () => void
  animate?: boolean
  className?: string
}

const variantStyles: Record<
  BannerVariant,
  {
    bg: string
    border: string
    text: string
    icon: string
    defaultIcon: keyof typeof Icons
  }
> = {
  info: {
    bg: 'bg-[var(--status-info-bg)]',
    border: 'border-[var(--status-info-border)]',
    text: 'text-[var(--status-info-text)]',
    icon: 'text-[var(--status-info)]',
    defaultIcon: 'Info',
  },
  warning: {
    bg: 'bg-[var(--status-warning-bg)]',
    border: 'border-[var(--status-warning-border)]',
    text: 'text-[var(--status-warning-text)]',
    icon: 'text-[var(--status-warning)]',
    defaultIcon: 'AlertTriangle',
  },
  error: {
    bg: 'bg-[var(--status-error-bg)]',
    border: 'border-[var(--status-error-border)]',
    text: 'text-[var(--status-error-text)]',
    icon: 'text-[var(--status-error)]',
    defaultIcon: 'AlertCircle',
  },
  success: {
    bg: 'bg-[var(--status-success-bg)]',
    border: 'border-[var(--status-success-border)]',
    text: 'text-[var(--status-success-text)]',
    icon: 'text-[var(--status-success)]',
    defaultIcon: 'CheckCircle',
  },
  urgent: {
    bg: 'bg-[var(--status-error)]',
    border: 'border-[var(--status-error)]',
    text: 'text-white',
    icon: 'text-white',
    defaultIcon: 'AlertTriangle',
  },
}

export function NotificationBanner({
  variant = 'info',
  title,
  message,
  icon,
  action,
  dismissible = true,
  onDismiss,
  animate = false,
  className,
}: NotificationBannerProps): React.ReactElement | null {
  const [isVisible, setIsVisible] = useState(true)
  const [isExiting, setIsExiting] = useState(false)

  const styles = variantStyles[variant]
  const IconComponent = Icons[icon || styles.defaultIcon] as React.ComponentType<{
    className?: string
  }>

  const handleDismiss = (): void => {
    setIsExiting(true)
    setTimeout(() => {
      setIsVisible(false)
      onDismiss?.()
    }, 200)
  }

  if (!isVisible) return null

  return (
    <div
      role="alert"
      className={cn(
        'flex items-start gap-3 rounded-xl border p-4',
        styles.bg,
        styles.border,
        animate && variant === 'urgent' && 'animate-pulse',
        isExiting && 'animate-out fade-out-0 slide-out-to-top-2 duration-200',
        !isExiting && 'animate-in fade-in-0 slide-in-from-top-2 duration-300',
        className
      )}
    >
      <div className={cn('mt-0.5 shrink-0', styles.icon)}>
        <IconComponent className="h-5 w-5" />
      </div>

      <div className="min-w-0 flex-1">
        <p className={cn('text-sm font-bold', styles.text)}>{title}</p>
        {message && <p className={cn('mt-0.5 text-sm opacity-90', styles.text)}>{message}</p>}
      </div>

      {action && (
        <div className="shrink-0">
          {action.href ? (
            <Link
              href={action.href}
              className={cn(
                'inline-flex min-h-[32px] items-center rounded-lg px-3 py-1.5 text-sm font-bold transition-colors',
                variant === 'urgent'
                  ? 'bg-white/20 text-white hover:bg-white/30'
                  : 'border border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
              )}
            >
              {action.label}
            </Link>
          ) : (
            <button
              onClick={action.onClick}
              className={cn(
                'min-h-[32px] rounded-lg px-3 py-1.5 text-sm font-bold transition-colors',
                variant === 'urgent'
                  ? 'bg-white/20 text-white hover:bg-white/30'
                  : 'border border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
              )}
            >
              {action.label}
            </button>
          )}
        </div>
      )}

      {dismissible && (
        <button
          onClick={handleDismiss}
          className={cn(
            'shrink-0 rounded-lg p-1 transition-colors',
            variant === 'urgent'
              ? 'text-white/70 hover:bg-white/10 hover:text-white'
              : 'text-gray-400 hover:bg-gray-100 hover:text-gray-600'
          )}
          aria-label="Cerrar notificación"
        >
          <Icons.X className="h-4 w-4" />
        </button>
      )}
    </div>
  )
}

// ============================================
// Pre-configured Notification Banners
// ============================================

interface OverdueVaccinesBannerProps {
  count: number
  petName?: string
  clinic: string
  petId?: string
  onDismiss?: () => void
}

export function OverdueVaccinesBanner({
  count,
  petName,
  clinic,
  petId,
  onDismiss,
}: OverdueVaccinesBannerProps): React.ReactElement {
  return (
    <NotificationBanner
      variant="warning"
      icon="Syringe"
      title={
        petName
          ? `${petName} tiene ${count} vacuna${count > 1 ? 's' : ''} vencida${count > 1 ? 's' : ''}`
          : `Tienes ${count} vacuna${count > 1 ? 's' : ''} pendiente${count > 1 ? 's' : ''}`
      }
      message="Es importante mantener el calendario de vacunación al día."
      action={{
        label: 'Ver Vacunas',
        href: petId ? `/${clinic}/portal/pets/${petId}#vaccines` : `/${clinic}/portal/dashboard`,
      }}
      onDismiss={onDismiss}
    />
  )
}

interface PendingAppointmentBannerProps {
  appointmentDate: string
  appointmentTime: string
  serviceName: string
  clinic: string
  onDismiss?: () => void
}

export function PendingAppointmentBanner({
  appointmentDate,
  appointmentTime,
  serviceName,
  clinic,
  onDismiss,
}: PendingAppointmentBannerProps): React.ReactElement {
  return (
    <NotificationBanner
      variant="info"
      icon="Calendar"
      title={`Próxima cita: ${serviceName}`}
      message={`${appointmentDate} a las ${appointmentTime}`}
      action={{
        label: 'Ver Cita',
        href: `/${clinic}/portal/appointments`,
      }}
      onDismiss={onDismiss}
    />
  )
}

interface UnpaidInvoiceBannerProps {
  amount: string
  dueDate?: string
  invoiceId: string
  clinic: string
  onDismiss?: () => void
}

export function UnpaidInvoiceBanner({
  amount,
  dueDate,
  invoiceId,
  clinic,
  onDismiss,
}: UnpaidInvoiceBannerProps): React.ReactElement {
  return (
    <NotificationBanner
      variant="error"
      icon="Receipt"
      title={`Factura pendiente: ${amount}`}
      message={dueDate ? `Vencimiento: ${dueDate}` : 'Pago pendiente'}
      action={{
        label: 'Pagar Ahora',
        href: `/${clinic}/portal/invoices/${invoiceId}`,
      }}
      onDismiss={onDismiss}
    />
  )
}

interface AllergyAlertBannerProps {
  petName: string
  allergyDetails: string
  onDismiss?: () => void
}

export function AllergyAlertBanner({
  petName,
  allergyDetails,
  onDismiss,
}: AllergyAlertBannerProps): React.ReactElement {
  return (
    <NotificationBanner
      variant="urgent"
      icon="AlertTriangle"
      title={`¡Alerta Alérgica: ${petName}!`}
      message={allergyDetails}
      dismissible={false}
      animate
    />
  )
}

interface WelcomeBannerProps {
  userName: string
  clinic: string
  onDismiss?: () => void
}

export function WelcomeBanner({
  userName,
  clinic,
  onDismiss,
}: WelcomeBannerProps): React.ReactElement {
  return (
    <NotificationBanner
      variant="success"
      icon="PartyPopper"
      title={`¡Bienvenido${userName ? `, ${userName}` : ''}!`}
      message="Tu cuenta ha sido creada exitosamente. Agrega tu primera mascota para comenzar."
      action={{
        label: 'Agregar Mascota',
        href: `/${clinic}/portal/pets/new`,
      }}
      onDismiss={onDismiss}
    />
  )
}

// ============================================
// Notification Stack Component
// ============================================

interface Notification {
  id: string
  variant: BannerVariant
  title: string
  message?: string
  icon?: keyof typeof Icons
  action?: {
    label: string
    href?: string
    onClick?: () => void
  }
  dismissible?: boolean
  autoDismiss?: number // milliseconds
}

interface NotificationStackProps {
  notifications: Notification[]
  onDismiss?: (id: string) => void
  maxVisible?: number
  className?: string
}

export function NotificationStack({
  notifications,
  onDismiss,
  maxVisible = 3,
  className,
}: NotificationStackProps): React.ReactElement {
  const visibleNotifications = notifications.slice(0, maxVisible)
  const hiddenCount = Math.max(0, notifications.length - maxVisible)

  return (
    <div className={cn('space-y-3', className)}>
      {visibleNotifications.map((notification) => (
        <NotificationBanner
          key={notification.id}
          variant={notification.variant}
          title={notification.title}
          message={notification.message}
          icon={notification.icon}
          action={notification.action}
          dismissible={notification.dismissible ?? true}
          onDismiss={() => onDismiss?.(notification.id)}
        />
      ))}
      {hiddenCount > 0 && (
        <p className="text-center text-sm font-medium text-gray-500">
          +{hiddenCount} notificación{hiddenCount > 1 ? 'es' : ''} más
        </p>
      )}
    </div>
  )
}

// ============================================
// Auto-dismiss Hook
// ============================================

export function useAutoDismiss(
  notifications: Notification[],
  onDismiss: (id: string) => void
): void {
  useEffect(() => {
    const timers: NodeJS.Timeout[] = []

    notifications.forEach((notification) => {
      if (notification.autoDismiss) {
        const timer = setTimeout(() => {
          onDismiss(notification.id)
        }, notification.autoDismiss)
        timers.push(timer)
      }
    })

    return () => {
      timers.forEach(clearTimeout)
    }
  }, [notifications, onDismiss])
}
