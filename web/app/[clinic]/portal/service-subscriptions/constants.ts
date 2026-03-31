/**
 * Portal Service Subscriptions Constants
 *
 * REF-006: Configuration constants extracted from client component
 */

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

export const DAY_NAMES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']

export const TIME_SLOTS: Record<string, string> = {
  morning: 'Mañana (8-12h)',
  afternoon: 'Tarde (12-18h)',
  evening: 'Noche (18-21h)',
}

export const WEEKDAY_OPTIONS = [1, 2, 3, 4, 5, 6, 0] // Mon-Sun order

export const DEFAULT_SUBSCRIBE_FORM = {
  selectedPetId: '',
  preferredDay: 1,
  preferredTime: 'morning',
  wantsPickup: false,
  wantsDelivery: false,
  pickupAddress: '',
  deliveryAddress: '',
  specialInstructions: '',
}
