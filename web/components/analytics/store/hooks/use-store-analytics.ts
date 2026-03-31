'use client'

/**
 * Store Analytics Data Fetching Hook
 *
 * Fetches sales, margins, and turnover analytics data.
 */

import { useState, useEffect, useCallback } from 'react'
import { logger } from '@/lib/logger'
import type {
  StoreAnalyticsData,
  MarginAnalyticsData,
  TurnoverAnalyticsData,
  PeriodDays,
} from '../types'

interface UseStoreAnalyticsResult {
  data: StoreAnalyticsData | null
  marginData: MarginAnalyticsData | null
  turnoverData: TurnoverAnalyticsData | null
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

interface UseStoreAnalyticsOptions {
  period: PeriodDays
  topProductsLimit?: number
}

export function useStoreAnalytics(
  options: UseStoreAnalyticsOptions
): UseStoreAnalyticsResult {
  const { period, topProductsLimit = 10 } = options

  const [data, setData] = useState<StoreAnalyticsData | null>(null)
  const [marginData, setMarginData] = useState<MarginAnalyticsData | null>(null)
  const [turnoverData, setTurnoverData] = useState<TurnoverAnalyticsData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchAnalytics = useCallback(async (): Promise<void> => {
    setIsLoading(true)
    setError(null)

    try {
      // Fetch all analytics in parallel
      const [storeResponse, marginsResponse, turnoverResponse] = await Promise.all([
        fetch(`/api/analytics/store?period=${period}&topProducts=${topProductsLimit}`),
        fetch(`/api/analytics/store/margins?period=${period}`),
        fetch(`/api/analytics/store/turnover?period=${period}`),
      ])

      if (storeResponse.ok) {
        const result = await storeResponse.json()
        setData(result)
      } else {
        const errorData = await storeResponse.json()
        setError(errorData.message || 'Error al cargar analíticas')
      }

      if (marginsResponse.ok) {
        const result = await marginsResponse.json()
        setMarginData(result)
      }

      if (turnoverResponse.ok) {
        const result = await turnoverResponse.json()
        setTurnoverData(result)
      }
    } catch (err) {
      logger.error('Error fetching store analytics', {
        error: err instanceof Error ? err.message : 'Unknown',
      })
      setError('Error al cargar datos de analíticas')
    } finally {
      setIsLoading(false)
    }
  }, [period, topProductsLimit])

  useEffect(() => {
    fetchAnalytics()
  }, [fetchAnalytics])

  return {
    data,
    marginData,
    turnoverData,
    isLoading,
    error,
    refetch: fetchAnalytics,
  }
}
