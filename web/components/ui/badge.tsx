import { forwardRef } from 'react'
import { clsx } from 'clsx'

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?:
    | 'default'
    | 'primary'
    | 'secondary'
    | 'success'
    | 'warning'
    | 'danger'
    | 'info'
    | 'outline'
  size?: 'sm' | 'md' | 'lg'
  dot?: boolean
  icon?: React.ReactNode
}

const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant = 'default', size = 'md', dot = false, icon, children, ...props }, ref) => {
    const baseStyles = 'inline-flex items-center font-medium rounded-full transition-colors'

    const variants = {
      default: 'bg-[var(--bg-subtle)] text-[var(--text-secondary)]',
      primary: 'bg-[var(--primary)]/10 text-[var(--primary)]',
      secondary: 'bg-[var(--accent)]/10 text-[var(--secondary-dark)]',
      success: 'bg-[var(--status-success-bg,#dcfce7)] text-[var(--status-success,#15803d)]',
      warning: 'bg-[var(--status-warning-bg,#fef3c7)] text-[var(--status-warning,#a16207)]',
      danger: 'bg-[var(--status-error-bg,#fee2e2)] text-[var(--status-error,#dc2626)]',
      info: 'bg-[var(--status-info-bg,#dbeafe)] text-[var(--status-info,#1d4ed8)]',
      outline:
        'border border-[var(--border,#e5e7eb)] bg-[var(--bg-paper)] text-[var(--text-secondary)]',
    }

    const sizes = {
      sm: 'text-xs px-2 py-0.5 gap-1',
      md: 'text-xs px-2.5 py-1 gap-1.5',
      lg: 'text-sm px-3 py-1.5 gap-2',
    }

    const dotColors = {
      default: 'bg-[var(--text-muted)]',
      primary: 'bg-[var(--primary)]',
      secondary: 'bg-[var(--accent)]',
      success: 'bg-[var(--status-success,#22c55e)]',
      warning: 'bg-[var(--status-warning,#eab308)]',
      danger: 'bg-[var(--status-error,#ef4444)]',
      info: 'bg-[var(--status-info,#3b82f6)]',
      outline: 'bg-[var(--text-muted)]',
    }

    return (
      <span
        ref={ref}
        className={clsx(baseStyles, variants[variant], sizes[size], className)}
        {...props}
      >
        {dot && (
          <span className={clsx('h-1.5 w-1.5 flex-shrink-0 rounded-full', dotColors[variant])} />
        )}
        {icon && <span className="flex-shrink-0">{icon}</span>}
        {children}
      </span>
    )
  }
)

Badge.displayName = 'Badge'

// Status badge for common status types
interface StatusBadgeProps extends Omit<BadgeProps, 'variant'> {
  status: 'active' | 'inactive' | 'pending' | 'completed' | 'cancelled' | 'overdue'
}

function StatusBadge({ status, ...props }: StatusBadgeProps): React.ReactElement {
  const statusConfig = {
    active: { variant: 'success' as const, label: 'Activo', dot: true },
    inactive: { variant: 'default' as const, label: 'Inactivo', dot: true },
    pending: { variant: 'warning' as const, label: 'Pendiente', dot: true },
    completed: { variant: 'success' as const, label: 'Completado', dot: false },
    cancelled: { variant: 'danger' as const, label: 'Cancelado', dot: false },
    overdue: { variant: 'danger' as const, label: 'Vencido', dot: true },
  }

  const config = statusConfig[status]

  return (
    <Badge variant={config.variant} dot={config.dot} {...props}>
      {props.children || config.label}
    </Badge>
  )
}

// Pet species badge
interface SpeciesBadgeProps extends Omit<BadgeProps, 'variant' | 'icon'> {
  species: 'dog' | 'cat' | 'other'
}

function SpeciesBadge({ species, ...props }: SpeciesBadgeProps): React.ReactElement {
  const speciesConfig = {
    dog: { label: 'Perro', emoji: '🐕' },
    cat: { label: 'Gato', emoji: '🐈' },
    other: { label: 'Otro', emoji: '🐾' },
  }

  const config = speciesConfig[species]

  return (
    <Badge variant="secondary" {...props}>
      <span>{config.emoji}</span>
      {props.children || config.label}
    </Badge>
  )
}

export { Badge, StatusBadge, SpeciesBadge }
