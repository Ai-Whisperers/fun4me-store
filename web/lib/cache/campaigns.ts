/**
 * Campaign Cache Utility
 *
 * PERF-004: Caches active campaigns to avoid repeated database queries
 * Uses Next.js unstable_cache with 5-minute TTL and tag-based invalidation
 */

import { unstable_cache, revalidateTag } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'

export interface CampaignDiscount {
  product_id: string
  discount_type: 'percentage' | 'fixed'
  discount_value: number
}

export interface CachedCampaign {
  id: string
  items: CampaignDiscount[]
}

/**
 * Fetch active campaigns from database
 * Internal function used by the cache
 */
async function fetchActiveCampaignsFromDB(tenantId: string): Promise<CachedCampaign[]> {
  const supabase = await createClient()

  const { data: campaigns, error } = await supabase
    .from('store_campaigns')
    .select(
      `
      id,
      store_campaign_items(product_id, discount_type, discount_value)
    `
    )
    .eq('tenant_id', tenantId)
    .eq('is_active', true)
    .is('deleted_at', null)
    .lte('start_date', new Date().toISOString())
    .gte('end_date', new Date().toISOString())

  if (error) {
    logger.error('[Cache] Error fetching campaigns', { error: error.message, tenantId })
    return []
  }

  return (campaigns || []).map((campaign) => ({
    id: campaign.id,
    items: (
      campaign.store_campaign_items as {
        product_id: string
        discount_type: 'percentage' | 'fixed'
        discount_value: number
      }[]
    ).map((item) => ({
      product_id: item.product_id,
      discount_type: item.discount_type,
      discount_value: item.discount_value,
    })),
  }))
}

/**
 * Get active campaigns with caching
 *
 * @param tenantId - The clinic/tenant ID
 * @returns Promise<CachedCampaign[]> - Active campaigns with their discount items
 *
 * Cache behavior:
 * - 5-minute TTL (revalidate: 300)
 * - Tagged with 'campaigns' and 'campaigns:{tenantId}' for targeted invalidation
 * - Stale-while-revalidate: serves stale content while fetching fresh data
 */
export async function getActiveCampaigns(tenantId: string): Promise<CachedCampaign[]> {
  // Create a cached version of the fetch function
  const getCachedCampaigns = unstable_cache(
    async () => fetchActiveCampaignsFromDB(tenantId),
    [`campaigns-${tenantId}`],
    {
      revalidate: 300, // 5 minutes
      tags: ['campaigns', `campaigns:${tenantId}`],
    }
  )

  return getCachedCampaigns()
}

/**
 * Build a discount map from cached campaigns
 * Convenient helper for calculating product prices
 *
 * @param tenantId - The clinic/tenant ID
 * @returns Map of product_id -> { type, value }
 */
export async function getCampaignDiscountMap(
  tenantId: string
): Promise<Map<string, { type: string; value: number }>> {
  const campaigns = await getActiveCampaigns(tenantId)
  const discountMap = new Map<string, { type: string; value: number }>()

  for (const campaign of campaigns) {
    for (const item of campaign.items) {
      discountMap.set(item.product_id, {
        type: item.discount_type,
        value: item.discount_value,
      })
    }
  }

  return discountMap
}

/**
 * Invalidate campaign cache for a specific tenant
 * Call this when campaigns are created, updated, or deleted
 *
 * @param tenantId - The clinic/tenant ID to invalidate
 */
export async function invalidateCampaignCache(tenantId: string): Promise<void> {
  revalidateTag(`campaigns:${tenantId}`)
}

/**
 * Invalidate all campaign caches
 * Use sparingly - invalidates cache for all tenants
 */
export async function invalidateAllCampaignCaches(): Promise<void> {
  revalidateTag('campaigns')
}

/**
 * Calculate discounted price for a product
 *
 * @param basePrice - Original product price
 * @param discount - Discount info from campaign
 * @returns Calculated discounted price
 */
export function calculateDiscountedPrice(
  basePrice: number,
  discount: { type: string; value: number } | undefined
): {
  currentPrice: number
  originalPrice: number | null
  hasDiscount: boolean
  discountPercentage: number | null
} {
  if (!discount) {
    return {
      currentPrice: basePrice,
      originalPrice: null,
      hasDiscount: false,
      discountPercentage: null,
    }
  }

  let currentPrice = basePrice
  let discountPercentage: number

  if (discount.type === 'percentage') {
    currentPrice = basePrice * (1 - discount.value / 100)
    discountPercentage = discount.value
  } else {
    currentPrice = Math.max(0, basePrice - discount.value)
    discountPercentage = Math.round((discount.value / basePrice) * 100)
  }

  return {
    currentPrice: Math.round(currentPrice),
    originalPrice: basePrice,
    hasDiscount: true,
    discountPercentage,
  }
}
