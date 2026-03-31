'use client'

import { useState, useRef, useCallback } from 'react'
import { Camera, X, AlertCircle, Loader2 } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { validateImageFile, ValidationResult } from '@/lib/validation/image'

interface PhotoUploadProps {
  /** Name attribute for the file input (used in form submission) */
  name?: string
  /** Current photo URL (for edit mode) */
  currentPhotoUrl?: string
  /** Called when a valid file is selected */
  onFileSelect?: (file: File) => void
  /** Called when the file is removed */
  onFileRemove?: () => void
  /** Custom class name for the container */
  className?: string
  /** Placeholder text */
  placeholder?: string
  /** Whether the upload is disabled */
  disabled?: boolean
  /** Maximum file size in MB (default: 5MB) */
  maxSizeMB?: number
  /** Shape of the preview */
  shape?: 'circle' | 'square'
  /** Size of the preview in pixels */
  size?: number
}

export function PhotoUpload({
  name = 'photo',
  currentPhotoUrl,
  onFileSelect,
  onFileRemove,
  className = '',
  placeholder,
  disabled = false,
  maxSizeMB = 5,
  shape = 'circle',
  size = 128,
}: PhotoUploadProps) {
  const t = useTranslations('uploads.photo')
  const [preview, setPreview] = useState<string | null>(currentPhotoUrl || null)
  const [isDragging, setIsDragging] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isValidating, setIsValidating] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // Use provided placeholder or default from translations
  const placeholderText = placeholder ?? t('uploadPhoto')

  const handleFileValidation = useCallback(
    async (file: File): Promise<ValidationResult> => {
      // Basic validation first
      if (!file.type.startsWith('image/')) {
        return { valid: false, error: t('imageOnly') }
      }

      const maxSizeBytes = maxSizeMB * 1024 * 1024
      if (file.size > maxSizeBytes) {
        return { valid: false, error: t('fileTooLarge', { maxSize: maxSizeMB }) }
      }

      // Use the validation utility if available
      if (typeof validateImageFile === 'function') {
        return validateImageFile(file, { maxSizeMB })
      }

      return { valid: true }
    },
    [maxSizeMB, t]
  )

  const processFile = useCallback(
    async (file: File) => {
      setIsValidating(true)
      setError(null)

      try {
        const validation = await handleFileValidation(file)

        if (!validation.valid) {
          setError(validation.error || t('invalidFile'))
          setIsValidating(false)
          return
        }

        // Create preview
        const url = URL.createObjectURL(file)
        setPreview(url)

        // Notify parent
        onFileSelect?.(file)
      } catch (_error: unknown) {
        setError(t('errorProcessing'))
      } finally {
        setIsValidating(false)
      }
    },
    [handleFileValidation, onFileSelect, t]
  )

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) {
        processFile(file)
      }
    },
    [processFile]
  )

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      if (!disabled) {
        setIsDragging(true)
      }
    },
    [disabled]
  )

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)

      if (disabled) return

      const file = e.dataTransfer.files?.[0]
      if (file) {
        processFile(file)
      }
    },
    [disabled, processFile]
  )

  const handleRemove = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      setPreview(null)
      setError(null)
      if (inputRef.current) {
        inputRef.current.value = ''
      }
      onFileRemove?.()
    },
    [onFileRemove]
  )

  const handleClick = useCallback(() => {
    if (!disabled) {
      inputRef.current?.click()
    }
  }, [disabled])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        handleClick()
      }
    },
    [handleClick]
  )

  const containerStyle = {
    width: size,
    height: size,
  }

  const shapeClass = shape === 'circle' ? 'rounded-full' : 'rounded-2xl'

  return (
    <div className={`flex flex-col items-center gap-3 ${className}`}>
      {/* Upload Area */}
      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-label={preview ? t('changePhoto') : placeholderText}
        aria-disabled={disabled}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        style={containerStyle}
        className={`group relative cursor-pointer overflow-hidden border-4 transition-all duration-200 ${shapeClass} ${disabled ? 'cursor-not-allowed opacity-50' : ''} ${
          isDragging
            ? 'bg-[var(--primary)]/10 scale-105 border-[var(--primary)]'
            : preview
              ? 'border-[var(--primary)] shadow-lg'
              : 'hover:border-[var(--primary)]/50 border-[var(--border,#e5e7eb)] bg-[var(--bg-subtle)] hover:bg-[var(--bg-subtle)]'
        } focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2`}
      >
        {/* Preview Image */}
        {preview ? (
          <>
            <img src={preview} alt="Preview" className="h-full w-full object-cover" />
            {/* Hover Overlay */}
            {!disabled && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
                <span className="rounded-full bg-white/20 px-3 py-1.5 text-xs font-bold text-white backdrop-blur-sm">
                  {t('change')}
                </span>
              </div>
            )}
            {/* Remove Button */}
            {!disabled && (
              <button
                type="button"
                onClick={handleRemove}
                aria-label={t('removePhoto')}
                className="absolute -right-1 -top-1 flex h-7 w-7 items-center justify-center rounded-full bg-[var(--status-error,#ef4444)] text-white opacity-0 shadow-lg transition-colors hover:bg-[var(--status-error-dark,#dc2626)] focus:opacity-100 group-hover:opacity-100"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </>
        ) : (
          /* Placeholder */
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
            {isValidating ? (
              <Loader2 className="h-10 w-10 animate-spin text-[var(--primary)]" />
            ) : (
              <>
                <Camera className="h-10 w-10 text-[var(--text-muted)] transition-colors group-hover:text-[var(--primary)]" />
                {isDragging && (
                  <span className="text-xs font-bold text-[var(--primary)]">{t('dropHere')}</span>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* Helper Text */}
      <p className="text-center text-xs text-[var(--text-muted)]">
        {isDragging ? (
          <span className="font-medium text-[var(--primary)]">{t('dropImage')}</span>
        ) : (
          <span>
            {placeholderText} <span className="hidden sm:inline">{t('orDrag')}</span>
          </span>
        )}
      </p>

      {/* Error Message */}
      {error && (
        <div
          role="alert"
          className="flex items-center gap-2 rounded-lg bg-[var(--status-error-bg,#fee2e2)] px-3 py-2 text-xs font-medium text-[var(--status-error,#ef4444)]"
        >
          <AlertCircle className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
          {error}
        </div>
      )}

      {/* Hidden File Input */}
      <input
        ref={inputRef}
        type="file"
        name={name}
        accept="image/*"
        onChange={handleFileChange}
        disabled={disabled}
        className="sr-only"
        aria-hidden="true"
      />

      {/* Supported Formats Hint */}
      <p className="text-center text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
        {t('formatsHint', { maxSize: maxSizeMB })}
      </p>
    </div>
  )
}
