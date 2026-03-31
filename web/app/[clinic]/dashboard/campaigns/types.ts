/**
 * Campaigns Dashboard Types
 *
 * REF-006: Type definitions extracted from client component
 */

export interface Campaign {
  id: string
  name: string
  description: string | null
  campaign_type: CampaignType
  discount_type: DiscountType
  discount_value: number
  start_date: string
  end_date: string
  is_active: boolean
  created_at: string
  product_count: number
  status: CampaignStatus
}

export interface CampaignsPagination {
  page: number
  limit: number
  total: number
  pages: number
  hasNext: boolean
  hasPrev: boolean
}

export type CampaignType = 'sale' | 'bogo' | 'bundle' | 'flash' | 'seasonal'
export type DiscountType = 'percentage' | 'fixed_amount'
export type CampaignStatus = 'active' | 'inactive' | 'scheduled' | 'ended'
export type CampaignStatusFilter = 'all' | CampaignStatus
export type ViewMode = 'grid' | 'calendar'

export interface CampaignFormData {
  name: string
  description: string
  campaign_type: CampaignType
  discount_type: DiscountType
  discount_value: number
  start_date: string
  end_date: string
  is_active: boolean
}
