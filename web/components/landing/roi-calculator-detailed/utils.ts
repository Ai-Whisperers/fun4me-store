/**
 * ROI Calculator Detailed Utilities
 *
 * REF-006: Utility functions extracted from client component
 */

export function formatCurrency(value: number): string {
  if (value >= 1000000) {
    return `Gs ${(value / 1000000).toFixed(1)}M`
  }
  return `Gs ${new Intl.NumberFormat('es-PY').format(Math.round(value))}`
}

export function formatPercent(value: number): string {
  return `${(value * 100).toFixed(0)}%`
}
