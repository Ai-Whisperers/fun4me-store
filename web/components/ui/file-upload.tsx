'use client'

import { useState, useRef, useCallback } from 'react'
import { Upload, X, File, Image } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { formatBytes } from '@/lib/formatting'

export interface FileUploadProps {
  accept?: string
  maxSize?: number // bytes
  multiple?: boolean
  onUpload: (files: File[]) => void
  onRemove?: (file: File) => void
  disabled?: boolean
  className?: string
  label?: string
  hint?: string
  error?: string
}

/**
 * FileUpload component - Drag & drop file uploader
 *
 * Features:
 * - Drag and drop support
 * - Click to browse files
 * - Multiple file support
 * - File size validation
 * - File preview list
 * - Accept type filtering (images, PDFs, etc.)
 * - Theme-aware styling
 *
 * @example
 * ```tsx
 * <FileUpload
 *   label="Subir foto de la mascota"
 *   accept="image/*"
 *   maxSize={5 * 1024 * 1024} // 5MB
 *   onUpload={(files) => handleUpload(files)}
 *   hint="Máximo 5MB por archivo"
 * />
 * ```
 */
export function FileUpload({
  accept = 'image/*',
  maxSize = 5 * 1024 * 1024, // 5MB default
  multiple = false,
  onUpload,
  onRemove,
  disabled = false,
  className,
  label,
  hint,
  error,
}: FileUploadProps): React.ReactElement {
  const [files, setFiles] = useState<File[]>([])
  const [dragActive, setDragActive] = useState(false)
  const [validationError, setValidationError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFiles = useCallback(
    (fileList: FileList | null) => {
      if (!fileList) return
      setValidationError(null)

      const validFiles: File[] = []
      Array.from(fileList).forEach((file) => {
        if (file.size > maxSize) {
          setValidationError(`${file.name} es muy grande (máx ${formatBytes(maxSize)})`)
          return
        }
        validFiles.push(file)
      })

      if (validFiles.length > 0) {
        const newFiles = multiple ? [...files, ...validFiles] : validFiles
        setFiles(newFiles)
        onUpload(newFiles)
      }
    },
    [files, maxSize, multiple, onUpload]
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

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setDragActive(false)
      if (!disabled) {
        handleFiles(e.dataTransfer.files)
      }
    },
    [disabled, handleFiles]
  )

  const removeFile = useCallback(
    (file: File) => {
      const newFiles = files.filter((f) => f !== file)
      setFiles(newFiles)
      onRemove?.(file)
    },
    [files, onRemove]
  )

  const displayError = error || validationError

  return (
    <div className={cn('space-y-3', className)}>
      {label && (
        <label className="block text-sm font-bold text-[var(--text-secondary)]">{label}</label>
      )}

      <div
        className={cn(
          'rounded-xl border-2 border-dashed p-6 text-center transition-all',
          dragActive && !disabled && 'bg-[var(--primary)]/5 scale-[1.02] border-[var(--primary)]',
          !dragActive && !disabled && 'border-gray-300 hover:border-[var(--primary)]',
          disabled && 'cursor-not-allowed border-gray-200 opacity-50',
          !disabled && 'cursor-pointer',
          displayError && 'border-[var(--status-error,#ef4444)]'
        )}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => !disabled && inputRef.current?.click()}
        role="button"
        aria-label="Subir archivos"
        tabIndex={disabled ? -1 : 0}
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
          accept={accept}
          multiple={multiple}
          disabled={disabled}
          onChange={(e) => handleFiles(e.target.files)}
          className="hidden"
          aria-describedby={
            displayError ? 'file-upload-error' : hint ? 'file-upload-hint' : undefined
          }
        />

        <Upload
          className={cn(
            'mx-auto mb-3 h-8 w-8',
            dragActive && !disabled ? 'text-[var(--primary)]' : 'text-[var(--text-secondary)]'
          )}
          aria-hidden="true"
        />

        <p className="mb-1 text-sm font-bold text-[var(--text-primary)]">
          {dragActive ? 'Suelta los archivos aquí' : 'Arrastra archivos aquí'}
        </p>

        <p className="mb-2 text-sm text-[var(--text-secondary)]">o haz clic para seleccionar</p>

        <p className="text-xs text-[var(--text-muted)]">
          {hint || `Máximo ${formatBytes(maxSize)} por archivo`}
        </p>
      </div>

      {displayError && (
        <p
          id="file-upload-error"
          role="alert"
          className="flex items-center gap-1 text-sm text-[var(--status-error,#ef4444)]"
        >
          {displayError}
        </p>
      )}

      {files.length > 0 && (
        <ul className="space-y-2" role="list" aria-label="Archivos seleccionados">
          {files.map((file, index) => {
            const isImage = file.type.startsWith('image/')
            return (
              <li
                key={`${file.name}-${index}`}
                className="flex items-center justify-between rounded-lg bg-[var(--bg-muted)] p-3 transition-colors hover:bg-[var(--bg-subtle)]"
              >
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  {isImage ? (
                    <Image
                      className="h-4 w-4 flex-shrink-0 text-[var(--text-secondary)]"
                      aria-hidden="true"
                    />
                  ) : (
                    <File
                      className="h-4 w-4 flex-shrink-0 text-[var(--text-secondary)]"
                      aria-hidden="true"
                    />
                  )}
                  <span className="truncate text-sm font-bold text-[var(--text-primary)]">
                    {file.name}
                  </span>
                  <span className="flex-shrink-0 text-xs text-[var(--text-muted)]">
                    ({formatBytes(file.size)})
                  </span>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation()
                    removeFile(file)
                  }}
                  aria-label={`Eliminar ${file.name}`}
                  className="ml-2 flex-shrink-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
