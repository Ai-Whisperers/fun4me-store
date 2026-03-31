'use client'

import { cn } from '@/lib/utils'

export interface ProgressProps {
  /** Current value (0-100 or custom max) */
  value: number
  /** Maximum value (default: 100) */
  max?: number
  /** Optional label to display */
  label?: string
  /** Show percentage text */
  showPercentage?: boolean
  /** Size variant */
  size?: 'sm' | 'md' | 'lg'
  /** Color variant */
  variant?: 'default' | 'success' | 'warning' | 'error'
  /** Whether the progress is indeterminate (animated) */
  indeterminate?: boolean
  /** Additional CSS classes */
  className?: string
}

/**
 * Progress - A versatile progress bar component
 *
 * @example
 * // Determinate progress
 * <Progress value={75} label="Uploading..." showPercentage />
 *
 * @example
 * // Indeterminate loading
 * <Progress indeterminate label="Processing..." />
 *
 * @example
 * // Custom max value
 * <Progress value={3} max={5} label="Step 3 of 5" />
 */
export function Progress({
  value,
  max = 100,
  label,
  showPercentage = false,
  size = 'md',
  variant = 'default',
  indeterminate = false,
  className,
}: ProgressProps): React.ReactElement {
  const percentage = Math.min(100, Math.max(0, Math.round((value / max) * 100)))

  const sizeClasses = {
    sm: 'h-1',
    md: 'h-2',
    lg: 'h-3',
  }

  const variantClasses = {
    default: 'bg-[var(--primary)]',
    success: 'bg-green-500',
    warning: 'bg-amber-500',
    error: 'bg-red-500',
  }

  return (
    <div className={cn('w-full', className)} role="progressbar" aria-valuenow={indeterminate ? undefined : value} aria-valuemin={0} aria-valuemax={max} aria-label={label}>
      {(label || showPercentage) && (
        <div className="mb-1.5 flex items-center justify-between text-sm">
          {label && <span className="font-medium text-[var(--text-secondary)]">{label}</span>}
          {showPercentage && !indeterminate && (
            <span className="font-bold text-[var(--text-primary)]">{percentage}%</span>
          )}
        </div>
      )}
      <div
        className={cn(
          'overflow-hidden rounded-full bg-gray-200',
          sizeClasses[size]
        )}
      >
        <div
          className={cn(
            'h-full rounded-full transition-all duration-300 ease-out',
            variantClasses[variant],
            indeterminate && 'animate-indeterminate w-1/3'
          )}
          style={indeterminate ? undefined : { width: `${percentage}%` }}
        />
      </div>
    </div>
  )
}

export interface CircularProgressProps {
  /** Current value (0-100) */
  value?: number
  /** Size in pixels */
  size?: number
  /** Stroke width */
  strokeWidth?: number
  /** Color variant */
  variant?: 'default' | 'success' | 'warning' | 'error'
  /** Whether the progress is indeterminate (animated spinner) */
  indeterminate?: boolean
  /** Show percentage in center */
  showPercentage?: boolean
  /** Additional CSS classes */
  className?: string
  /** Children to display in center */
  children?: React.ReactNode
}

/**
 * CircularProgress - A circular progress indicator
 *
 * @example
 * // Determinate circular progress
 * <CircularProgress value={75} showPercentage />
 *
 * @example
 * // Spinner
 * <CircularProgress indeterminate />
 */
export function CircularProgress({
  value = 0,
  size = 48,
  strokeWidth = 4,
  variant = 'default',
  indeterminate = false,
  showPercentage = false,
  className,
  children,
}: CircularProgressProps): React.ReactElement {
  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const percentage = Math.min(100, Math.max(0, value))
  const offset = circumference - (percentage / 100) * circumference

  const variantColors = {
    default: 'stroke-[var(--primary)]',
    success: 'stroke-green-500',
    warning: 'stroke-amber-500',
    error: 'stroke-red-500',
  }

  return (
    <div className={cn('relative inline-flex items-center justify-center', className)}>
      <svg
        width={size}
        height={size}
        className={cn(indeterminate && 'animate-spin')}
        aria-hidden="true"
      >
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-gray-200"
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          className={cn(
            variantColors[variant],
            'transition-all duration-300 ease-out'
          )}
          style={{
            strokeDasharray: circumference,
            strokeDashoffset: indeterminate ? circumference * 0.75 : offset,
            transform: 'rotate(-90deg)',
            transformOrigin: '50% 50%',
          }}
        />
      </svg>
      {/* Center content */}
      {(showPercentage || children) && !indeterminate && (
        <div className="absolute inset-0 flex items-center justify-center">
          {children || (
            <span className="text-xs font-bold text-[var(--text-primary)]">
              {percentage}%
            </span>
          )}
        </div>
      )}
    </div>
  )
}

/**
 * ProgressOverlay - Full-screen or container overlay with progress
 *
 * @example
 * <ProgressOverlay
 *   isVisible={isUploading}
 *   progress={uploadProgress}
 *   message="Uploading files..."
 * />
 */
export interface ProgressOverlayProps {
  /** Whether the overlay is visible */
  isVisible: boolean
  /** Progress value (0-100), omit for indeterminate */
  progress?: number
  /** Message to display */
  message?: string
  /** Whether to cover the full screen or just the container */
  fullScreen?: boolean
  /** Additional CSS classes */
  className?: string
}

export function ProgressOverlay({
  isVisible,
  progress,
  message,
  fullScreen = false,
  className,
}: ProgressOverlayProps): React.ReactElement | null {
  if (!isVisible) return null

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-4 bg-white/90 backdrop-blur-sm',
        fullScreen ? 'fixed inset-0 z-50' : 'absolute inset-0 rounded-lg',
        className
      )}
      role="alert"
      aria-live="polite"
      aria-busy="true"
    >
      {progress !== undefined ? (
        <CircularProgress value={progress} size={64} showPercentage />
      ) : (
        <CircularProgress indeterminate size={64} />
      )}
      {message && (
        <p className="text-sm font-medium text-[var(--text-secondary)]">{message}</p>
      )}
    </div>
  )
}
