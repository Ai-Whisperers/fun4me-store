/**
 * Dashboard Query Hooks
 *
 * RES-001: React Query Migration - Phase 2
 *
 * Query hooks for dashboard data fetching.
 */

import { useQuery } from '@tanstack/react-query'
import { queryKeys } from './keys'
import { buildUrl, staleTimes, gcTimes, parseErrorResponse } from './utils'

// Types
export interface DashboardStats {
  totalPets: number
  totalClients: number
  todayAppointments: number
  pendingOrders: number
  lowStockItems: number
  unreadMessages: number
  revenueToday: number
  revenueThisMonth: number
}

export interface ActivityItem {
  id: string
  type: 'appointment' | 'order' | 'message' | 'pet' | 'invoice'
  title: string
  description: string
  timestamp: string
  metadata?: Record<string, unknown>
}

export interface RevenueData {
  period: string
  revenue: number
  appointments: number
  orders: number
  services: number
}

export interface TodayAppointment {
  id: string
  pet_id: string
  pet_name: string
  owner_name: string
  service_name: string
  start_time: string
  end_time: string
  status: string
  vet_name?: string
}

export interface PendingOrder {
  id: string
  customer_name: string
  total: number
  items_count: number
  created_at: string
  requires_prescription_review: boolean
}

// Query Hooks

/**
 * Fetch dashboard statistics
 */
export function useDashboardStats(clinic: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: queryKeys.dashboard.stats(clinic),
    queryFn: async (): Promise<DashboardStats> => {
      const response = await fetch(`/api/${clinic}/dashboard/stats`)
      if (!response.ok) {
        const error = await parseErrorResponse(response, 'dashboard/stats')
        throw new Error(error.error || 'Error al cargar estadísticas')
      }
      return response.json()
    },
    enabled: options?.enabled ?? true,
    staleTime: staleTimes.SHORT, // Dashboard stats change frequently
    gcTime: gcTimes.MEDIUM,
  })
}

/**
 * Fetch recent activity feed
 */
export function useDashboardActivity(
  clinic: string,
  limit = 10,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: queryKeys.dashboard.activity(clinic, limit),
    queryFn: async (): Promise<ActivityItem[]> => {
      const url = buildUrl(`/api/${clinic}/dashboard/activity`, { limit })
      const response = await fetch(url)
      if (!response.ok) {
        const error = await parseErrorResponse(response, 'dashboard/activity')
        throw new Error(error.error || 'Error al cargar actividad')
      }
      return response.json()
    },
    enabled: options?.enabled ?? true,
    staleTime: staleTimes.SHORT,
    gcTime: gcTimes.MEDIUM,
  })
}

/**
 * Fetch revenue data for a period
 */
export function useDashboardRevenue(
  clinic: string,
  period: 'today' | 'week' | 'month' | 'year' = 'month',
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: queryKeys.dashboard.revenue(clinic, period),
    queryFn: async (): Promise<RevenueData[]> => {
      const url = buildUrl(`/api/${clinic}/dashboard/revenue`, { period })
      const response = await fetch(url)
      if (!response.ok) {
        const error = await parseErrorResponse(response, 'dashboard/revenue')
        throw new Error(error.error || 'Error al cargar ingresos')
      }
      return response.json()
    },
    enabled: options?.enabled ?? true,
    staleTime: staleTimes.MEDIUM, // Revenue data doesn't change as frequently
    gcTime: gcTimes.MEDIUM,
  })
}

/**
 * Fetch today's appointments
 */
export function useTodayAppointments(clinic: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: queryKeys.dashboard.todayAppointments(clinic),
    queryFn: async (): Promise<TodayAppointment[]> => {
      const response = await fetch(`/api/${clinic}/appointments/today`)
      if (!response.ok) {
        const error = await parseErrorResponse(response, 'dashboard/appointments')
        throw new Error(error.error || 'Error al cargar citas')
      }
      return response.json()
    },
    enabled: options?.enabled ?? true,
    staleTime: staleTimes.SHORT, // Appointments status changes frequently
    gcTime: gcTimes.MEDIUM,
    refetchInterval: 1000 * 60 * 2, // Auto-refresh every 2 minutes
  })
}

/**
 * Fetch pending orders requiring attention
 */
export function usePendingOrders(clinic: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: queryKeys.dashboard.pendingOrders(clinic),
    queryFn: async (): Promise<PendingOrder[]> => {
      const url = buildUrl(`/api/${clinic}/store/orders`, {
        status: 'pending',
        limit: 10,
      })
      const response = await fetch(url)
      if (!response.ok) {
        const error = await parseErrorResponse(response, 'dashboard/orders')
        throw new Error(error.error || 'Error al cargar pedidos')
      }
      const data = await response.json()
      return data.orders || data
    },
    enabled: options?.enabled ?? true,
    staleTime: staleTimes.SHORT,
    gcTime: gcTimes.MEDIUM,
  })
}

/**
 * Combined dashboard data hook
 * Fetches all dashboard data in parallel
 */
export function useDashboardData(clinic: string, options?: { enabled?: boolean }) {
  const stats = useDashboardStats(clinic, options)
  const activity = useDashboardActivity(clinic, 10, options)
  const todayAppointments = useTodayAppointments(clinic, options)
  const pendingOrders = usePendingOrders(clinic, options)

  return {
    stats: stats.data,
    activity: activity.data,
    todayAppointments: todayAppointments.data,
    pendingOrders: pendingOrders.data,
    isLoading:
      stats.isLoading ||
      activity.isLoading ||
      todayAppointments.isLoading ||
      pendingOrders.isLoading,
    isError:
      stats.isError || activity.isError || todayAppointments.isError || pendingOrders.isError,
    errors: {
      stats: stats.error,
      activity: activity.error,
      todayAppointments: todayAppointments.error,
      pendingOrders: pendingOrders.error,
    },
    refetch: {
      stats: stats.refetch,
      activity: activity.refetch,
      todayAppointments: todayAppointments.refetch,
      pendingOrders: pendingOrders.refetch,
      all: () => {
        stats.refetch()
        activity.refetch()
        todayAppointments.refetch()
        pendingOrders.refetch()
      },
    },
  }
}
