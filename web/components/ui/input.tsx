import { forwardRef } from 'react'
import { clsx } from 'clsx'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
  inputSize?: 'sm' | 'md' | 'lg'
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, hint, leftIcon, rightIcon, inputSize = 'md', id, ...props }, ref) => {
    const inputId = id || props.name

    const sizes = {
      sm: 'px-3 py-2 text-sm',
      md: 'px-4 py-3 text-base',
      lg: 'px-5 py-4 text-lg',
    }

    const baseInputStyles = clsx(
      'w-full rounded-xl border outline-none transition-colors',
      'placeholder:text-[var(--text-muted)]',
      'disabled:bg-[var(--bg-subtle)] disabled:text-[var(--text-muted)] disabled:cursor-not-allowed',
      sizes[inputSize],
      leftIcon && 'pl-11',
      rightIcon && 'pr-11',
      error
        ? 'border-[var(--status-error-light,#fca5a5)] focus:border-[var(--status-error,#ef4444)] focus:ring-2 focus:ring-[var(--status-error,#ef4444)]/20'
        : 'border-[var(--border,#e5e7eb)] focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20'
    )

    return (
      <div className={className}>
        {label && (
          <label
            htmlFor={inputId}
            className="mb-2 block text-sm font-bold text-[var(--text-secondary)]"
          >
            {label}
            {props.required && <span className="ml-1 text-[var(--status-error,#ef4444)]">*</span>}
          </label>
        )}

        <div className="relative">
          {leftIcon && (
            <div className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]">
              {leftIcon}
            </div>
          )}

          <input
            ref={ref}
            id={inputId}
            className={baseInputStyles}
            aria-invalid={error ? 'true' : undefined}
            aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
            {...props}
          />

          {rightIcon && (
            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]">
              {rightIcon}
            </div>
          )}
        </div>

        {error && (
          <p
            id={`${inputId}-error`}
            role="alert"
            className="mt-1.5 flex items-center gap-1 text-sm text-[var(--status-error,#ef4444)]"
          >
            {error}
          </p>
        )}

        {hint && !error && (
          <p id={`${inputId}-hint`} className="mt-1.5 text-sm text-[var(--text-muted)]">
            {hint}
          </p>
        )}
      </div>
    )
  }
)

Input.displayName = 'Input'

// Textarea variant
export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
  hint?: string
}

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, hint, id, ...props }, ref) => {
    const inputId = id || props.name

    const baseStyles = clsx(
      'w-full px-4 py-3 rounded-xl border outline-none transition-colors resize-none',
      'placeholder:text-[var(--text-muted)]',
      'disabled:bg-[var(--bg-subtle)] disabled:text-[var(--text-muted)] disabled:cursor-not-allowed',
      error
        ? 'border-[var(--status-error-light,#fca5a5)] focus:border-[var(--status-error,#ef4444)] focus:ring-2 focus:ring-[var(--status-error,#ef4444)]/20'
        : 'border-[var(--border,#e5e7eb)] focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20'
    )

    return (
      <div className={className}>
        {label && (
          <label
            htmlFor={inputId}
            className="mb-2 block text-sm font-bold text-[var(--text-secondary)]"
          >
            {label}
            {props.required && <span className="ml-1 text-[var(--status-error,#ef4444)]">*</span>}
          </label>
        )}

        <textarea
          ref={ref}
          id={inputId}
          className={baseStyles}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
          {...props}
        />

        {error && (
          <p
            id={`${inputId}-error`}
            role="alert"
            className="mt-1.5 text-sm text-[var(--status-error,#ef4444)]"
          >
            {error}
          </p>
        )}

        {hint && !error && (
          <p id={`${inputId}-hint`} className="mt-1.5 text-sm text-[var(--text-muted)]">
            {hint}
          </p>
        )}
      </div>
    )
  }
)

Textarea.displayName = 'Textarea'

// Select variant
export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
  hint?: string
  options: Array<{ value: string; label: string }>
  placeholder?: string
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, error, hint, options, placeholder, id, ...props }, ref) => {
    const inputId = id || props.name

    const baseStyles = clsx(
      'w-full px-4 py-3 rounded-xl border outline-none transition-colors bg-[var(--bg-paper)] appearance-none',
      'disabled:bg-[var(--bg-subtle)] disabled:text-[var(--text-muted)] disabled:cursor-not-allowed',
      error
        ? 'border-[var(--status-error-light,#fca5a5)] focus:border-[var(--status-error,#ef4444)] focus:ring-2 focus:ring-[var(--status-error,#ef4444)]/20'
        : 'border-[var(--border,#e5e7eb)] focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20'
    )

    return (
      <div className={className}>
        {label && (
          <label
            htmlFor={inputId}
            className="mb-2 block text-sm font-bold text-[var(--text-secondary)]"
          >
            {label}
            {props.required && <span className="ml-1 text-[var(--status-error,#ef4444)]">*</span>}
          </label>
        )}

        <div className="relative">
          <select
            ref={ref}
            id={inputId}
            className={baseStyles}
            aria-invalid={error ? 'true' : undefined}
            aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
            {...props}
          >
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            {options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2">
            <svg
              className="h-4 w-4 text-[var(--text-muted)]"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </div>
        </div>

        {error && (
          <p
            id={`${inputId}-error`}
            role="alert"
            className="mt-1.5 text-sm text-[var(--status-error,#ef4444)]"
          >
            {error}
          </p>
        )}

        {hint && !error && (
          <p id={`${inputId}-hint`} className="mt-1.5 text-sm text-[var(--text-muted)]">
            {hint}
          </p>
        )}
      </div>
    )
  }
)

Select.displayName = 'Select'

export { Input, Textarea, Select }
