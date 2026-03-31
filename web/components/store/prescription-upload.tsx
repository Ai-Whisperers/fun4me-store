'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { Upload, X, FileText, AlertCircle, Check, Loader2 } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import { logger } from '@/lib/logger'

interface PrescriptionUploadProps {
  /** Clinic tenant ID */
  clinic: string
  /** Product ID for which the prescription is uploaded */
  productId?: string
  /** Called when file is uploaded successfully */
  onUpload: (url: string) => void
  /** Called when file is removed */
  onRemove?: () => void
  /** Initial file URL if already uploaded */
  initialUrl?: string
  /** Optional label */
  label?: string
  /** Whether the field is required */
  required?: boolean
  /** Max file size in MB */
  maxSizeMB?: number
  /** Compact display mode for inline use */
  compact?: boolean
  /** Whether the upload is disabled */
  disabled?: boolean
}

type UploadStatus = 'idle' | 'uploading' | 'success' | 'error'

const ACCEPTED_EXTENSIONS = ['.pdf', '.jpg', '.jpeg', '.png']
const ACCEPTED_MIME_TYPES = ['application/pdf', 'image/jpeg', 'image/png']
const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png']

export function PrescriptionUpload({
  clinic,
  productId,
  onUpload,
  onRemove,
  initialUrl,
  label,
  required = false,
  maxSizeMB = 5,
  compact = false,
  disabled = false,
}: PrescriptionUploadProps) {
  const t = useTranslations('uploads.prescription')
  const labelText = label ?? t('label')
  const [fileUrl, setFileUrl] = useState<string | null>(initialUrl ?? null)
  const [fileName, setFileName] = useState<string | null>(null)
  const [fileType, setFileType] = useState<string | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [status, setStatus] = useState<UploadStatus>(initialUrl ? 'success' : 'idle')
  const [error, setError] = useState<string | null>(null)
  const [dragActive, setDragActive] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  const maxSizeBytes = maxSizeMB * 1024 * 1024

  // Determine if initial URL is an image for preview
  useEffect(() => {
    if (initialUrl) {
      const isImage = IMAGE_EXTENSIONS.some((ext) => initialUrl.toLowerCase().includes(ext))
      if (isImage) {
        setPreviewUrl(initialUrl)
        setFileType('image')
      } else {
        setFileType('pdf')
      }
    }
  }, [initialUrl])

  // Cleanup preview URL on unmount
  useEffect(() => {
    return () => {
      if (previewUrl && previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl)
      }
    }
  }, [previewUrl])

  const validateFile = useCallback(
    (file: File): string | null => {
      // Check file type
      const extension = '.' + file.name.split('.').pop()?.toLowerCase()
      if (!ACCEPTED_EXTENSIONS.includes(extension)) {
        return t('fileTypeNotAllowed', { formats: ACCEPTED_EXTENSIONS.join(', ') })
      }

      // Check file size
      if (file.size > maxSizeBytes) {
        return t('fileTooLarge', { maxSize: maxSizeMB })
      }

      return null
    },
    [maxSizeBytes, maxSizeMB, t]
  )

  const uploadFile = useCallback(
    async (file: File) => {
      if (disabled) return

      const validationError = validateFile(file)
      if (validationError) {
        setError(validationError)
        setStatus('error')
        return
      }

      setStatus('uploading')
      setError(null)
      setFileName(file.name)
      setUploadProgress(0)

      // Determine file type and create preview for images
      const isImage = file.type.startsWith('image/')
      setFileType(isImage ? 'image' : 'pdf')

      if (isImage) {
        // Create local preview for images
        const localPreview = URL.createObjectURL(file)
        setPreviewUrl(localPreview)
      } else {
        setPreviewUrl(null)
      }

      try {
        const supabase = createClient()

        // Generate unique filename with optional productId prefix
        const timestamp = Date.now()
        const extension = file.name.split('.').pop()
        const prefix = productId ? `${clinic}/${productId}` : clinic
        const uniqueName = `${prefix}/${timestamp}-${Math.random().toString(36).slice(2)}.${extension}`

        // Simulate progress (Supabase JS doesn't support real progress)
        const progressInterval = setInterval(() => {
          setUploadProgress((prev) => {
            if (prev >= 90) {
              clearInterval(progressInterval)
              return prev
            }
            return prev + 10
          })
        }, 100)

        // Upload to Supabase Storage
        const { data, error: uploadError } = await supabase.storage
          .from('prescriptions')
          .upload(uniqueName, file, {
            cacheControl: '3600',
            upsert: false,
          })

        clearInterval(progressInterval)

        if (uploadError) {
          logger.error('Prescription upload failed', {
            clinic,
            productId,
            fileName: file.name,
            error: uploadError.message,
          })
          setError(t('uploadError'))
          setStatus('error')
          setUploadProgress(0)
          // Cleanup preview on error
          if (previewUrl?.startsWith('blob:')) {
            URL.revokeObjectURL(previewUrl)
            setPreviewUrl(null)
          }
          return
        }

        // Get public URL
        const { data: urlData } = supabase.storage.from('prescriptions').getPublicUrl(data.path)

        setUploadProgress(100)
        setFileUrl(urlData.publicUrl)
        setStatus('success')

        // For images, update preview to the actual URL
        if (isImage) {
          // Revoke the blob URL and use the actual URL
          if (previewUrl?.startsWith('blob:')) {
            URL.revokeObjectURL(previewUrl)
          }
          setPreviewUrl(urlData.publicUrl)
        }

        onUpload(urlData.publicUrl)

        logger.info('Prescription uploaded successfully', {
          clinic,
          productId,
          fileName: file.name,
          path: data.path,
        })
      } catch (err) {
        logger.error('Prescription upload exception', {
          clinic,
          productId,
          fileName: file.name,
          error: err instanceof Error ? err.message : 'Unknown',
        })
        setError(t('unexpectedError'))
        setStatus('error')
        setUploadProgress(0)
      }
    },
    [clinic, productId, onUpload, validateFile, disabled, previewUrl, t]
  )

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) {
        uploadFile(file)
      }
      // Reset input so same file can be selected again
      if (inputRef.current) {
        inputRef.current.value = ''
      }
    },
    [uploadFile]
  )

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setDragActive(false)

      const file = e.dataTransfer.files?.[0]
      if (file) {
        uploadFile(file)
      }
    },
    [uploadFile]
  )

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }, [])

  const handleRemove = useCallback(() => {
    // Cleanup blob URL if exists
    if (previewUrl?.startsWith('blob:')) {
      URL.revokeObjectURL(previewUrl)
    }
    setFileUrl(null)
    setFileName(null)
    setFileType(null)
    setPreviewUrl(null)
    setStatus('idle')
    setError(null)
    setUploadProgress(0)
    onRemove?.()
  }, [onRemove, previewUrl])

  // Render preview content based on file type
  const renderPreview = () => {
    if (fileType === 'image' && previewUrl) {
      return (
        <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg bg-gray-100">
          { }
          <img
            src={previewUrl}
            alt={t('previewAlt')}
            className="h-full w-full object-cover"
          />
        </div>
      )
    }
    return (
      <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-lg bg-red-50">
        <FileText className="h-8 w-8 text-red-500" aria-hidden="true" />
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {/* Label */}
      <label
        id={`prescription-upload-label-${productId || 'default'}`}
        className="block text-sm font-medium text-[var(--text-primary)]"
      >
        {labelText}
        {required && (
          <span className="ml-1 text-[var(--status-error)]" aria-hidden="true">
            *
          </span>
        )}
        {required && <span className="sr-only">({t('required')})</span>}
      </label>

      {/* Upload Area - Idle/Error State */}
      {status === 'idle' || status === 'error' ? (
        <div
          role="button"
          tabIndex={disabled ? -1 : 0}
          aria-labelledby={`prescription-upload-label-${productId || 'default'}`}
          aria-describedby={`prescription-upload-hint-${productId || 'default'}`}
          aria-disabled={disabled}
          className={`relative flex min-h-[120px] flex-col items-center justify-center rounded-xl border-2 border-dashed p-6 text-center transition-all ${
            disabled ? 'cursor-not-allowed bg-gray-50 opacity-50' : 'cursor-pointer'
          } ${
            !disabled && dragActive
              ? 'bg-[var(--primary)]/5 scale-[1.02] border-[var(--primary)]'
              : !disabled
                ? 'border-gray-300 hover:border-[var(--primary)] hover:bg-gray-50'
                : 'border-gray-200'
          } ${status === 'error' ? 'border-[var(--status-error-border)] bg-[var(--status-error-bg)]' : ''} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => !disabled && inputRef.current?.click()}
          onKeyDown={(e) => {
            if (!disabled && (e.key === 'Enter' || e.key === ' ')) {
              e.preventDefault()
              inputRef.current?.click()
            }
          }}
        >
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPTED_MIME_TYPES.join(',')}
            onChange={handleFileSelect}
            disabled={disabled}
            className="sr-only"
            aria-label={labelText}
          />

          <Upload
            className={`mb-3 h-10 w-10 ${
              status === 'error'
                ? 'text-[var(--status-error)]'
                : dragActive
                  ? 'text-[var(--primary)]'
                  : 'text-gray-400'
            }`}
            aria-hidden="true"
          />

          <p className="mb-1 text-sm text-[var(--text-secondary)]">
            {dragActive ? (
              <span className="font-medium text-[var(--primary)]">{t('dropFile')}</span>
            ) : (
              <>
                <span className="font-medium text-[var(--primary)]">{t('dragHere')}</span>{' '}
                {t('orClickToSelect')}
              </>
            )}
          </p>
          <p
            id={`prescription-upload-hint-${productId || 'default'}`}
            className="text-xs text-gray-400"
          >
            {t('formatsHint', { maxSize: maxSizeMB })}
          </p>
        </div>
      ) : status === 'uploading' ? (
        /* Uploading State with Progress Bar */
        <div
          className="bg-[var(--primary)]/5 rounded-xl border-2 border-dashed border-[var(--primary)] p-6"
          role="status"
          aria-live="polite"
          aria-label={t('uploadingLabel', { progress: uploadProgress })}
        >
          <div className="flex items-center gap-4">
            {/* Show preview during upload for images */}
            {fileType === 'image' && previewUrl ? (
              <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg bg-gray-100">
                { }
                <img
                  src={previewUrl}
                  alt={t('previewLoading')}
                  className="h-full w-full object-cover opacity-50"
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-[var(--primary)]" />
                </div>
              </div>
            ) : (
              <div className="bg-[var(--primary)]/10 flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-lg">
                <Loader2 className="h-8 w-8 animate-spin text-[var(--primary)]" />
              </div>
            )}

            <div className="min-w-0 flex-1">
              <p className="mb-2 truncate text-sm font-medium text-[var(--text-primary)]">
                {fileName}
              </p>

              {/* Progress Bar */}
              <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
                <div
                  className="h-full rounded-full bg-[var(--primary)] transition-all duration-300 ease-out"
                  style={{ width: `${uploadProgress}%` }}
                  role="progressbar"
                  aria-valuenow={uploadProgress}
                  aria-valuemin={0}
                  aria-valuemax={100}
                />
              </div>

              <p className="mt-1 text-xs text-[var(--text-secondary)]">
                {t('uploading', { progress: uploadProgress })}
              </p>
            </div>
          </div>
        </div>
      ) : status === 'success' && fileUrl ? (
        /* Success State with Preview */
        <div
          className="rounded-xl border border-[var(--status-success-border)] bg-[var(--status-success-bg)] p-4"
          role="status"
          aria-live="polite"
        >
          <div className="flex items-center gap-4">
            {/* Preview thumbnail or file icon */}
            {renderPreview()}

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-[var(--text-primary)]">
                {fileName ?? t('prescriptionUploaded')}
              </p>
              <div className="mt-1 flex items-center gap-1 text-xs text-[var(--status-success)]">
                <Check className="h-3 w-3" aria-hidden="true" />
                <span>{t('uploadSuccess')}</span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-shrink-0 items-center gap-1">
              {fileUrl && (
                <a
                  href={fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:bg-[var(--primary)]/10 inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-sm font-medium text-[var(--primary)] transition-colors"
                  onClick={(e) => e.stopPropagation()}
                  aria-label={t('viewFile')}
                >
                  {t('view')}
                </a>
              )}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleRemove}
                disabled={disabled}
                className="min-h-[44px] min-w-[44px] text-gray-400 hover:bg-[var(--status-error-bg)] hover:text-[var(--status-error)]"
                aria-label={t('removeFile')}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Error Message */}
      {error && (
        <div
          role="alert"
          className="flex items-center gap-2 rounded-lg bg-[var(--status-error-bg)] px-3 py-2 text-sm text-[var(--status-error-text)]"
        >
          <AlertCircle className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}

      {/* Help Text */}
      <p className="text-xs text-gray-500">
        {t('helpText')}
      </p>
    </div>
  )
}
