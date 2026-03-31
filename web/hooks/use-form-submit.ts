'use client'

import { useState, useCallback } from 'react'

/**
 * Result type for form submissions
 */
export interface FormSubmitResult<T = unknown> {
  success: boolean
  data?: T
  error?: string
}

/**
 * Options for useFormSubmit hook
 */
export interface UseFormSubmitOptions<T = unknown> {
  /** Callback on successful submission */
  onSuccess?: (data?: T) => void
  /** Callback on submission error */
  onError?: (error: string) => void
  /** Reset success state after delay (ms). Set to 0 to disable auto-reset */
  successResetDelay?: number
}

/**
 * Return type for useFormSubmit hook
 */
export interface UseFormSubmitReturn<TInput, TOutput = unknown> {
  /** Submit function - pass your data here */
  submit: (data: TInput) => Promise<FormSubmitResult<TOutput>>
  /** Whether a submission is in progress */
  isSubmitting: boolean
  /** Error message from last submission (null if no error) */
  error: string | null
  /** Whether last submission was successful */
  isSuccess: boolean
  /** Reset all state (error, success) */
  reset: () => void
}

/**
 * Custom hook to handle form submission with loading, error, and success states.
 * Eliminates the need for repetitive useState + try/catch patterns in components.
 *
 * @example
 * ```tsx
 * const { submit, isSubmitting, error, isSuccess } = useFormSubmit(
 *   async (data) => {
 *     const result = await createAppointment(data);
 *     return result;
 *   },
 *   { onSuccess: () => router.push('/success') }
 * );
 *
 * <form onSubmit={(e) => { e.preventDefault(); submit(formData); }}>
 *   {error && <p className="text-red-500">{error}</p>}
 *   <button disabled={isSubmitting}>
 *     {isSubmitting ? 'Guardando...' : 'Guardar'}
 *   </button>
 * </form>
 * ```
 */
export function useFormSubmit<TInput, TOutput = unknown>(
  action: (data: TInput) => Promise<FormSubmitResult<TOutput>>,
  options: UseFormSubmitOptions<TOutput> = {}
): UseFormSubmitReturn<TInput, TOutput> {
  const { onSuccess, onError, successResetDelay = 3000 } = options

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isSuccess, setIsSuccess] = useState(false)

  const reset = useCallback(() => {
    setError(null)
    setIsSuccess(false)
  }, [])

  const submit = useCallback(
    async (data: TInput): Promise<FormSubmitResult<TOutput>> => {
      setIsSubmitting(true)
      setError(null)
      setIsSuccess(false)

      try {
        const result = await action(data)

        if (result.success) {
          setIsSuccess(true)
          onSuccess?.(result.data)

          // Auto-reset success state after delay
          if (successResetDelay > 0) {
            setTimeout(() => {
              setIsSuccess(false)
            }, successResetDelay)
          }

          return result
        } else {
          const errorMessage = result.error || 'Error al procesar la solicitud'
          setError(errorMessage)
          onError?.(errorMessage)
          return result
        }
      } catch (e: unknown) {
        const errorMessage = e instanceof Error ? e.message : 'Error inesperado'
        setError(errorMessage)
        onError?.(errorMessage)
        return { success: false, error: errorMessage }
      } finally {
        setIsSubmitting(false)
      }
    },
    [action, onSuccess, onError, successResetDelay]
  )

  return {
    submit,
    isSubmitting,
    error,
    isSuccess,
    reset,
  }
}

/**
 * Wrapper for Server Actions to make them compatible with useFormSubmit.
 * Server Actions return { success, error?, data? } format.
 *
 * @example
 * ```tsx
 * import { createPet } from '@/app/actions/pets';
 *
 * const { submit, isSubmitting, error } = useFormSubmit(
 *   wrapServerAction(createPet)
 * );
 * ```
 */
export function wrapServerAction<TInput, TOutput>(
  serverAction: (data: TInput) => Promise<{ success: boolean; error?: string; data?: TOutput }>
): (data: TInput) => Promise<FormSubmitResult<TOutput>> {
  return async (data: TInput) => {
    const result = await serverAction(data)
    return {
      success: result.success,
      data: result.data,
      error: result.error,
    }
  }
}
