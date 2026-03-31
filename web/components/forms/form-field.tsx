/**
 * Form Field Component
 *
 * A11Y-003: Screen reader compatibility
 *
 * Wrapper component that ensures proper accessibility for form fields:
 * - Proper label association via htmlFor/id
 * - aria-describedby for hints and errors
 * - aria-invalid for validation state
 * - Required indicator with screen reader text
 *
 * @example
 * ```tsx
 * <FormField
 *   id="email"
 *   label="Correo electronico"
 *   error={errors.email}
 *   hint="Usaremos este correo para notificaciones"
 *   required
 * >
 *   <input
 *     type="email"
 *     name="email"
 *     value={email}
 *     onChange={handleChange}
 *   />
 * </FormField>
 * ```
 */

'use client'

import { cloneElement, isValidElement, useMemo, type ReactElement, type ReactNode } from 'react'
import { AlertCircle } from 'lucide-react'
import { generateA11yId } from '@/lib/accessibility/screen-reader'

export interface FormFieldProps {
  /** Unique ID for the field (required for accessibility) */
  id: string
  /** Label text */
  label: string
  /** Error message (makes field invalid) */
  error?: string
  /** Hint/help text */
  hint?: string
  /** Whether the field is required */
  required?: boolean
  /** Whether to show the label visually */
  showLabel?: boolean
  /** Custom label className */
  labelClassName?: string
  /** Custom error className */
  errorClassName?: string
  /** Custom hint className */
  hintClassName?: string
  /** Container className */
  className?: string
  /** The form control (input, select, textarea, etc.) */
  children: ReactElement
}

/**
 * Accessible Form Field Component
 */
export function FormField({
  id,
  label,
  error,
  hint,
  required = false,
  showLabel = true,
  labelClassName,
  errorClassName,
  hintClassName,
  className,
  children,
}: FormFieldProps): React.ReactElement {
  // Generate IDs for hint and error elements
  const errorId = `${id}-error`
  const hintId = `${id}-hint`

  // Build aria-describedby string
  const describedBy = useMemo(() => {
    const ids: string[] = []
    if (error) ids.push(errorId)
    if (hint && !error) ids.push(hintId)
    return ids.length > 0 ? ids.join(' ') : undefined
  }, [error, hint, errorId, hintId])

  // Clone child and inject accessibility props
  const enhancedChild = isValidElement(children)
    ? cloneElement(children as ReactElement<Record<string, unknown>>, {
        id,
        'aria-invalid': error ? 'true' : undefined,
        'aria-describedby': describedBy,
        'aria-required': required ? 'true' : undefined,
      })
    : children

  return (
    <div className={className}>
      {/* Label */}
      <label
        htmlFor={id}
        className={`mb-2 block text-sm font-bold text-[var(--text-secondary)] ${
          showLabel ? '' : 'sr-only'
        } ${labelClassName || ''}`}
      >
        {label}
        {required && (
          <>
            <span aria-hidden="true" className="ml-1 text-[var(--status-error,#ef4444)]">
              *
            </span>
            <span className="sr-only"> (requerido)</span>
          </>
        )}
      </label>

      {/* Form Control */}
      {enhancedChild}

      {/* Error Message */}
      {error && (
        <div
          id={errorId}
          role="alert"
          className={`mt-1.5 flex items-center gap-1.5 text-sm text-[var(--status-error,#ef4444)] ${
            errorClassName || ''
          }`}
        >
          <AlertCircle className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}

      {/* Hint Text (only shown when no error) */}
      {hint && !error && (
        <p id={hintId} className={`mt-1.5 text-sm text-[var(--text-muted)] ${hintClassName || ''}`}>
          {hint}
        </p>
      )}
    </div>
  )
}

/**
 * Form Field Group Component
 *
 * Groups multiple related fields with a fieldset and legend.
 * Use for radio groups, checkbox groups, or logically related fields.
 *
 * @example
 * ```tsx
 * <FormFieldGroup legend="Tipo de mascota" required>
 *   <RadioGroup name="species" options={speciesOptions} />
 * </FormFieldGroup>
 * ```
 */
export interface FormFieldGroupProps {
  /** Group legend/title */
  legend: string
  /** Error message for the entire group */
  error?: string
  /** Hint for the group */
  hint?: string
  /** Whether any field in group is required */
  required?: boolean
  /** Whether to show the legend visually */
  showLegend?: boolean
  /** Group content */
  children: ReactNode
  /** Container className */
  className?: string
}

export function FormFieldGroup({
  legend,
  error,
  hint,
  required = false,
  showLegend = true,
  children,
  className,
}: FormFieldGroupProps): React.ReactElement {
  const groupId = useMemo(() => generateA11yId('field-group'), [])
  const errorId = `${groupId}-error`
  const hintId = `${groupId}-hint`

  return (
    <fieldset
      className={`border-none p-0 m-0 ${className || ''}`}
      aria-describedby={error ? errorId : hint ? hintId : undefined}
    >
      <legend
        className={`mb-3 text-sm font-bold text-[var(--text-secondary)] ${
          showLegend ? '' : 'sr-only'
        }`}
      >
        {legend}
        {required && (
          <>
            <span aria-hidden="true" className="ml-1 text-[var(--status-error,#ef4444)]">
              *
            </span>
            <span className="sr-only"> (requerido)</span>
          </>
        )}
      </legend>

      {children}

      {error && (
        <div
          id={errorId}
          role="alert"
          className="mt-2 flex items-center gap-1.5 text-sm text-[var(--status-error,#ef4444)]"
        >
          <AlertCircle className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}

      {hint && !error && (
        <p id={hintId} className="mt-2 text-sm text-[var(--text-muted)]">
          {hint}
        </p>
      )}
    </fieldset>
  )
}

/**
 * Accessible Required Indicator
 *
 * Visual asterisk with screen reader text.
 */
export function RequiredIndicator(): React.ReactElement {
  return (
    <>
      <span aria-hidden="true" className="ml-1 text-[var(--status-error,#ef4444)]">
        *
      </span>
      <span className="sr-only"> (requerido)</span>
    </>
  )
}

export default FormField
