import { forwardRef } from 'react'
import { Loader2 } from 'lucide-react'
import { clsx } from 'clsx'

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'destructive' | 'outline'
  size?: 'sm' | 'md' | 'lg'
  isLoading?: boolean
  loadingLabel?: string
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      isLoading = false,
      loadingLabel = 'Loading...',
      leftIcon,
      rightIcon,
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    // A11Y-004: Use distinct colors for disabled state instead of just opacity for better contrast
    const baseStyles =
      'inline-flex items-center justify-center font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2 disabled:pointer-events-none disabled:cursor-not-allowed'

    const disabledStyles =
      'disabled:bg-gray-200 disabled:text-gray-500 disabled:border-gray-200 disabled:shadow-none disabled:hover:transform-none'

    const variants = {
      primary:
        'bg-[var(--primary)] text-white shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98]',
      secondary:
        'border-2 border-[var(--primary)] text-[var(--primary)] bg-transparent hover:bg-[var(--primary)] hover:text-white',
      ghost:
        'text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)]',
      destructive:
        'bg-[var(--status-error,#ef4444)] text-white shadow-lg hover:opacity-90 hover:shadow-xl',
      outline:
        'border border-[var(--border,#e5e7eb)] bg-[var(--bg-paper)] text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] hover:border-[var(--border-strong,#d1d5db)]',
    }

    const sizes = {
      sm: 'px-3 py-2 text-sm rounded-lg gap-1.5',
      md: 'px-5 py-3 text-base rounded-xl gap-2',
      lg: 'px-8 py-4 text-lg rounded-2xl gap-3',
    }

    return (
      <button
        ref={ref}
        className={clsx(baseStyles, variants[variant], sizes[size], disabledStyles, className)}
        disabled={disabled || isLoading}
        aria-busy={isLoading}
        aria-live={isLoading ? 'polite' : undefined}
        {...props}
      >
        {isLoading ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
            <span className="sr-only">{loadingLabel}</span>
          </>
        ) : (
          <>
            {leftIcon && (
              <span className="flex-shrink-0" aria-hidden="true">
                {leftIcon}
              </span>
            )}
            {children}
            {rightIcon && (
              <span className="flex-shrink-0" aria-hidden="true">
                {rightIcon}
              </span>
            )}
          </>
        )}
      </button>
    )
  }
)

Button.displayName = 'Button'

export { Button }
