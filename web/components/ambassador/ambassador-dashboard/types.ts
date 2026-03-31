/**
 * Ambassador Dashboard Types
 *
 * Type definitions for ambassador dashboard components.
 */

export interface Ambassador {
  id: string
  email: string
  full_name: string
  phone: string
  type: string
  university?: string
  status: string
  tier: string
  referral_code: string
  referrals_count: number
  conversions_count: number
  commission_rate: number
  total_earned: number
  total_paid: number
  pending_payout: number
  share_url: string
  share_message: string
}

export interface TierInfo {
  name: string
  commission: number
  color?: string
  benefits: string[]
}

export interface Stats {
  total_referrals: number
  pending_referrals: number
  converted_referrals: number
  total_earned: number
  pending_payout: number
  tier: string
  commission_rate: number
  next_tier: string | null
  referrals_to_next_tier: number
  tier_info: TierInfo
  next_tier_info: TierInfo | null
}

export interface Referral {
  id: string
  status: string
  referred_at: string
  trial_started_at: string | null
  converted_at: string | null
  subscription_amount: number | null
  commission_rate: number | null
  commission_amount: number | null
  payout_status: string
  tenant: { id: string; name: string; zone: string } | null
}
