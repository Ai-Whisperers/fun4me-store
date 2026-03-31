/**
 * Site Metadata Configuration
 *
 * Centralized URL and metadata constants for SEO, sitemaps, and structured data.
 * Uses environment variables for environment-specific deployments.
 *
 * @module lib/config/metadata
 * @see REF-007: Centralize BASE_URL Configuration
 */

import { env } from '@/lib/env'

/**
 * Site configuration constants
 */
export const SITE_CONFIG = {
  /** Base URL from environment or default */
  url: env.APP_URL,
  /** Site name */
  name: 'Vetic',
  /** Default page title */
  defaultTitle: 'Vetic - Plataforma Veterinaria',
  /** Default description for SEO */
  description: 'Sistema de gestión veterinaria multi-tenant para clínicas modernas',
  /** Twitter handle (without @) */
  twitter: 'vetic_app',
  /** Default locale */
  locale: 'es_PY',
  /** Default language */
  language: 'es',
} as const

/**
 * Get the full site URL with optional path
 *
 * @param path - Optional path to append (should start with /)
 * @returns Full URL string
 *
 * @example
 * getSiteUrl() // 'https://vetic.app'
 * getSiteUrl('/about') // 'https://vetic.app/about'
 */
export function getSiteUrl(path = ''): string {
  const baseUrl = SITE_CONFIG.url.replace(/\/$/, '') // Remove trailing slash
  return `${baseUrl}${path}`
}

/**
 * Get canonical URL for a clinic-specific page
 *
 * @param clinic - Clinic slug
 * @param path - Optional path within the clinic (should start with /)
 * @returns Full canonical URL
 *
 * @example
 * getCanonicalUrl('terrapet') // 'https://vetic.app/terrapet'
 * getCanonicalUrl('terrapet', '/services') // 'https://vetic.app/terrapet/services'
 */
export function getCanonicalUrl(clinic: string, path = ''): string {
  return getSiteUrl(`/${clinic}${path}`)
}

/**
 * Get URL object for Next.js metadataBase
 *
 * @returns URL object for metadataBase configuration
 */
export function getMetadataBaseUrl(): URL {
  return new URL(SITE_CONFIG.url)
}
