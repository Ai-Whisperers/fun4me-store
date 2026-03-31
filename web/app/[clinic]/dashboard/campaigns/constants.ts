/**
 * Campaigns Dashboard Constants
 *
 * REF-006: Configuration constants extracted from client component
 */

import type { CampaignStatusFilter, CampaignType, DiscountType, CampaignStatus } from './types'

export interface StatusOption {
  value: CampaignStatusFilter
  label: string
}

export interface CampaignTypeOption {
  value: CampaignType
  label: string
  iconName: 'Tag' | 'Gift' | 'Package' | 'Zap' | 'Sun'
  color: 'green' | 'purple' | 'blue' | 'orange' | 'yellow' | 'gray'
}

export interface DiscountTypeOption {
  value: DiscountType
  label: string
  iconName: 'Percent' | 'DollarSign'
}

export interface StatusBadgeConfig {
  bg: string
  text: string
  iconName: 'CheckCircle' | 'XCircle' | 'Clock' | 'Calendar'
  label: string
}

export const STATUS_OPTIONS: StatusOption[] = [
  { value: 'all', label: 'Todas' },
  { value: 'active', label: 'Activas' },
  { value: 'scheduled', label: 'Programadas' },
  { value: 'ended', label: 'Finalizadas' },
  { value: 'inactive', label: 'Inactivas' },
]

export const CAMPAIGN_TYPE_OPTIONS: CampaignTypeOption[] = [
  { value: 'sale', label: 'Oferta', iconName: 'Tag', color: 'green' },
  { value: 'bogo', label: '2x1', iconName: 'Gift', color: 'purple' },
  { value: 'bundle', label: 'Bundle', iconName: 'Package', color: 'blue' },
  { value: 'flash', label: 'Flash', iconName: 'Zap', color: 'orange' },
  { value: 'seasonal', label: 'Temporada', iconName: 'Sun', color: 'yellow' },
]

export const DISCOUNT_TYPE_OPTIONS: DiscountTypeOption[] = [
  { value: 'percentage', label: 'Porcentaje', iconName: 'Percent' },
  { value: 'fixed_amount', label: 'Monto Fijo', iconName: 'DollarSign' },
]

export const STATUS_BADGE_CONFIG: Record<CampaignStatus, StatusBadgeConfig> = {
  active: {
    bg: 'bg-green-100',
    text: 'text-green-700',
    iconName: 'CheckCircle',
    label: 'Activa',
  },
  inactive: {
    bg: 'bg-gray-100',
    text: 'text-gray-600',
    iconName: 'XCircle',
    label: 'Inactiva',
  },
  ended: {
    bg: 'bg-red-100',
    text: 'text-red-700',
    iconName: 'Clock',
    label: 'Finalizada',
  },
  scheduled: {
    bg: 'bg-blue-100',
    text: 'text-blue-700',
    iconName: 'Calendar',
    label: 'Programada',
  },
}

export const COLOR_CLASSES: Record<CampaignTypeOption['color'], { gradient: string; icon: string }> = {
  green: {
    gradient: 'from-green-50 to-green-100/50',
    icon: 'text-green-600',
  },
  purple: {
    gradient: 'from-purple-50 to-purple-100/50',
    icon: 'text-purple-600',
  },
  blue: {
    gradient: 'from-blue-50 to-blue-100/50',
    icon: 'text-blue-600',
  },
  orange: {
    gradient: 'from-orange-50 to-orange-100/50',
    icon: 'text-orange-600',
  },
  yellow: {
    gradient: 'from-yellow-50 to-yellow-100/50',
    icon: 'text-yellow-600',
  },
  gray: {
    gradient: 'from-gray-50 to-gray-100/50',
    icon: 'text-gray-600',
  },
}

export const WEEK_DAYS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']

export function getDefaultFormData(): {
  name: string
  description: string
  campaign_type: CampaignType
  discount_type: DiscountType
  discount_value: number
  start_date: string
  end_date: string
  is_active: boolean
} {
  const today = new Date().toISOString().split('T')[0]
  const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  return {
    name: '',
    description: '',
    campaign_type: 'sale',
    discount_type: 'percentage',
    discount_value: 10,
    start_date: today,
    end_date: nextWeek,
    is_active: true,
  }
}

export const PAGINATION_DEFAULT = {
  page: 1,
  limit: 50,
  total: 0,
  pages: 0,
  hasNext: false,
  hasPrev: false,
}
