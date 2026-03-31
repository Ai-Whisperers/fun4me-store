/**
 * Vetic Branding Configuration
 *
 * This file centralizes all brand-related settings to enable easy white-labeling.
 * Change values here to rebrand the entire platform.
 *
 * Company: AI-Whisperers
 * Brand: Vetic
 */

export interface BrandConfig {
  // Core branding
  name: string
  tagline: string
  domain: string

  // Company details
  company: {
    name: string
    fullLegalName: string
    country: string
    taxId: string
    address: string
    email: string
    phone: string
  }

  // Visual assets
  assets: {
    logo: string
    logoLight: string
    logoDark: string
    favicon: string
    ogImage: string
  }

  // Social links
  social: {
    instagram?: string
    facebook?: string
    twitter?: string
    linkedin?: string
    youtube?: string
    whatsapp?: string
  }

  // WhatsApp Business configuration
  whatsapp: {
    number: string
    displayNumber: string
  }

  // Feature flags
  features: {
    showPoweredBy: boolean
    poweredByText: string
    allowWhiteLabel: boolean
  }

  // Legal pages
  legal: {
    termsUrl: string
    privacyUrl: string
    cookiesUrl: string
    dataTransparencyUrl: string
  }
}

/**
 * Default brand configuration for Vetic
 * To white-label, create a new config object with your brand details
 */
export const brandConfig: BrandConfig = {
  name: 'Vetic',
  tagline: 'Tu clínica veterinaria, digitalizada',
  domain: 'Vetic.com',

  company: {
    name: 'AI-Whisperers',
    fullLegalName: 'AI-Whisperers S.A.',
    country: 'Paraguay',
    taxId: '', // TODO: Add when registered
    address: 'Asunción, Paraguay',
    email: 'contacto@Vetic.com',
    phone: '+595 XXX XXX XXX',
  },

  assets: {
    logo: '/images/logo.svg',
    logoLight: '/images/logo-light.svg',
    logoDark: '/images/logo-dark.svg',
    favicon: '/favicon.ico',
    ogImage: '/images/og-image.png',
  },

  social: {
    instagram: 'https://instagram.com/Vetic',
    facebook: 'https://facebook.com/Vetic',
    whatsapp: 'https://wa.me/595981324569',
  },

  whatsapp: {
    number: '595981324569',
    displayNumber: '+595 981 324 569',
  },

  features: {
    showPoweredBy: true,
    poweredByText: 'Powered by Vetic',
    allowWhiteLabel: true,
  },

  legal: {
    termsUrl: '/legal/terminos',
    privacyUrl: '/legal/privacidad',
    cookiesUrl: '/legal/cookies',
    dataTransparencyUrl: '/legal/datos',
  },
}

/**
 * Helper function to get brand name
 */
export function getBrandName(): string {
  return brandConfig.name
}

/**
 * Helper function to get powered by text
 */
export function getPoweredByText(): string {
  return brandConfig.features.poweredByText
}

/**
 * Helper function to check if white-labeling is allowed
 */
export function isWhiteLabelAllowed(): boolean {
  return brandConfig.features.allowWhiteLabel
}

/**
 * Helper function to get full company name for legal documents
 */
export function getLegalCompanyName(): string {
  return brandConfig.company.fullLegalName
}

/**
 * Currency configuration by country
 */
export const currencyConfig = {
  py: {
    code: 'PYG',
    symbol: 'Gs',
    name: 'Guaraníes',
    locale: 'es-PY',
    exchangeRateToUSD: 7300, // approximate
  },
  bo: {
    code: 'BOB',
    symbol: 'Bs',
    name: 'Bolivianos',
    locale: 'es-BO',
    exchangeRateToUSD: 6.9,
  },
  uy: {
    code: 'UYU',
    symbol: '$U',
    name: 'Pesos Uruguayos',
    locale: 'es-UY',
    exchangeRateToUSD: 39,
  },
  br: {
    code: 'BRL',
    symbol: 'R$',
    name: 'Reais',
    locale: 'pt-BR',
    exchangeRateToUSD: 5,
  },
}

export type SupportedCountry = keyof typeof currencyConfig

/**
 * Get currency config for a country
 */
export function getCurrencyConfig(country: SupportedCountry) {
  return currencyConfig[country] || currencyConfig.py
}

/**
 * Format price in local currency
 */
export function formatPrice(amount: number, country: SupportedCountry = 'py'): string {
  const config = getCurrencyConfig(country)

  if (country === 'py') {
    // Guaraníes don't use decimals
    return `${config.symbol} ${amount.toLocaleString(config.locale, { maximumFractionDigits: 0 })}`
  }

  return `${config.symbol} ${amount.toLocaleString(config.locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

/**
 * Convert USD to local currency
 */
export function usdToLocal(usdAmount: number, country: SupportedCountry = 'py'): number {
  const config = getCurrencyConfig(country)
  return Math.round(usdAmount * config.exchangeRateToUSD)
}

// Note: WhatsApp utility functions have been moved to @/lib/whatsapp
// Use: import { getWhatsAppUrl, getWhatsAppDisplayNumber } from '@/lib/whatsapp'

export default brandConfig
