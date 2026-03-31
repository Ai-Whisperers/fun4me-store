/**
 * useModalForm Hook
 *
 * Combines modal state management with form submission handling.
 * Reduces boilerplate in modal components that submit data to APIs.
 */

import { useState, useCallback } from 'react'

export interface UseModalFormOptions<TData, TResult> {
  onSubmit: (data: TData) => Promise<TResult>
  onSuccess?: (result: TResult) => void
  onError?: (error: Error) => void
  defaultErrorMessage?: string
}

export interface UseModalFormReturn<TData, TResult> {
  isSubmitting: boolean
  error: string | null
  result: TResult | null
  submit: (data: TData) => Promise<TResult | null>
  clearError: () => void
  reset: () => void
}

export function useModalForm<TData, TResult = unknown>(
  options: UseModalFormOptions<TData, TResult>
): UseModalFormReturn<TData, TResult> {
  const {
    onSubmit,
    onSuccess,
    onError,
    defaultErrorMessage = 'Error al procesar la solicitud',
  } = options

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<TResult | null>(null)

  const clearError = useCallback(() => setError(null), [])
  const reset = useCallback(() => {
    setIsSubmitting(false)
    setError(null)
    setResult(null)
  }, [])

  const submit = useCallback(
    async (data: TData): Promise<TResult | null> => {
      try {
        setIsSubmitting(true)
        setError(null)
        const submitResult = await onSubmit(data)
        setResult(submitResult)
        onSuccess?.(submitResult)
        return submitResult
      } catch (e) {
        const errorMessage = e instanceof Error ? e.message : defaultErrorMessage
        setError(errorMessage)
        onError?.(e instanceof Error ? e : new Error(errorMessage))
        return null
      } finally {
        setIsSubmitting(false)
      }
    },
    [onSubmit, onSuccess, onError, defaultErrorMessage]
  )

  return { isSubmitting, error, result, submit, clearError, reset }
}

export interface UseApiModalFormOptions<TData, TResult> {
  url: string
  method?: 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  onSuccess?: (result: TResult) => void
  onError?: (error: Error) => void
}

export function useApiModalForm<TData, TResult = unknown>(
  options: UseApiModalFormOptions<TData, TResult>
): UseModalFormReturn<TData, TResult> {
  const { url, method = 'POST', onSuccess, onError } = options

  return useModalForm<TData, TResult>({
    onSubmit: async (data) => {
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error?.message || errorData.error || 'Error en la solicitud')
      }
      return response.json()
    },
    onSuccess,
    onError,
  })
}
