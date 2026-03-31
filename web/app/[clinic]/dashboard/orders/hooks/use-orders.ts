'use client'

/**
 * Orders Data Hook
 *
 * REF-006: Extracted data fetching logic from client component
 * RES-001: Migrated to React Query for data fetching
 */

import { useState, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { staleTimes, gcTimes } from '@/lib/queries/utils'
import type {
  Order,
  OrderItem,
  OrderSummary,
  OrdersPagination,
  OrderStatus,
} from '../types'
import { DEFAULT_PAGINATION, DEFAULT_SUMMARY, STATUS_WORKFLOW } from '../constants'

interface UseOrdersOptions {
  clinic: string
  initialFilters?: {
    search?: string
    status?: string
    paymentStatus?: string
  }
}

interface UseOrdersReturn {
  // Data
  orders: Order[]
  summary: OrderSummary
  pagination: OrdersPagination
  // State
  loading: boolean
  error: string | null
  // Filters
  search: string
  setSearch: (value: string) => void
  statusFilter: string
  setStatusFilter: (value: string) => void
  paymentFilter: string
  setPaymentFilter: (value: string) => void
  // Pagination
  setPage: (page: number) => void
  // Actions
  refetch: () => void
  // Detail
  selectedOrder: Order | null
  orderItems: OrderItem[]
  showDetail: boolean
  loadingDetail: boolean
  fetchOrderDetails: (orderId: string) => Promise<void>
  closeDetail: () => void
  // Status updates
  updating: boolean
  updateOrderStatus: (
    orderId: string,
    newStatus: OrderStatus,
    cancellationReason?: string
  ) => Promise<void>
  getNextStatus: (currentStatus: OrderStatus) => OrderStatus | null
}

export function useOrders({
  clinic,
  initialFilters = {},
}: UseOrdersOptions): UseOrdersReturn {
  const queryClient = useQueryClient()

  // Filter state
  const [search, setSearchState] = useState(initialFilters.search || '')
  const [statusFilter, setStatusFilterState] = useState(initialFilters.status || 'all')
  const [paymentFilter, setPaymentFilterState] = useState(initialFilters.paymentStatus || 'all')
  const [page, setPageState] = useState(1)
  const [limit] = useState(DEFAULT_PAGINATION.limit)

  // Detail state
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [orderItems, setOrderItems] = useState<OrderItem[]>([])
  const [showDetail, setShowDetail] = useState(false)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [detailError, setDetailError] = useState<string | null>(null)

  // React Query: Fetch orders list
  const {
    data: ordersData,
    isLoading: loading,
    error: queryError,
    refetch,
  } = useQuery({
    queryKey: ['orders', clinic, page, limit, statusFilter, paymentFilter, search],
    queryFn: async (): Promise<{ orders: Order[]; summary: OrderSummary; pagination: OrdersPagination }> => {
      const params = new URLSearchParams({
        clinic,
        page: String(page),
        limit: String(limit),
        status: statusFilter,
        payment_status: paymentFilter,
      })

      if (search) {
        params.append('search', search)
      }

      const response = await fetch(`/api/dashboard/orders?${params}`)

      if (!response.ok) {
        throw new Error('Error al cargar pedidos')
      }

      const data = await response.json()
      return {
        orders: data.orders || [],
        summary: data.summary || DEFAULT_SUMMARY,
        pagination: data.pagination || DEFAULT_PAGINATION,
      }
    },
    staleTime: staleTimes.SHORT,
    gcTime: gcTimes.SHORT,
  })

  // Mutation: Update order status
  const statusMutation = useMutation({
    mutationFn: async (params: { orderId: string; newStatus: OrderStatus; cancellationReason?: string }) => {
      const body: Record<string, unknown> = { status: params.newStatus }
      if (params.cancellationReason) {
        body.cancellation_reason = params.cancellationReason
      }

      const response = await fetch(`/api/dashboard/orders/${params.orderId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!response.ok) {
        throw new Error('Error al actualizar pedido')
      }

      return response.json()
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['orders', clinic] })
      // Update selected order if it's the one being updated
      if (selectedOrder?.id === variables.orderId) {
        setSelectedOrder(data.order)
      }
    },
    onError: () => {
      setDetailError('Error al actualizar el pedido')
    },
  })

  const orders = ordersData?.orders || []
  const summary = ordersData?.summary || DEFAULT_SUMMARY
  const pagination = ordersData?.pagination || DEFAULT_PAGINATION
  const error = queryError?.message || detailError

  const fetchOrderDetails = useCallback(async (orderId: string): Promise<void> => {
    setLoadingDetail(true)
    setDetailError(null)
    try {
      const response = await fetch(`/api/dashboard/orders/${orderId}`)

      if (!response.ok) {
        throw new Error('Error al cargar detalles')
      }

      const data = await response.json()
      setSelectedOrder(data.order)
      setOrderItems(data.items || [])
      setShowDetail(true)
    } catch (err) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Error fetching order details:', err)
      }
      setDetailError('Error al cargar detalles del pedido')
    } finally {
      setLoadingDetail(false)
    }
  }, [])

  const updateOrderStatus = useCallback(async (
    orderId: string,
    newStatus: OrderStatus,
    cancellationReason?: string
  ): Promise<void> => {
    await statusMutation.mutateAsync({ orderId, newStatus, cancellationReason })
  }, [statusMutation])

  const getNextStatus = (currentStatus: OrderStatus): OrderStatus | null => {
    const currentIndex = STATUS_WORKFLOW.indexOf(currentStatus)
    if (currentIndex === -1 || currentIndex >= STATUS_WORKFLOW.length - 1) {
      return null
    }
    return STATUS_WORKFLOW[currentIndex + 1]
  }

  const setPage = (newPage: number): void => {
    setPageState(newPage)
  }

  const setSearch = (value: string): void => {
    setSearchState(value)
    setPageState(1)
  }

  const setStatusFilter = (value: string): void => {
    setStatusFilterState(value)
    setPageState(1)
  }

  const setPaymentFilter = (value: string): void => {
    setPaymentFilterState(value)
    setPageState(1)
  }

  const closeDetail = useCallback((): void => {
    setShowDetail(false)
    setSelectedOrder(null)
    setOrderItems([])
    setDetailError(null)
  }, [])

  return {
    orders,
    summary,
    pagination,
    loading,
    error,
    search,
    setSearch,
    statusFilter,
    setStatusFilter,
    paymentFilter,
    setPaymentFilter,
    setPage,
    refetch: () => { refetch() },
    selectedOrder,
    orderItems,
    showDetail,
    loadingDetail,
    fetchOrderDetails,
    closeDetail,
    updating: statusMutation.isPending,
    updateOrderStatus,
    getNextStatus,
  }
}
