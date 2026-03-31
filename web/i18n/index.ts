/**
 * i18n Module
 *
 * This module provides internationalization support for the Vete platform.
 *
 * ## Usage
 *
 * ### In Server Components:
 * ```tsx
 * import { getTranslations } from 'next-intl/server';
 *
 * export default async function Page() {
 *   const t = await getTranslations('common');
 *   return <h1>{t('loading')}</h1>;
 * }
 * ```
 *
 * ### In Client Components:
 * ```tsx
 * 'use client';
 * import { useTranslations } from 'next-intl';
 *
 * export function MyComponent() {
 *   const t = useTranslations('common');
 *   return <button>{t('save')}</button>;
 * }
 * ```
 *
 * ### With Pluralization:
 * ```tsx
 * const t = useTranslations('time');
 * // For "days": "{count, plural, one {# day} other {# days}}"
 * t('days', { count: 5 }); // "5 days"
 * ```
 *
 * ### Translation Namespaces:
 * - common: Common UI elements (save, cancel, etc.)
 * - auth: Authentication-related text
 * - nav: Navigation items
 * - pets: Pet management
 * - appointments: Appointment booking
 * - vaccines: Vaccination records
 * - store: E-commerce/store
 * - orders: Order management
 * - invoices: Invoice/billing
 * - clinical: Clinical tools
 * - messages: Success/error messages
 * - time: Time-related text (today, yesterday, etc.)
 */

// Re-export config types
export { locales, defaultLocale, localeNames, localeFlags } from './config'
export type { Locale } from './config'

// Re-export hooks
export { useLocale } from './hooks'
