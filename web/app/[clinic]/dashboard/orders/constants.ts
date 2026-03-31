/**
 * Orders Dashboard Constants
 *
 * REF-006: Configuration extracted from client component
 */

import type { OrderStatus } from './types'

export const STATUS_OPTIONS = [
  { value: 'all', label: 'Todos' },
  { value: 'pending', label: 'Pendientes' },
  { value: 'confirmed', label: 'Confirmados' },
  { value: 'processing', label: 'En Proceso' },
  { value: 'ready', label: 'Listos' },
  { value: 'shipped', label: 'Enviados' },
  { value: 'delivered', label: 'Entregados' },
  { value: 'cancelled', label: 'Cancelados' },
] as const

export const PAYMENT_STATUS_OPTIONS = [
  { value: 'all', label: 'Todos' },
  { value: 'pending', label: 'Pendiente' },
  { value: 'paid', label: 'Pagado' },
  { value: 'failed', label: 'Fallido' },
  { value: 'refunded', label: 'Reembolsado' },
] as const

export const STATUS_WORKFLOW: OrderStatus[] = [
  'pending',
  'confirmed',
  'processing',
  'ready',
  'shipped',
  'delivered',
]

export const STATUS_CONFIG: Record<
  string,
  { bg: string; text: string; label: string }
> = {
  pending: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Pendiente' },
  confirmed: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Confirmado' },
  processing: { bg: 'bg-purple-100', text: 'text-purple-700', label: 'En Proceso' },
  ready: { bg: 'bg-indigo-100', text: 'text-indigo-700', label: 'Listo' },
  shipped: { bg: 'bg-cyan-100', text: 'text-cyan-700', label: 'Enviado' },
  delivered: { bg: 'bg-green-100', text: 'text-green-700', label: 'Entregado' },
  cancelled: { bg: 'bg-red-100', text: 'text-red-700', label: 'Cancelado' },
  refunded: { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Reembolsado' },
}

export const PAYMENT_STATUS_CONFIG: Record<
  string,
  { bg: string; text: string; label: string }
> = {
  pending: { bg: 'bg-yellow-50', text: 'text-yellow-600', label: 'Pago Pendiente' },
  paid: { bg: 'bg-green-50', text: 'text-green-600', label: 'Pagado' },
  failed: { bg: 'bg-red-50', text: 'text-red-600', label: 'Pago Fallido' },
  refunded: { bg: 'bg-gray-50', text: 'text-gray-600', label: 'Reembolsado' },
}

export const SUMMARY_CARDS = [
  { key: 'pending', label: 'Pendientes', color: 'yellow' },
  { key: 'confirmed', label: 'Confirmados', color: 'blue' },
  { key: 'processing', label: 'En Proceso', color: 'purple' },
  { key: 'ready', label: 'Listos', color: 'indigo' },
  { key: 'shipped', label: 'Enviados', color: 'cyan' },
  { key: 'delivered', label: 'Entregados', color: 'green' },
  { key: 'cancelled', label: 'Cancelados', color: 'red' },
] as const

export const DEFAULT_PAGINATION = {
  page: 1,
  limit: 25,
  total: 0,
  pages: 0,
  hasNext: false,
  hasPrev: false,
}

export const DEFAULT_SUMMARY = {
  pending: 0,
  confirmed: 0,
  processing: 0,
  ready: 0,
  shipped: 0,
  delivered: 0,
  cancelled: 0,
}
