'use client'

import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'
import { useTranslations } from 'next-intl'
import {
  CheckCircle,
  Clock,
  XCircle,
  AlertCircle,
  AlertTriangle,
  Loader2,
  Ban,
  CircleDot,
  type LucideIcon,
} from 'lucide-react'

const statusBadgeVariants = cva(
  'inline-flex items-center gap-1.5 font-bold text-xs uppercase tracking-wide rounded-full transition-colors',
  {
    variants: {
      variant: {
        // Success states
        success: 'bg-[var(--status-success-bg)] text-[var(--status-success-text)] border border-[var(--status-success-border)]',
        confirmed: 'bg-[var(--status-success-bg)] text-[var(--status-success-text)] border border-[var(--status-success-border)]',
        paid: 'bg-[var(--status-success-bg)] text-[var(--status-success-text)] border border-[var(--status-success-border)]',
        verified: 'bg-[var(--status-success-bg)] text-[var(--status-success-text)] border border-[var(--status-success-border)]',
        completed: 'bg-[var(--status-success-bg)] text-[var(--status-success-text)] border border-[var(--status-success-border)]',
        active: 'bg-[var(--status-success-bg)] text-[var(--status-success-text)] border border-[var(--status-success-border)]',

        // Warning states
        warning: 'bg-[var(--status-warning-bg)] text-[var(--status-warning-text)] border border-[var(--status-warning-border)]',
        pending: 'bg-[var(--status-warning-bg)] text-[var(--status-warning-text)] border border-[var(--status-warning-border)]',
        review: 'bg-[var(--status-warning-bg)] text-[var(--status-warning-text)] border border-[var(--status-warning-border)]',
        upcoming: 'bg-[var(--status-warning-bg)] text-[var(--status-warning-text)] border border-[var(--status-warning-border)]',
        expiring: 'bg-[var(--status-warning-bg)] text-[var(--status-warning-text)] border border-[var(--status-warning-border)]',

        // Error states
        error: 'bg-[var(--status-error-bg)] text-[var(--status-error-text)] border border-[var(--status-error-border)]',
        rejected: 'bg-[var(--status-error-bg)] text-[var(--status-error-text)] border border-[var(--status-error-border)]',
        overdue: 'bg-[var(--status-error-bg)] text-[var(--status-error-text)] border border-[var(--status-error-border)]',
        cancelled: 'bg-[var(--status-error-bg)] text-[var(--status-error-text)] border border-[var(--status-error-border)]',
        critical: 'bg-[var(--status-error-bg)] text-[var(--status-error-text)] border border-[var(--status-error-border)]',
        expired: 'bg-[var(--status-error-bg)] text-[var(--status-error-text)] border border-[var(--status-error-border)]',

        // Info states
        info: 'bg-[var(--status-info-bg)] text-[var(--status-info-text)] border border-[var(--status-info-border)]',
        scheduled: 'bg-[var(--status-info-bg)] text-[var(--status-info-text)] border border-[var(--status-info-border)]',
        sent: 'bg-[var(--status-info-bg)] text-[var(--status-info-text)] border border-[var(--status-info-border)]',
        'in-progress': 'bg-[var(--status-info-bg)] text-[var(--status-info-text)] border border-[var(--status-info-border)]',
        processing: 'bg-[var(--status-info-bg)] text-[var(--status-info-text)] border border-[var(--status-info-border)]',

        // Purple states (special/in consultation)
        purple: 'bg-[var(--status-special-bg)] text-[var(--status-special-text)] border border-[var(--status-special-border)]',
        'in-consultation': 'bg-[var(--status-special-bg)] text-[var(--status-special-text)] border border-[var(--status-special-border)]',
        hospitalized: 'bg-[var(--status-special-bg)] text-[var(--status-special-text)] border border-[var(--status-special-border)]',

        // Orange states
        orange: 'bg-[var(--status-warning-bg)] text-[var(--status-warning-text)] border border-[var(--status-warning-border)]',
        'no-show': 'bg-[var(--status-warning-bg)] text-[var(--status-warning-text)] border border-[var(--status-warning-border)]',
        urgent: 'bg-[var(--status-warning-bg)] text-[var(--status-warning-text)] border border-[var(--status-warning-border)]',

        // Neutral states
        neutral: 'bg-[var(--status-neutral-bg)] text-[var(--status-neutral-text)] border border-[var(--status-neutral-border)]',
        draft: 'bg-[var(--status-neutral-bg)] text-[var(--status-neutral-text)] border border-[var(--status-neutral-border)]',
        inactive: 'bg-[var(--status-neutral-bg)] text-[var(--status-neutral-text)] border border-[var(--status-neutral-border)]',
        unknown: 'bg-[var(--status-neutral-bg)] text-[var(--status-neutral-text)] border border-[var(--status-neutral-border)]',
      },
      size: {
        sm: 'px-2 py-0.5 text-[10px]',
        md: 'px-2.5 py-1 text-xs',
        lg: 'px-3 py-1.5 text-sm',
      },
    },
    defaultVariants: {
      variant: 'neutral',
      size: 'md',
    },
  }
)

// Icon mapping for each variant
const variantIcons: Record<string, LucideIcon> = {
  success: CheckCircle,
  confirmed: CheckCircle,
  paid: CheckCircle,
  verified: CheckCircle,
  completed: CheckCircle,
  active: CheckCircle,

  warning: AlertTriangle,
  pending: Clock,
  review: Clock,
  upcoming: Clock,
  expiring: AlertTriangle,

  error: XCircle,
  rejected: XCircle,
  overdue: AlertCircle,
  cancelled: Ban,
  critical: AlertCircle,
  expired: XCircle,

  info: CircleDot,
  scheduled: Clock,
  sent: CheckCircle,
  'in-progress': Loader2,
  processing: Loader2,

  purple: CircleDot,
  'in-consultation': CircleDot,
  hospitalized: CircleDot,

  orange: AlertTriangle,
  'no-show': Ban,
  urgent: AlertTriangle,

  neutral: CircleDot,
  draft: CircleDot,
  inactive: CircleDot,
  unknown: CircleDot,
}

// Map variant keys to translation keys (handles hyphenated variants)
const variantToTranslationKey: Record<string, string> = {
  success: 'success',
  confirmed: 'confirmed',
  paid: 'paid',
  verified: 'verified',
  completed: 'completed',
  active: 'active',
  warning: 'warning',
  pending: 'pending',
  review: 'review',
  upcoming: 'upcoming',
  expiring: 'expiring',
  error: 'error',
  rejected: 'rejected',
  overdue: 'overdue',
  cancelled: 'cancelled',
  critical: 'critical',
  expired: 'expired',
  info: 'info',
  scheduled: 'scheduled',
  sent: 'sent',
  'in-progress': 'inProgress',
  processing: 'processing',
  purple: 'purple',
  'in-consultation': 'inConsultation',
  hospitalized: 'hospitalized',
  orange: 'orange',
  'no-show': 'noShow',
  urgent: 'urgent',
  neutral: 'neutral',
  draft: 'draft',
  inactive: 'inactive',
  unknown: 'unknown',
}

export interface StatusBadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>, VariantProps<typeof statusBadgeVariants> {
  showIcon?: boolean
  label?: string
  pulse?: boolean
}

export function StatusBadge({
  className,
  variant = 'neutral',
  size,
  showIcon = true,
  label,
  pulse = false,
  ...props
}: StatusBadgeProps): React.ReactElement {
  const t = useTranslations('common.status')
  const Icon = variant ? variantIcons[variant] || CircleDot : CircleDot
  const translationKey = variant ? variantToTranslationKey[variant] || 'unknown' : 'unknown'
  const defaultLabel = t(translationKey)
  const displayLabel = label || defaultLabel
  const isAnimated = variant === 'in-progress' || variant === 'processing'

  return (
    <span
      className={cn(statusBadgeVariants({ variant, size }), pulse && 'animate-pulse', className)}
      aria-label={t('ariaLabel', { status: displayLabel })}
      {...props}
    >
      {showIcon && (
        <Icon
          className={cn(
            size === 'sm' ? 'h-3 w-3' : size === 'lg' ? 'h-4 w-4' : 'h-3.5 w-3.5',
            isAnimated && 'animate-spin'
          )}
          aria-hidden="true"
        />
      )}
      <span>{displayLabel}</span>
    </span>
  )
}

// Appointment-specific status mapper
export function getAppointmentStatus(status: string): StatusBadgeProps['variant'] {
  const map: Record<string, StatusBadgeProps['variant']> = {
    pending: 'pending',
    confirmed: 'confirmed',
    checked_in: 'info',
    in_progress: 'in-consultation',
    completed: 'completed',
    cancelled: 'cancelled',
    no_show: 'no-show',
  }
  return map[status] || 'neutral'
}

// Invoice-specific status mapper
export function getInvoiceStatus(status: string): StatusBadgeProps['variant'] {
  const map: Record<string, StatusBadgeProps['variant']> = {
    draft: 'draft',
    sent: 'sent',
    pending: 'pending',
    paid: 'paid',
    partial: 'warning',
    overdue: 'overdue',
    cancelled: 'cancelled',
    refunded: 'neutral',
  }
  return map[status] || 'neutral'
}

// Vaccine-specific status mapper
export function getVaccineStatus(status: string): StatusBadgeProps['variant'] {
  const map: Record<string, StatusBadgeProps['variant']> = {
    verified: 'verified',
    pending: 'review',
    rejected: 'rejected',
    upcoming: 'upcoming',
    expired: 'expired',
  }
  return map[status] || 'neutral'
}

// Lab order-specific status mapper
export function getLabOrderStatus(status: string): StatusBadgeProps['variant'] {
  const map: Record<string, StatusBadgeProps['variant']> = {
    pending: 'pending',
    in_progress: 'in-progress',
    completed: 'completed',
    cancelled: 'cancelled',
    critical: 'critical',
  }
  return map[status] || 'neutral'
}

// Hospitalization-specific status mapper
export function getHospitalizationStatus(status: string): StatusBadgeProps['variant'] {
  const map: Record<string, StatusBadgeProps['variant']> = {
    admitted: 'hospitalized',
    in_treatment: 'in-progress',
    stable: 'success',
    critical: 'critical',
    discharged: 'completed',
  }
  return map[status] || 'neutral'
}

export { statusBadgeVariants }
