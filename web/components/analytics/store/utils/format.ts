/**
 * Store Analytics Formatting Utilities
 *
 * Currency and date formatting for Paraguay locale.
 */

/**
 * Format a number as Paraguayan currency (Guaraníes).
 * Uses compact notation for large values (K, M).
 */
export function formatCurrency(value: number): string {
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M Gs.`
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(0)}K Gs.`
  }
  return `${value.toLocaleString('es-PY')} Gs.`
}

/**
 * Format a date string in short Spanish format (e.g., "ene. 15").
 */
export function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString('es-PY', { month: 'short', day: 'numeric' })
}

/**
 * Format a percentage with one decimal place.
 */
export function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`
}
