import { forwardRef } from 'react'
import { cn } from '@/lib/utils'

export interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  required?: boolean
  optional?: boolean
  error?: boolean
}

/**
 * Label component for form fields
 *
 * Features:
 * - Required indicator (red asterisk)
 * - Optional indicator (muted text)
 * - Error state styling
 * - Theme-aware colors
 */
export const Label = forwardRef<HTMLLabelElement, LabelProps>(
  ({ className, required, optional, error, children, ...props }, ref) => {
    return (
      <label
        ref={ref}
        className={cn(
          'mb-2 block text-sm font-bold',
          error ? 'text-[var(--status-error,#ef4444)]' : 'text-[var(--text-secondary)]',
          className
        )}
        {...props}
      >
        {children}
        {required && (
          <span className="ml-1 text-[var(--status-error,#ef4444)]" aria-label="required">
            *
          </span>
        )}
        {optional && !required && (
          <span className="ml-1 text-xs font-normal text-[var(--text-muted)]">(opcional)</span>
        )}
      </label>
    )
  }
)

Label.displayName = 'Label'
