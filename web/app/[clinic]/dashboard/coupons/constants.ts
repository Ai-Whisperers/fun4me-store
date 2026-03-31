/**
 * Coupons Dashboard Constants
 *
 * REF-006: Configuration constants extracted from client component
 */

import type { CouponStatusFilter, DiscountType, CouponStatus } from './types'

export interface StatusOption {
  value: CouponStatusFilter
  label: string
}

export interface DiscountTypeOption {
  value: DiscountType
  label: string
  iconName: 'Percent' | 'DollarSign' | 'Truck'
}

export interface StatusBadgeConfig {
  bg: string
  text: string
  iconName: 'CheckCircle' | 'XCircle' | 'Clock' | 'AlertCircle' | 'Calendar'
  label: string
}

export const STATUS_OPTIONS: StatusOption[] = [
  { value: 'all', label: 'Todos' },
  { value: 'active', label: 'Activos' },
  { value: 'inactive', label: 'Inactivos' },
  { value: 'expired', label: 'Expirados' },
  { value: 'exhausted', label: 'Agotados' },
  { value: 'scheduled', label: 'Programados' },
]

export const DISCOUNT_TYPE_OPTIONS: DiscountTypeOption[] = [
  { value: 'percentage', label: 'Porcentaje', iconName: 'Percent' },
  { value: 'fixed_amount', label: 'Monto Fijo', iconName: 'DollarSign' },
  { value: 'free_shipping', label: 'Envío Gratis', iconName: 'Truck' },
]

export const STATUS_BADGE_CONFIG: Record<CouponStatus, StatusBadgeConfig> = {
  active: {
    bg: 'bg-green-100',
    text: 'text-green-700',
    iconName: 'CheckCircle',
    label: 'Activo',
  },
  inactive: {
    bg: 'bg-gray-100',
    text: 'text-gray-600',
    iconName: 'XCircle',
    label: 'Inactivo',
  },
  expired: {
    bg: 'bg-red-100',
    text: 'text-red-700',
    iconName: 'Clock',
    label: 'Expirado',
  },
  exhausted: {
    bg: 'bg-orange-100',
    text: 'text-orange-700',
    iconName: 'AlertCircle',
    label: 'Agotado',
  },
  scheduled: {
    bg: 'bg-blue-100',
    text: 'text-blue-700',
    iconName: 'Calendar',
    label: 'Programado',
  },
}

export const DEFAULT_FORM_DATA = {
  code: '',
  name: '',
  description: '',
  discount_type: 'percentage' as DiscountType,
  discount_value: 10,
  min_purchase_amount: 0,
  max_discount_amount: 0,
  usage_limit: 0,
  usage_limit_per_user: 1,
  valid_from: new Date().toISOString().split('T')[0],
  valid_until: '',
  is_active: true,
}

export const PAGINATION_DEFAULT = {
  page: 1,
  limit: 25,
  total: 0,
  pages: 0,
  hasNext: false,
  hasPrev: false,
}
