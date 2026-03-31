/**
 * Status Styling Utilities
 *
 * Provides consistent theming for status indicators using CSS variables.
 * Use these instead of hardcoded Tailwind color classes like `bg-green-100`.
 *
 * @example
 * ```tsx
 * import { getStatusStyles } from '@/lib/utils/status-styles'
 *
 * // Get styles for a status
 * const styles = getStatusStyles('success')
 *
 * // Use in component
 * <div style={styles.container}>
 *   <span style={styles.text}>Active</span>
 * </div>
 *
 * // Or use class-based approach
 * <div className={statusClass('success', 'badge')}>Active</div>
 * ```
 */

export type StatusType = 'success' | 'warning' | 'error' | 'info' | 'neutral'

/**
 * Get inline styles for a status type
 */
export function getStatusStyles(status: StatusType) {
  const vars = {
    success: {
      main: 'var(--status-success)',
      light: 'var(--status-success-light)',
      dark: 'var(--status-success-dark)',
      bg: 'var(--status-success-bg)',
      border: 'var(--status-success-border)',
    },
    warning: {
      main: 'var(--status-warning)',
      light: 'var(--status-warning-light)',
      dark: 'var(--status-warning-dark)',
      bg: 'var(--status-warning-bg)',
      border: 'var(--status-warning-border)',
    },
    error: {
      main: 'var(--status-error)',
      light: 'var(--status-error-light)',
      dark: 'var(--status-error-dark)',
      bg: 'var(--status-error-bg)',
      border: 'var(--status-error-border)',
    },
    info: {
      main: 'var(--status-info)',
      light: 'var(--status-info-light)',
      dark: 'var(--status-info-dark)',
      bg: 'var(--status-info-bg)',
      border: 'var(--status-info-border)',
    },
    neutral: {
      main: 'var(--text-secondary)',
      light: 'var(--text-muted)',
      dark: 'var(--text-primary)',
      bg: 'var(--bg-subtle)',
      border: 'var(--border-light)',
    },
  }

  const v = vars[status]

  return {
    /** Container with background and border */
    container: {
      backgroundColor: v.bg,
      borderColor: v.border,
    } as React.CSSProperties,

    /** Badge style (pill with text) */
    badge: {
      backgroundColor: v.bg,
      color: v.dark,
      borderColor: v.border,
    } as React.CSSProperties,

    /** Text color */
    text: {
      color: v.main,
    } as React.CSSProperties,

    /** Text color (dark variant) */
    textDark: {
      color: v.dark,
    } as React.CSSProperties,

    /** Icon color */
    icon: {
      color: v.main,
    } as React.CSSProperties,

    /** Alert/notification style */
    alert: {
      backgroundColor: v.bg,
      borderLeft: `4px solid ${v.main}`,
      color: v.dark,
    } as React.CSSProperties,

    /** Card with colored border */
    card: {
      backgroundColor: 'var(--bg-paper)',
      borderColor: v.light,
    } as React.CSSProperties,

    /** Dot indicator */
    dot: {
      backgroundColor: v.main,
    } as React.CSSProperties,
  }
}

/**
 * Status to CSS variable mapping
 */
export const STATUS_VARS = {
  success: {
    bg: 'bg-[var(--status-success-bg)]',
    text: 'text-[var(--status-success)]',
    textDark: 'text-[var(--status-success-dark)]',
    border: 'border-[var(--status-success-border)]',
    borderLight: 'border-[var(--status-success-light)]',
  },
  warning: {
    bg: 'bg-[var(--status-warning-bg)]',
    text: 'text-[var(--status-warning)]',
    textDark: 'text-[var(--status-warning-dark)]',
    border: 'border-[var(--status-warning-border)]',
    borderLight: 'border-[var(--status-warning-light)]',
  },
  error: {
    bg: 'bg-[var(--status-error-bg)]',
    text: 'text-[var(--status-error)]',
    textDark: 'text-[var(--status-error-dark)]',
    border: 'border-[var(--status-error-border)]',
    borderLight: 'border-[var(--status-error-light)]',
  },
  info: {
    bg: 'bg-[var(--status-info-bg)]',
    text: 'text-[var(--status-info)]',
    textDark: 'text-[var(--status-info-dark)]',
    border: 'border-[var(--status-info-border)]',
    borderLight: 'border-[var(--status-info-light)]',
  },
  neutral: {
    bg: 'bg-[var(--bg-subtle)]',
    text: 'text-[var(--text-secondary)]',
    textDark: 'text-[var(--text-primary)]',
    border: 'border-[var(--border-light)]',
    borderLight: 'border-[var(--border-light)]',
  },
} as const

/**
 * Get Tailwind-style class name for a status
 */
export function statusClass(status: StatusType, variant: 'bg' | 'text' | 'textDark' | 'border' | 'badge' = 'text'): string {
  const v = STATUS_VARS[status]

  switch (variant) {
    case 'bg':
      return v.bg
    case 'text':
      return v.text
    case 'textDark':
      return v.textDark
    case 'border':
      return v.border
    case 'badge':
      return `${v.bg} ${v.textDark} ${v.border} border px-2 py-0.5 rounded-full text-xs font-medium`
    default:
      return v.text
  }
}

/**
 * Map common status strings to StatusType
 */
export function mapToStatusType(status: string): StatusType {
  const statusLower = status.toLowerCase()

  // Success states
  if (['active', 'approved', 'completed', 'confirmed', 'paid', 'verified', 'success', 'done', 'available', 'in_stock'].includes(statusLower)) {
    return 'success'
  }

  // Warning states
  if (['pending', 'processing', 'scheduled', 'awaiting', 'draft', 'low_stock', 'expiring'].includes(statusLower)) {
    return 'warning'
  }

  // Error states
  if (['cancelled', 'failed', 'rejected', 'overdue', 'expired', 'out_of_stock', 'error', 'inactive'].includes(statusLower)) {
    return 'error'
  }

  // Info states
  if (['new', 'review', 'submitted', 'in_progress', 'checked_in'].includes(statusLower)) {
    return 'info'
  }

  return 'neutral'
}

/**
 * Status Badge Component helper
 * Returns the appropriate classes for a status badge
 */
export function getStatusBadgeClasses(status: string): string {
  const statusType = mapToStatusType(status)
  return statusClass(statusType, 'badge')
}

/**
 * Status dot indicator classes
 */
export function getStatusDotClasses(status: string): string {
  const statusType = mapToStatusType(status)
  const v = STATUS_VARS[statusType]
  return `${v.bg} w-2 h-2 rounded-full`
}
