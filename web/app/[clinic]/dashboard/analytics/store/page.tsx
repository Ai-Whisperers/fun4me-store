'use client'

/**
 * Store Analytics Page
 *
 * Dashboard page for store analytics including sales, margins, and inventory turnover.
 *
 * Components extracted to: @/components/analytics/store
 * - StoreAnalyticsClient: Main orchestrator
 * - SalesTab: Sales summary, revenue trends, top products, coupons
 * - MarginsTab: Profit margins, category analysis, low-margin products
 * - InventoryTab: Stock levels, turnover ratios, reorder suggestions
 */

import { useParams } from 'next/navigation'
import { StoreAnalyticsClient } from '@/components/analytics/store'

export default function StoreAnalyticsPage(): React.ReactElement {
  const params = useParams()
  const clinic = params?.clinic as string

  return <StoreAnalyticsClient clinic={clinic} />
}
