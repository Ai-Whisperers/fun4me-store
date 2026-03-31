'use client'

import { forwardRef } from 'react'
import { Loader2 } from 'lucide-react'
import { clsx } from 'clsx'

/**
 * IconButton Component
 *
 * A11Y-003: Icon-only button with required aria-label for accessibility.
 * Use this for buttons that only show an icon without visible text.
 *
 * @example
 * <IconButton
 *   icon={<Trash2 className="h-4 w-4" />}
 *   aria-label="Eliminar elemento"
 *   onClick={() => handleDelete()}
 * />
 */
export interface IconButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  /** The icon to display - required */
  icon: React.ReactNode
  /** Required for accessibility - describes the button's action */
  'aria-label': string
  /** Button style variant */
  variant?: 'ghost' | 'outline' | 'destructive' | 'primary'
  /** Button size */
  size?: 'xs' | 'sm' | 'md' | 'lg'
  /** Shows loading spinner */
  isLoading?: boolean
}

const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  (
    {
      icon,
      'aria-label': ariaLabel,
      variant = 'ghost',
      size = 'md',
      isLoading = false,
      className,
      disabled,
      ...props
    },
    ref
  ) => {
    const baseStyles =
      'inline-flex items-center justify-center rounded-lg transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50'

    const variants = {
      ghost: 'text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)]',
      outline:
        'border border-[var(--border)] bg-transparent text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)]',
      destructive: 'text-red-500 hover:bg-red-50 hover:text-red-700',
      primary: 'bg-[var(--primary)] text-white hover:opacity-90',
    }

    const sizes = {
      xs: 'p-1',
      sm: 'p-1.5',
      md: 'p-2',
      lg: 'p-3',
    }

    const iconSizes = {
      xs: 'h-3 w-3',
      sm: 'h-4 w-4',
      md: 'h-5 w-5',
      lg: 'h-6 w-6',
    }

    return (
      <button
        ref={ref}
        type="button"
        className={clsx(baseStyles, variants[variant], sizes[size], className)}
        disabled={disabled || isLoading}
        aria-label={ariaLabel}
        aria-busy={isLoading}
        {...props}
      >
        {isLoading ? (
          <Loader2 className={clsx('animate-spin', iconSizes[size])} aria-hidden="true" />
        ) : (
          <span aria-hidden="true">{icon}</span>
        )}
      </button>
    )
  }
)

IconButton.displayName = 'IconButton'

export { IconButton }
