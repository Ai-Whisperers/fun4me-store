'use client'

/**
 * SlugInput - Real-time slug availability checker
 *
 * Validates slug format and checks availability against the API.
 * Shows suggestions when slug is taken.
 */

import { useState, useEffect, useCallback } from 'react'
import { CheckCircle2, XCircle, Loader2, AlertCircle } from 'lucide-react'
import { generateSlugFromName } from '@/lib/signup/schema'
import type { CheckSlugResponse } from '@/lib/signup/types'

interface SlugInputProps {
  value: string
  clinicName: string
  onChange: (slug: string) => void
  error?: string
  disabled?: boolean
}

export function SlugInput({ value, clinicName, onChange, error, disabled }: SlugInputProps) {
  const [isChecking, setIsChecking] = useState(false)
  const [availability, setAvailability] = useState<CheckSlugResponse | null>(null)
  const [debouncedValue, setDebouncedValue] = useState(value)

  // Auto-generate slug from clinic name
  useEffect(() => {
    if (clinicName && !value) {
      const generatedSlug = generateSlugFromName(clinicName)
      if (generatedSlug) {
        onChange(generatedSlug)
      }
    }
  }, [clinicName, value, onChange])

  // Debounce value changes
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value)
    }, 500)

    return () => clearTimeout(timer)
  }, [value])

  // Check availability when debounced value changes
  useEffect(() => {
    if (!debouncedValue || debouncedValue.length < 3) {
      setAvailability(null)
      return
    }

    const checkSlug = async () => {
      setIsChecking(true)
      try {
        const response = await fetch(`/api/signup/check-slug?slug=${encodeURIComponent(debouncedValue)}`)
        const data: CheckSlugResponse = await response.json()
        setAvailability(data)
      } catch (_error: unknown) {
        setAvailability(null)
      } finally {
        setIsChecking(false)
      }
    }

    checkSlug()
  }, [debouncedValue])

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, '')
        .slice(0, 30)
      onChange(newValue)
    },
    [onChange]
  )

  const handleSuggestionClick = useCallback(() => {
    if (availability?.suggestion) {
      onChange(availability.suggestion)
    }
  }, [availability, onChange])

  const getStatusIcon = () => {
    if (isChecking) {
      return <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
    }
    if (!availability || value.length < 3) {
      return null
    }
    if (availability.available) {
      return <CheckCircle2 className="h-5 w-5 text-green-500" />
    }
    return <XCircle className="h-5 w-5 text-red-500" />
  }

  const getStatusMessage = () => {
    if (!availability || value.length < 3) {
      return null
    }

    if (availability.available) {
      return <span className="text-sm text-green-600">Disponible</span>
    }

    const reasonText = {
      taken: 'Este slug ya esta en uso',
      reserved: 'Este slug esta reservado',
      invalid_format: 'Formato invalido',
    }

    return (
      <div className="space-y-1">
        <span className="text-sm text-red-600">{reasonText[availability.reason || 'taken']}</span>
        {availability.suggestion && (
          <button
            type="button"
            onClick={handleSuggestionClick}
            className="block text-sm text-blue-600 hover:underline"
          >
            Sugerencia: {availability.suggestion}
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <label htmlFor="slug" className="block text-sm font-medium text-gray-700">
        Slug de la URL <span className="text-red-500">*</span>
      </label>

      <div className="relative">
        <div className="flex rounded-lg border border-gray-300 bg-gray-50 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500">
          <span className="flex items-center pl-3 text-gray-500 text-sm">vetic.com/</span>
          <input
            id="slug"
            type="text"
            value={value}
            onChange={handleInputChange}
            disabled={disabled}
            placeholder="mi-clinica"
            className="flex-1 bg-transparent border-0 py-2 pr-10 text-gray-900 placeholder:text-gray-400 focus:ring-0 sm:text-sm disabled:cursor-not-allowed"
            aria-describedby="slug-status"
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2">{getStatusIcon()}</div>
        </div>
      </div>

      <div id="slug-status" className="min-h-[20px]">
        {error ? (
          <div className="flex items-center gap-1 text-sm text-red-600">
            <AlertCircle className="h-4 w-4" />
            {error}
          </div>
        ) : (
          getStatusMessage()
        )}
      </div>

      <p className="text-xs text-gray-500">
        Solo letras minusculas, numeros y guiones. Debe comenzar con una letra. 3-30 caracteres.
      </p>
    </div>
  )
}
