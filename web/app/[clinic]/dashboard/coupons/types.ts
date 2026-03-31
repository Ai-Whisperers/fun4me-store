/**
 * Coupons Dashboard Types
 *
 * REF-006: Type definitions extracted from client component
 */

export interface Coupon {
  id: string
  code: string
  name: string | null
  description: string | null
  discount_type: DiscountType
  discount_value: number
  min_purchase_amount: number | null
  max_discount_amount: number | null
  usage_limit: number | null
  usage_count: number
  usage_limit_per_user: number | null
  valid_from: string
  valid_until: string | null
  applicable_products: string[] | null
  applicable_categories: string[] | null
  is_active: boolean
  created_at: string
  creator_name: string | null
  status: CouponStatus
}

export interface CouponsPagination {
  page: number
  limit: number
  total: number
  pages: number
  hasNext: boolean
  hasPrev: boolean
}

export type CouponStatus = 'active' | 'inactive' | 'expired' | 'exhausted' | 'scheduled'
export type CouponStatusFilter = 'all' | CouponStatus
export type DiscountType = 'percentage' | 'fixed_amount' | 'free_shipping'

export interface CouponFormData {
  code: string
  name: string
  description: string
  discount_type: DiscountType
  discount_value: number
  min_purchase_amount: number
  max_discount_amount: number
  usage_limit: number
  usage_limit_per_user: number
  valid_from: string
  valid_until: string
  is_active: boolean
}
