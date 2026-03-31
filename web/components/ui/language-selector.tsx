'use client'

import { useTransition, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Globe, Check, ChevronDown } from 'lucide-react'
import { locales, localeNames, localeFlags, type Locale } from '@/i18n/config'

interface LanguageSelectorProps {
  currentLocale: Locale
  className?: string
  variant?: 'dropdown' | 'inline'
}

export function LanguageSelector({
  currentLocale,
  className = '',
  variant = 'dropdown',
}: LanguageSelectorProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [isOpen, setIsOpen] = useState(false)

  const handleLocaleChange = async (newLocale: Locale) => {
    if (newLocale === currentLocale) {
      setIsOpen(false)
      return
    }

    // Set the cookie via API
    try {
      await fetch('/api/locale', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ locale: newLocale }),
      })

      startTransition(() => {
        router.refresh()
        setIsOpen(false)
      })
    } catch (error) {
      console.error('Failed to change locale:', error)
    }
  }

  if (variant === 'inline') {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        {locales.map((locale) => (
          <button
            key={locale}
            onClick={() => handleLocaleChange(locale)}
            disabled={isPending}
            className={`flex items-center gap-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              locale === currentLocale
                ? 'bg-[var(--primary)] text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
            } ${isPending ? 'cursor-wait opacity-50' : ''} `}
            aria-pressed={locale === currentLocale}
            aria-label={`Cambiar idioma a ${localeNames[locale]}`}
          >
            <span aria-hidden="true">{localeFlags[locale]}</span>
            <span>{locale.toUpperCase()}</span>
          </button>
        ))}
      </div>
    )
  }

  // Dropdown variant
  return (
    <div className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700 ${isPending ? 'cursor-wait opacity-50' : ''} `}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-label="Seleccionar idioma"
        disabled={isPending}
      >
        <Globe className="h-4 w-4" aria-hidden="true" />
        <span>{localeFlags[currentLocale]}</span>
        <span className="hidden sm:inline">{localeNames[currentLocale]}</span>
        <ChevronDown
          className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          aria-hidden="true"
        />
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} aria-hidden="true" />

          {/* Dropdown menu */}
          <ul
            role="listbox"
            className="absolute right-0 z-50 mt-2 w-40 rounded-lg border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-700 dark:bg-gray-800"
            aria-label="Idiomas disponibles"
          >
            {locales.map((locale) => (
              <li key={locale}>
                <button
                  role="option"
                  aria-selected={locale === currentLocale}
                  onClick={() => handleLocaleChange(locale)}
                  className={`flex w-full items-center gap-3 px-4 py-2 text-left text-sm transition-colors ${
                    locale === currentLocale
                      ? 'bg-[var(--primary)]/10 text-[var(--primary)]'
                      : 'text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700'
                  } `}
                >
                  <span aria-hidden="true">{localeFlags[locale]}</span>
                  <span className="flex-1">{localeNames[locale]}</span>
                  {locale === currentLocale && <Check className="h-4 w-4" aria-hidden="true" />}
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}
