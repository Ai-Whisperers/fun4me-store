/**
 * Ambassador Dashboard Utilities
 *
 * Helper functions for formatting and badge generation.
 */

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('es-PY', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export function formatCurrency(amount: number): string {
  return `Gs ${amount.toLocaleString('es-PY')}`
}

export const statusStyles: Record<string, { bg: string; text: string }> = {
  pending: { bg: 'bg-yellow-100', text: 'text-yellow-800' },
  trial_started: { bg: 'bg-blue-100', text: 'text-blue-800' },
  converted: { bg: 'bg-green-100', text: 'text-green-800' },
  expired: { bg: 'bg-gray-100', text: 'text-gray-800' },
}

export const statusLabels: Record<string, string> = {
  pending: 'Pendiente',
  trial_started: 'En prueba',
  converted: 'Convertido',
  expired: 'Expirado',
}

export const tierStyles: Record<string, string> = {
  embajador: 'bg-blue-100 text-blue-800 border-blue-200',
  promotor: 'bg-purple-100 text-purple-800 border-purple-200',
  super: 'bg-gradient-to-r from-yellow-100 to-amber-100 text-amber-800 border-amber-200',
}

export const tierLabels: Record<string, string> = {
  embajador: 'Embajador',
  promotor: 'Promotor',
  super: 'Super Embajador',
}
