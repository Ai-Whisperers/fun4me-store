'use client'

import { AlertCircle, XCircle, AlertTriangle, Info } from 'lucide-react'
import { cn } from '@/lib/utils'

interface FormErrorsProps {
  /** Object mapping field names to arrays of error messages */
  errors: Record<string, string[]>
  /** Variant for different error severities */
  variant?: 'error' | 'warning' | 'info'
  /** Title override */
  title?: string
  /** Whether to show field names */
  showFieldNames?: boolean
  /** Additional CSS classes */
  className?: string
  /** Called when dismiss button is clicked */
  onDismiss?: () => void
}

/**
 * FormErrors - Displays multiple form validation errors
 *
 * @example
 * <FormErrors
 *   errors={{
 *     email: ['Correo inválido'],
 *     password: ['Mínimo 8 caracteres', 'Debe incluir un número'],
 *   }}
 * />
 *
 * @example
 * // With field names shown
 * <FormErrors errors={validationErrors} showFieldNames />
 */
export function FormErrors({
  errors,
  variant = 'error',
  title,
  showFieldNames = false,
  className,
  onDismiss,
}: FormErrorsProps) {
  // Flatten errors into a list
  const errorList = Object.entries(errors).flatMap(([field, messages]) =>
    messages.map(msg => ({ field, message: msg }))
  )

  if (errorList.length === 0) return null

  const variants = {
    error: {
      container: 'bg-red-50 border-red-200',
      icon: XCircle,
      iconColor: 'text-red-500',
      titleColor: 'text-red-800',
      textColor: 'text-red-700',
    },
    warning: {
      container: 'bg-amber-50 border-amber-200',
      icon: AlertTriangle,
      iconColor: 'text-amber-500',
      titleColor: 'text-amber-800',
      textColor: 'text-amber-700',
    },
    info: {
      container: 'bg-blue-50 border-blue-200',
      icon: Info,
      iconColor: 'text-blue-500',
      titleColor: 'text-blue-800',
      textColor: 'text-blue-700',
    },
  }

  const { container, icon: Icon, iconColor, titleColor, textColor } = variants[variant]

  const defaultTitle =
    errorList.length === 1
      ? 'Hay un error en el formulario'
      : `Hay ${errorList.length} errores en el formulario`

  return (
    <div
      className={cn('rounded-lg border p-4', container, className)}
      role="alert"
      aria-live="polite"
    >
      <div className="flex items-start gap-3">
        <Icon className={cn('h-5 w-5 flex-shrink-0 mt-0.5', iconColor)} aria-hidden="true" />
        <div className="flex-1">
          <h3 className={cn('text-sm font-medium', titleColor)}>
            {title || defaultTitle}
          </h3>
          <ul className={cn('mt-2 list-inside list-disc space-y-1 text-sm', textColor)}>
            {errorList.map((error, i) => (
              <li key={i}>
                {showFieldNames && (
                  <span className="font-medium">{formatFieldName(error.field)}: </span>
                )}
                {error.message}
              </li>
            ))}
          </ul>
        </div>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className={cn('rounded p-1 hover:bg-red-100', titleColor)}
            aria-label="Cerrar"
          >
            <XCircle className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  )
}

/**
 * Format field name for display (camelCase to Title Case)
 */
function formatFieldName(field: string): string {
  // Map common field names to Spanish
  const fieldNames: Record<string, string> = {
    email: 'Correo',
    password: 'Contraseña',
    confirmPassword: 'Confirmar contraseña',
    name: 'Nombre',
    firstName: 'Nombre',
    lastName: 'Apellido',
    phone: 'Teléfono',
    address: 'Dirección',
    city: 'Ciudad',
    date: 'Fecha',
    time: 'Hora',
    description: 'Descripción',
    amount: 'Monto',
    quantity: 'Cantidad',
    price: 'Precio',
  }

  if (fieldNames[field]) {
    return fieldNames[field]
  }

  // Convert camelCase to Title Case
  return field
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, str => str.toUpperCase())
    .trim()
}

/**
 * InlineError - Single inline error message
 *
 * @example
 * {error && <InlineError message={error} />}
 */
export function InlineError({
  message,
  className,
}: {
  message: string
  className?: string
}) {
  return (
    <div
      className={cn('flex items-center gap-1.5 text-sm text-red-600', className)}
      role="alert"
    >
      <AlertCircle className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
      <span>{message}</span>
    </div>
  )
}

/**
 * SuccessMessage - Form submission success feedback
 *
 * @example
 * {isSuccess && <SuccessMessage message="Guardado exitosamente" />}
 */
export function SuccessMessage({
  message,
  title,
  className,
  onDismiss,
}: {
  message: string
  title?: string
  className?: string
  onDismiss?: () => void
}) {
  return (
    <div
      className={cn(
        'rounded-lg border border-green-200 bg-green-50 p-4',
        className
      )}
      role="status"
      aria-live="polite"
    >
      <div className="flex items-start gap-3">
        <div className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-green-100">
          <svg
            className="h-3 w-3 text-green-600"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
              clipRule="evenodd"
            />
          </svg>
        </div>
        <div className="flex-1">
          {title && (
            <h3 className="text-sm font-medium text-green-800">{title}</h3>
          )}
          <p className={cn('text-sm text-green-700', title && 'mt-1')}>
            {message}
          </p>
        </div>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="rounded p-1 text-green-700 hover:bg-green-100"
            aria-label="Cerrar"
          >
            <XCircle className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  )
}
