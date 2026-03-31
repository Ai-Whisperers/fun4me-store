'use client'

import { useState, useRef, useEffect } from 'react'
import { Check, X, Pencil, Loader2, Copy, CheckCheck } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useForm } from '@/hooks/use-form'
import { useAsyncData } from '@/lib/hooks'
import { required } from '@/lib/utils/validation'

interface InlineEditFieldProps {
  value: string
  label: string
  field: string
  entityId: string
  entityType: 'client' | 'pet'
  clinic: string
  onUpdate?: (newValue: string) => void
  type?: 'text' | 'email' | 'tel'
  icon?: React.ReactNode
  copyable?: boolean
  editable?: boolean
}

export function InlineEditField({
  value,
  label,
  field,
  entityId,
  entityType,
  clinic,
  onUpdate,
  type = 'text',
  icon,
  copyable = false,
  editable = true,
}: InlineEditFieldProps): React.ReactElement {
  const t = useTranslations('common')
  const tMessages = useTranslations('messages')
  const [isEditing, setIsEditing] = useState(false)
  const [isCopied, setIsCopied] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // Form handling with validation
  const form = useForm({
    initialValues: { [field]: value },
    validationRules: type === 'email' ? { [field]: required(t('emailRequired')) } : {},
  })

  // Async data handling for save operation
  const {
    isLoading: isSaving,
    error: saveError,
    refetch: saveField,
  } = useAsyncData(
    async () => {
      const endpoint =
        entityType === 'client' ? `/api/clients/${entityId}` : `/api/pets/${entityId}`

      const response = await fetch(endpoint, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clinic,
          [field]: form.values[field],
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || tMessages('error.save'))
      }

      return response.json()
    },
    [], // No dependencies - manual trigger only
    { enabled: false } // Don't run automatically
  )

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isEditing])

  useEffect(() => {
    // Reset form when value changes externally
    form.reset({ [field]: value })
  }, [value, field])

  const handleSave = async (): Promise<void> => {
    if (!form.validateForm()) return

    if (form.values[field] === value) {
      setIsEditing(false)
      return
    }

    try {
      await saveField()
      onUpdate?.(form.values[field])
      setIsEditing(false)
    } catch (err) {
      // Error is handled by useAsyncData
    }
  }

  const handleCancel = (): void => {
    form.reset({ [field]: value })
    setIsEditing(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent): void => {
    if (e.key === 'Enter') {
      handleSave()
    } else if (e.key === 'Escape') {
      handleCancel()
    }
  }

  const handleCopy = async (): Promise<void> => {
    if (!value) return

    try {
      await navigator.clipboard.writeText(value)
      setIsCopied(true)
      setTimeout(() => setIsCopied(false), 2000)
    } catch (err) {
      // Client-side error logging - only in development
      if (process.env.NODE_ENV === 'development') {
        console.error('Failed to copy:', err)
      }
    }
  }

  const displayValue = value || t('notRegistered')
  const fieldProps = form.getFieldProps(field)
  const hasError = saveError || fieldProps.error

  return (
    <div className="flex items-start gap-3">
      {icon && (
        <div className="mt-0.5 h-5 w-5 flex-shrink-0 text-[var(--text-secondary)]">{icon}</div>
      )}
      <div className="min-w-0 flex-1">
        <p className="mb-1 text-xs text-[var(--text-secondary)]">{label}</p>

        {isEditing ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <input
                ref={inputRef}
                type={type}
                {...fieldProps}
                onKeyDown={handleKeyDown}
                disabled={isSaving}
                className={`flex-1 rounded-lg border px-3 py-1.5 text-sm focus:border-transparent focus:outline-none focus:ring-2 disabled:opacity-50 ${
                  hasError
                    ? 'border-[var(--status-error-border)] focus:ring-[var(--status-error)]'
                    : 'border-[var(--border-color)] focus:ring-[var(--primary)]'
                }`}
              />
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="rounded-lg bg-[var(--status-success-bg)] p-1.5 text-[var(--status-success)] transition-colors hover:opacity-80 disabled:opacity-50"
                title={t('save')}
              >
                {isSaving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Check className="h-4 w-4" />
                )}
              </button>
              <button
                onClick={handleCancel}
                disabled={isSaving}
                className="rounded-lg bg-gray-100 p-1.5 text-gray-700 transition-colors hover:bg-gray-200 disabled:opacity-50"
                title={t('cancel')}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            {hasError && <p className="text-xs text-[var(--status-error)]">{saveError?.message || fieldProps.error}</p>}
          </div>
        ) : (
          <div className="group flex items-center gap-2">
            <p
              className={`text-sm font-medium ${value ? 'text-[var(--text-primary)]' : 'italic text-[var(--text-secondary)]'}`}
            >
              {displayValue}
            </p>
            <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
              {editable && (
                <button
                  onClick={() => setIsEditing(true)}
                  className="rounded p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-[var(--primary)]"
                  title={t('edit')}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
              )}
              {copyable && value && (
                <button
                  onClick={handleCopy}
                  className="rounded p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-[var(--primary)]"
                  title={isCopied ? t('copied') : t('copy')}
                >
                  {isCopied ? (
                    <CheckCheck className="h-3.5 w-3.5 text-[var(--status-success)]" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
