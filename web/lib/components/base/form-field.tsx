/**
 * Reusable form field components with validation
 */

'use client'

import { forwardRef } from 'react'
import { FieldError } from 'react-hook-form'
import { Input, Textarea, Select } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

export interface BaseFieldProps {
  label?: string
  error?: FieldError
  required?: boolean
  description?: string
  className?: string
  id?: string
}

export interface TextFieldProps extends BaseFieldProps {
  placeholder?: string
  type?: 'text' | 'email' | 'password' | 'number' | 'tel' | 'url'
}

export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(
  ({ label, error, required, description, className, ...props }, ref) => {
    return (
      <Input
        ref={ref}
        label={label}
        error={error?.message}
        hint={description}
        required={required}
        className={className}
        {...props}
      />
    )
  }
)
TextField.displayName = 'TextField'

export interface TextareaFieldProps extends BaseFieldProps {
  placeholder?: string
  rows?: number
}

export const TextareaField = forwardRef<HTMLTextAreaElement, TextareaFieldProps>(
  ({ label, error, required, description, className, ...props }, ref) => {
    return (
      <Textarea
        ref={ref}
        label={label}
        error={error?.message}
        hint={description}
        required={required}
        className={className}
        {...props}
      />
    )
  }
)
TextareaField.displayName = 'TextareaField'

export interface SelectFieldProps extends BaseFieldProps {
  placeholder?: string
  options: Array<{ value: string; label: string; disabled?: boolean }>
}

export const SelectField = forwardRef<HTMLSelectElement, SelectFieldProps>(
  ({ label, error, required, description, className, options, placeholder, ...props }, ref) => {
    return (
      <Select
        ref={ref}
        label={label}
        error={error?.message}
        hint={description}
        required={required}
        options={options}
        placeholder={placeholder}
        className={className}
        {...props}
      />
    )
  }
)
SelectField.displayName = 'SelectField'

export interface CheckboxFieldProps extends BaseFieldProps {
  description?: string
}

// Checkbox and RadioGroup are removed because their UI components don't exist yet
// If needed, they should be implemented in web/components/ui/ first

