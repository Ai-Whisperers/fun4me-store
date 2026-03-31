/**
 * Inventory Client Utilities
 *
 * REF-006: Utility functions extracted from client component
 */

export function formatPrice(price: number): string {
  return new Intl.NumberFormat('es-PY', {
    style: 'currency',
    currency: 'PYG',
    maximumFractionDigits: 0,
  }).format(price)
}
