'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'

interface NewsletterFormProps {
  clinic: string
  title?: string
  placeholder?: string
  buttonText?: string
}

// Skeleton that matches the form layout for SSR
function NewsletterSkeleton() {
  return (
    <div className="flex animate-pulse flex-col items-center justify-between gap-6 md:flex-row">
      <div className="text-center md:text-left">
        <div className="mb-2 h-6 w-48 rounded bg-white/20" />
        <div className="h-4 w-64 rounded bg-white/10" />
      </div>
      <div className="flex w-full gap-2 md:w-auto">
        <div className="h-12 flex-1 rounded-xl bg-white/10 md:w-64" />
        <div className="h-12 w-24 rounded-xl bg-white/20" />
      </div>
    </div>
  )
}

export function NewsletterForm({
  clinic,
  title,
  placeholder,
  buttonText,
}: NewsletterFormProps) {
  const t = useTranslations('newsletter')
  const [isMounted, setIsMounted] = useState(false)

  const displayTitle = title ?? t('title')
  const displayPlaceholder = placeholder ?? t('emailPlaceholder')
  const displayButtonText = buttonText ?? t('submit')

  useEffect(() => {
    setIsMounted(true)
  }, [])

  // Show skeleton during SSR and initial client render
  // This prevents hydration mismatch from browser extensions (LastPass, etc.)
  if (!isMounted) {
    return <NewsletterSkeleton />
  }

  return (
    <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
      <div className="text-center md:text-left">
        <h4 id="newsletter-heading" className="mb-1 text-lg font-bold text-white">
          {displayTitle}
        </h4>
        <p className="text-sm text-gray-400">
          {t('subtitle')}
        </p>
      </div>
      <form className="flex w-full gap-2 md:w-auto" action="/api/newsletter" method="POST">
        <input type="hidden" name="clinic" value={clinic} />
        <label htmlFor="newsletter-email" className="sr-only">
          {t('emailLabel')}
        </label>
        <input
          id="newsletter-email"
          type="email"
          name="email"
          placeholder={displayPlaceholder}
          required
          aria-required="true"
          autoComplete="off"
          data-lpignore="true"
          data-form-type="other"
          className="flex-1 rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-white placeholder-gray-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[var(--primary)] md:w-64"
        />
        <button
          type="submit"
          className="whitespace-nowrap rounded-xl bg-[var(--primary)] px-6 py-3 font-bold text-white transition-opacity hover:opacity-90"
        >
          {displayButtonText}
        </button>
      </form>
    </div>
  )
}
