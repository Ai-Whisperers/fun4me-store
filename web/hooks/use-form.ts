import React, { useState, useCallback, useRef } from 'react'

/**
 * Common form value types - covers most form inputs
 */
export type FormValue = string | number | boolean | Date | null | undefined | string[]

/**
 * Generic form values object type
 */
export type FormValues = Record<string, FormValue>

/**
 * Validation rule for a field - receives value and optionally all form data
 */
export type ValidationRule<T, TForm extends FormValues = FormValues> = (
  value: T,
  formData?: TForm
) => string | null

/**
 * Single form field state
 */
export interface FormField<T = FormValue> {
  value: T
  error: string | null
  touched: boolean
  dirty: boolean
}

/**
 * Internal form state map
 */
export type FormState<T extends FormValues = FormValues> = {
  [K in keyof T]: FormField<T[K]>
}

/**
 * Options for useForm hook
 */
export interface UseFormOptions<T extends FormValues = FormValues> {
  validateOnChange?: boolean
  validateOnBlur?: boolean
  initialValues?: T
  validationRules?: { [K in keyof T]?: ValidationRule<T[K], T> }
}

/**
 * Return type for useForm hook
 */
export interface UseFormResult<T extends FormValues = FormValues> {
  values: T
  errors: { [K in keyof T]?: string | null }
  touched: { [K in keyof T]?: boolean }
  dirty: { [K in keyof T]?: boolean }
  isValid: boolean
  isDirty: boolean
  isSubmitting: boolean
  setValue: <K extends keyof T>(field: K, value: T[K] | React.ChangeEvent<HTMLInputElement>) => void
  setError: (field: keyof T, error: string | null) => void
  setTouched: (field: keyof T, touched?: boolean) => void
  validateField: (field: keyof T) => boolean
  validateForm: () => boolean
  reset: (values?: T) => void
  handleSubmit: (
    onSubmit: (values: T) => Promise<void> | void
  ) => (e?: React.FormEvent) => Promise<void>
  getFieldProps: <K extends keyof T>(field: K) => {
    value: T[K]
    onChange: (value: T[K] | React.ChangeEvent<HTMLInputElement>) => void
    onBlur: () => void
    error: string | null
    touched: boolean
  }
}

export function useForm<T extends FormValues = FormValues>(
  options: UseFormOptions<T> = {}
): UseFormResult<T> {
  const {
    validateOnChange = true,
    validateOnBlur = true,
    initialValues = {} as T,
    validationRules = {} as { [K in keyof T]?: ValidationRule<T[K], T> },
  } = options

  const [formState, setFormState] = useState<FormState<T>>(() => {
    const state = {} as FormState<T>
    for (const key in initialValues) {
      if (Object.prototype.hasOwnProperty.call(initialValues, key)) {
        state[key] = {
          value: initialValues[key],
          error: null,
          touched: false,
          dirty: false,
        }
      }
    }
    return state
  })

  const [isSubmitting, setIsSubmitting] = useState(false)
  const initialValuesRef = useRef<T>(initialValues)

  const setValue = useCallback(
    <K extends keyof T>(field: K, value: T[K] | React.ChangeEvent<HTMLInputElement>) => {
      setFormState((prev) => {
        const currentField = prev[field as string] || {
          value: undefined,
          error: null,
          touched: false,
          dirty: false,
        }
        // Handle both direct values and React change events
        const isChangeEvent = (v: unknown): v is React.ChangeEvent<HTMLInputElement> =>
          typeof v === 'object' && v !== null && 'target' in v && typeof (v as React.ChangeEvent<HTMLInputElement>).target?.value !== 'undefined'
        const newValue = isChangeEvent(value) ? value.target.value : value
        const dirty = newValue !== initialValuesRef.current[field]

        return {
          ...prev,
          [field]: {
            ...currentField,
            value: newValue,
            dirty,
            error:
              validateOnChange && validationRules[field as keyof T]
                ? (validationRules[field as keyof T] as ValidationRule<T[K], T>)(newValue as T[K], getValuesFromState(prev) as T)
                : currentField.error,
          },
        }
      })
    },
    [validateOnChange, validationRules]
  )

  const setError = useCallback((field: keyof T, error: string | null) => {
    setFormState((prev) => ({
      ...prev,
      [field]: {
        ...prev[field as string],
        error,
      },
    }))
  }, [])

  const setTouched = useCallback(
    (field: keyof T, touched = true) => {
      setFormState((prev) => {
        const currentField = prev[field as string] || {
          value: undefined,
          error: null,
          touched: false,
          dirty: false,
        }

        return {
          ...prev,
          [field]: {
            ...currentField,
            touched,
            error:
              validateOnBlur && touched && validationRules[field]
                ? (validationRules[field] as ValidationRule<T[keyof T], T>)(currentField.value, getValuesFromState(prev) as T)
                : currentField.error,
          },
        }
      })
    },
    [validateOnBlur, validationRules]
  )

  const validateField = useCallback(
    (field: keyof T): boolean => {
      const rule = validationRules[field]
      if (!rule) return true

      const values = getValuesFromState(formState) as T
      const error = (rule as ValidationRule<T[keyof T], T>)(formState[field as string]?.value, values)

      setError(field, error)
      return error === null
    },
    [formState, validationRules, setError]
  )

  const validateForm = useCallback((): boolean => {
    let isValid = true

    Object.keys(validationRules).forEach((field) => {
      if (!validateField(field as keyof T)) {
        isValid = false
      }
    })

    return isValid
  }, [validationRules, validateField])

  const reset = useCallback((values: T = initialValuesRef.current) => {
    initialValuesRef.current = values
    const state = {} as FormState<T>
    for (const key in values) {
      if (Object.prototype.hasOwnProperty.call(values, key)) {
        state[key] = {
          value: values[key],
          error: null,
          touched: false,
          dirty: false,
        }
      }
    }
    setFormState(state)
  }, [])

  const handleSubmit = useCallback(
    (onSubmit: (values: T) => Promise<void> | void) => {
      return async (e?: React.FormEvent) => {
        if (e) {
          e.preventDefault()
        }
        setIsSubmitting(true)

        try {
          const values = getValuesFromState(formState) as T
          await onSubmit(values)
        } finally {
          setIsSubmitting(false)
        }
      }
    },
    [formState]
  )

  const getFieldProps = useCallback(
    <K extends keyof T>(field: K) => ({
      value: (formState[field as string]?.value || '') as T[K],
      onChange: (value: T[K] | React.ChangeEvent<HTMLInputElement>) => setValue(field, value),
      onBlur: () => setTouched(field),
      error: formState[field as string]?.error || null,
      touched: formState[field as string]?.touched || false,
    }),
    [formState, setValue, setTouched]
  )

  const values = getValuesFromState(formState) as T
  const errors = getErrorsFromState(formState) as { [K in keyof T]?: string | null }
  const touched = getTouchedFromState(formState) as { [K in keyof T]?: boolean }
  const dirty = getDirtyFromState(formState) as { [K in keyof T]?: boolean }

  const isValid = Object.values(errors).every((error) => error === null)
  const isDirty = Object.values(dirty).some((d) => d)

  return {
    values,
    errors,
    touched,
    dirty,
    isValid,
    isDirty,
    isSubmitting,
    setValue,
    setError,
    setTouched,
    validateField,
    validateForm,
    reset,
    handleSubmit,
    getFieldProps,
  } as UseFormResult<T>
}

// Helper functions
function getValuesFromState<T extends FormValues>(state: FormState<T>): FormValues {
  return Object.keys(state).reduce<FormValues>(
    (acc, key) => ({
      ...acc,
      [key]: state[key].value,
    }),
    {}
  )
}

function getErrorsFromState<T extends FormValues>(state: FormState<T>): Record<string, string | null> {
  return Object.keys(state).reduce<Record<string, string | null>>(
    (acc, key) => ({
      ...acc,
      [key]: state[key].error,
    }),
    {}
  )
}

function getTouchedFromState<T extends FormValues>(state: FormState<T>): Record<string, boolean> {
  return Object.keys(state).reduce<Record<string, boolean>>(
    (acc, key) => ({
      ...acc,
      [key]: state[key].touched,
    }),
    {}
  )
}

function getDirtyFromState<T extends FormValues>(state: FormState<T>): Record<string, boolean> {
  return Object.keys(state).reduce<Record<string, boolean>>(
    (acc, key) => ({
      ...acc,
      [key]: state[key].dirty,
    }),
    {}
  )
}
