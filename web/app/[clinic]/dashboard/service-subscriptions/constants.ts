/**
 * Service Subscriptions Dashboard Constants
 *
 * REF-006: Configuration constants extracted from client component
 */

import type { TabId, PlanFormData } from './types'

export const TABS: { id: TabId; label: string; iconName: 'RefreshCw' | 'Truck' | 'Package' }[] = [
  { id: 'subscriptions', label: 'Suscripciones', iconName: 'RefreshCw' },
  { id: 'today', label: 'Hoy', iconName: 'Truck' },
  { id: 'plans', label: 'Planes', iconName: 'Package' },
]

export const STATUS_STYLES: Record<string, string> = {
  active: 'bg-[var(--status-success-bg,#dcfce7)] text-[var(--status-success,#16a34a)]',
  paused: 'bg-[var(--status-warning-bg,#fef3c7)] text-[var(--status-warning,#d97706)]',
  cancelled: 'bg-[var(--status-error-bg,#fef2f2)] text-[var(--status-error,#dc2626)]',
  pending: 'bg-[var(--bg-secondary,#f3f4f6)] text-[var(--text-secondary,#6b7280)]',
}

export const STATUS_LABELS: Record<string, string> = {
  active: 'Activa',
  paused: 'Pausada',
  cancelled: 'Cancelada',
  pending: 'Pendiente',
}

export const FREQUENCY_MAP: Record<string, string> = {
  weekly: 'Semanal',
  biweekly: 'Quincenal',
  monthly: 'Mensual',
  quarterly: 'Trimestral',
}

export const DEFAULT_PLAN_FORM: PlanFormData = {
  name: '',
  description: '',
  service_id: '',
  price_per_period: '',
  billing_frequency: 'monthly',
  service_frequency: 'monthly',
  services_per_period: '1',
  includes_pickup: false,
  includes_delivery: false,
  pickup_fee: '0',
  delivery_fee: '0',
  is_featured: false,
}

export const PAGINATION_DEFAULT = {
  total: 0,
  limit: 20,
  offset: 0,
}
