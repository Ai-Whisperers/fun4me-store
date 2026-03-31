'use client'

import { useLocale as useNextIntlLocale } from 'next-intl'
import type { Locale } from './config'

/**
 * Hook to get the current locale with proper typing
 */
export function useLocale(): Locale {
  const locale = useNextIntlLocale()
  return locale as Locale
}
