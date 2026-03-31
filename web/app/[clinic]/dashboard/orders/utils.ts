/**
 * Orders Dashboard Utilities
 *
 * REF-006: Extracted formatting utilities
 */

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('es-PY', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function formatCurrency(amount: number): string {
  return `₲ ${amount.toLocaleString('es-PY')}`
}
