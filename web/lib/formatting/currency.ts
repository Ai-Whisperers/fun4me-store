/**
 * Currency Formatting Utilities
 *
 * Centralized currency formatting for the multi-tenant veterinary platform.
 * Primary currency: Paraguayan Guaraní (PYG) - no decimal places.
 */

const CURRENCY_CONFIG = {
  PYG: { locale: 'es-PY', currency: 'PYG', decimals: 0, symbol: '₲' },
  USD: { locale: 'en-US', currency: 'USD', decimals: 2, symbol: '$' },
  BRL: { locale: 'pt-BR', currency: 'BRL', decimals: 2, symbol: 'R$' },
} as const

export type CurrencyCode = keyof typeof CURRENCY_CONFIG

/**
 * Format amount as currency using Intl.NumberFormat
 *
 * @param amount - Amount to format
 * @param currency - Currency code (defaults to PYG)
 * @returns Formatted currency string (e.g., "₲ 150.000")
 *
 * @example
 * formatCurrency(150000) // "₲ 150.000"
 * formatCurrency(99.99, 'USD') // "$99.99"
 */
export function formatCurrency(amount: number, currency: CurrencyCode = 'PYG'): string {
  const config = CURRENCY_CONFIG[currency]
  return new Intl.NumberFormat(config.locale, {
    style: 'currency',
    currency: config.currency,
    minimumFractionDigits: config.decimals,
    maximumFractionDigits: config.decimals,
  }).format(amount)
}

/**
 * Format price in Paraguayan Guaraníes (most common use case)
 *
 * @param amount - Amount in guaraníes
 * @returns Formatted price string (e.g., "₲ 150.000")
 *
 * @example
 * formatPrice(150000) // "₲ 150.000"
 * formatPrice(null) // "₲ 0"
 */
export function formatPrice(amount: number | null | undefined): string {
  if (amount === null || amount === undefined) {
    return formatCurrency(0, 'PYG')
  }
  return formatCurrency(amount, 'PYG')
}

/**
 * Format price with "Gs" suffix (legacy format, still used in some places)
 *
 * @param amount - Amount in guaraníes
 * @returns Formatted string (e.g., "150.000 Gs")
 *
 * @example
 * formatPriceGs(150000) // "150.000 Gs"
 */
export function formatPriceGs(price: number | null | undefined): string {
  if (price === null || price === undefined) return '0 Gs'
  return `${price.toLocaleString('es-PY')} Gs`
}

/**
 * Parse currency string to number
 *
 * @param value - Currency string (e.g., "₲ 150.000", "$99.99")
 * @returns Numeric value
 *
 * @example
 * parseCurrency("₲ 150.000") // 150000
 * parseCurrency("$99.99") // 99.99
 */
export function parseCurrency(value: string): number {
  const cleaned = value.replace(/[^\d,.-]/g, '').replace(',', '.')
  return parseFloat(cleaned) || 0
}

/**
 * Format price range
 *
 * @param min - Minimum price
 * @param max - Maximum price
 * @returns Formatted range (e.g., "₲ 50.000 - ₲ 150.000") or single price if equal
 *
 * @example
 * formatPriceRange(50000, 150000) // "₲ 50.000 - ₲ 150.000"
 * formatPriceRange(100000, 100000) // "₲ 100.000"
 */
export function formatPriceRange(min: number, max: number): string {
  if (min === max) return formatPrice(min)
  return `${formatPrice(min)} - ${formatPrice(max)}`
}

/**
 * Format price with "Desde" prefix for minimum pricing display
 *
 * @param amount - Minimum price
 * @returns Formatted string (e.g., "Desde ₲ 50.000")
 *
 * @example
 * formatFromPrice(50000) // "Desde ₲ 50.000"
 */
export function formatFromPrice(amount: number | null | undefined): string {
  if (amount === null || amount === undefined) return ''
  return `Desde ${formatPrice(amount)}`
}

/**
 * Round currency to appropriate decimal places
 *
 * @param amount - Amount to round
 * @param currency - Currency code
 * @returns Rounded amount
 *
 * @example
 * roundCurrency(150000.6, 'PYG') // 150001
 * roundCurrency(99.999, 'USD') // 100.00
 */
export function roundCurrency(amount: number, currency: CurrencyCode = 'PYG'): number {
  const config = CURRENCY_CONFIG[currency]
  const factor = Math.pow(10, config.decimals)
  return Math.round(amount * factor) / factor
}
