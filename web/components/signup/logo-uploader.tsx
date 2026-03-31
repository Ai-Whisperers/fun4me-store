'use client'

/**
 * LogoUploader - Drag & drop logo upload component
 *
 * Uploads to Supabase Storage via /api/signup/upload-logo
 * Shows preview and loading states.
 */

import { useState, useCallback, useRef } from 'react'
import { Upload, X, Loader2, ImageIcon, AlertCircle } from 'lucide-react'
import Image from 'next/image'
import type { UploadLogoResponse } from '@/lib/signup/types'
import { useTranslations } from 'next-intl'

interface LogoUploaderProps {
  value: string | null
  slug: string
  onChange: (url: string | null) => void
  disabled?: boolean
}

const MAX_FILE_SIZE = 2 * 1024 * 1024 // 2MB
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/svg+xml', 'image/webp']

export function LogoUploader({ value, slug, onChange, disabled }: LogoUploaderProps) {
  const t = useTranslations()
  const [isUploading, setIsUploading] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const validateFile = useCallback((file: File): string | null => {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      return 'Tipo de archivo no permitido. Use JPG, PNG, SVG o WebP.'
    }
    if (file.size > MAX_FILE_SIZE) {
      return `Archivo muy grande. Maximo ${MAX_FILE_SIZE / (1024 * 1024)}MB.`
    }
    return null
  }, [])

  const uploadFile = useCallback(
    async (file: File) => {
      const validationError = validateFile(file)
      if (validationError) {
        setError(validationError)
        return
      }

      setError(null)
      setIsUploading(true)

      try {
        const formData = new FormData()
        formData.append('file', file)
        formData.append('slug', slug || 'pending')

        const response = await fetch('/api/signup/upload-logo', {
          method: 'POST',
          body: formData,
        })

        const data: UploadLogoResponse = await response.json()

        if (data.success && data.url) {
          onChange(data.url)
        } else {
          setError(data.error || 'Error al subir el logo')
        }
      } catch (_error: unknown) {
        setError('Error de conexion. Por favor intenta nuevamente.')
      } finally {
        setIsUploading(false)
      }
    },
    [slug, validateFile, onChange]
  )

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)

      if (disabled || isUploading) return

      const file = e.dataTransfer.files[0]
      if (file) {
        uploadFile(file)
      }
    },
    [disabled, isUploading, uploadFile]
  )

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      if (!disabled && !isUploading) {
        setIsDragging(true)
      }
    },
    [disabled, isUploading]
  )

  const handleDragLeave = useCallback(() => {
    setIsDragging(false)
  }, [])

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) {
        uploadFile(file)
      }
      // Reset input so same file can be selected again
      e.target.value = ''
    },
    [uploadFile]
  )

  const handleRemove = useCallback(() => {
    onChange(null)
    setError(null)
  }, [onChange])

  const handleClick = useCallback(() => {
    if (!disabled && !isUploading) {
      fileInputRef.current?.click()
    }
  }, [disabled, isUploading])

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">Logo de la Clinica</label>

      {value ? (
        // Preview mode
        <div className="relative inline-block">
          <div className="relative h-24 w-48 rounded-lg border border-gray-200 bg-white p-2">
            <Image
              src={value}
              alt="Logo preview"
              fill
              className="object-contain"
              unoptimized
            />
          </div>
          <button
            type="button"
            onClick={handleRemove}
            disabled={disabled}
            className="absolute -right-2 -top-2 rounded-full bg-red-500 p-1 text-white hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-50"
            aria-label={`${t('common.delete')} logo`}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        // Upload mode
        <div
          onClick={handleClick}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={`
            relative flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition-colors
            ${isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'}
            ${disabled || isUploading ? 'cursor-not-allowed opacity-50' : ''}
          `}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPTED_TYPES.join(',')}
            onChange={handleFileSelect}
            disabled={disabled || isUploading}
            className="hidden"
          />

          {isUploading ? (
            <>
              <Loader2 className="h-10 w-10 animate-spin text-blue-500" />
              <p className="mt-2 text-sm text-gray-600">Subiendo...</p>
            </>
          ) : (
            <>
              {isDragging ? (
                <Upload className="h-10 w-10 text-blue-500" />
              ) : (
                <ImageIcon className="h-10 w-10 text-gray-400" />
              )}
              <p className="mt-2 text-sm text-gray-600">
                <span className="font-medium text-blue-600">Haz clic para subir</span> o arrastra y suelta
              </p>
              <p className="mt-1 text-xs text-gray-500">PNG, JPG, SVG o WebP (max. 2MB)</p>
            </>
          )}
        </div>
      )}

      {error && (
        <div className="flex items-center gap-1 text-sm text-red-600">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      <p className="text-xs text-gray-500">Opcional. Puedes agregarlo despues desde el panel de administracion.</p>
    </div>
  )
}
