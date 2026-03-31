'use client'

/**
 * Coupons Data Hook
 *
 * REF-006: Data fetching and state management extracted from client component
 * RES-001: Migrated to React Query for data fetching
 */

import { useState, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { staleTimes, gcTimes } from '@/lib/queries/utils'
import type {
  Coupon,
  CouponsPagination,
  CouponStatusFilter,
  CouponFormData,
} from '../types'
import { PAGINATION_DEFAULT, DEFAULT_FORM_DATA } from '../constants'

interface UseCouponsOptions {
  clinic: string
}

interface UseCouponsReturn {
  // Data
  coupons: Coupon[]
  pagination: CouponsPagination
  loading: boolean
  error: string | null

  // Filters
  search: string
  setSearch: (value: string) => void
  statusFilter: CouponStatusFilter
  setStatusFilter: (value: CouponStatusFilter) => void
  setPage: (page: number) => void

  // Modal state
  showModal: boolean
  editingCoupon: Coupon | null
  formData: CouponFormData
  saving: boolean

  // Modal actions
  openCreateModal: () => void
  openEditModal: (coupon: Coupon) => void
  closeModal: () => void
  setFormData: React.Dispatch<React.SetStateAction<CouponFormData>>
  handleSubmit: (e: React.FormEvent) => Promise<void>

  // Delete
  showDeleteConfirm: string | null
  setShowDeleteConfirm: (id: string | null) => void
  handleDelete: (id: string) => Promise<void>

  // Refetch
  refetch: () => Promise<void>
}

export function useCoupons({ clinic }: UseCouponsOptions): UseCouponsReturn {
  const queryClient = useQueryClient()

  // Filter state
  const [search, setSearchState] = useState('')
  const [statusFilter, setStatusFilterState] = useState<CouponStatusFilter>('all')
  const [page, setPageState] = useState(1)
  const [limit] = useState(PAGINATION_DEFAULT.limit)

  // Modal state
  const [showModal, setShowModal] = useState(false)
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null)
  const [formData, setFormData] = useState<CouponFormData>(DEFAULT_FORM_DATA)
  const [submitError, setSubmitError] = useState<string | null>(null)

  // Delete state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null)

  // React Query: Fetch coupons
  const {
    data: couponsData,
    isLoading: loading,
    error: queryError,
    refetch,
  } = useQuery({
    queryKey: ['coupons', clinic, page, limit, statusFilter, search],
    queryFn: async (): Promise<{ coupons: Coupon[]; pagination: CouponsPagination }> => {
      const params = new URLSearchParams({
        clinic,
        page: String(page),
        limit: String(limit),
        status: statusFilter,
      })

      if (search) {
        params.append('search', search)
      }

      const response = await fetch(`/api/dashboard/coupons?${params}`)

      if (!response.ok) {
        throw new Error('Error al cargar cupones')
      }

      const data = await response.json()
      return {
        coupons: data.coupons || [],
        pagination: data.pagination || PAGINATION_DEFAULT,
      }
    },
    staleTime: staleTimes.SHORT,
    gcTime: gcTimes.SHORT,
  })

  // Mutation: Save coupon (create/update)
  const saveMutation = useMutation({
    mutationFn: async (params: { formData: CouponFormData; editingId: string | null }) => {
      const payload = {
        ...params.formData,
        min_purchase_amount: params.formData.min_purchase_amount || null,
        max_discount_amount: params.formData.max_discount_amount || null,
        usage_limit: params.formData.usage_limit || null,
        valid_until: params.formData.valid_until || null,
      }

      const url = params.editingId
        ? `/api/dashboard/coupons/${params.editingId}`
        : '/api/dashboard/coupons'

      const response = await fetch(url, {
        method: params.editingId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error?.details?.message || 'Error al guardar cupón')
      }

      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coupons', clinic] })
      setShowModal(false)
      setEditingCoupon(null)
      setSubmitError(null)
    },
    onError: (err) => {
      setSubmitError(err instanceof Error ? err.message : 'Error al guardar')
    },
  })

  // Mutation: Delete coupon
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/dashboard/coupons/${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Error al eliminar cupón')
      }

      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coupons', clinic] })
      setShowDeleteConfirm(null)
    },
    onError: () => {
      setSubmitError('Error al eliminar el cupón')
    },
  })

  const coupons = couponsData?.coupons || []
  const pagination = couponsData?.pagination || PAGINATION_DEFAULT
  const error = queryError?.message || submitError

  const setPage = (newPage: number): void => {
    setPageState(newPage)
  }

  const setSearch = (value: string): void => {
    setSearchState(value)
    setPageState(1)
  }

  const setStatusFilter = (value: CouponStatusFilter): void => {
    setStatusFilterState(value)
    setPageState(1)
  }

  const openCreateModal = useCallback((): void => {
    setEditingCoupon(null)
    setFormData({
      ...DEFAULT_FORM_DATA,
      valid_from: new Date().toISOString().split('T')[0],
    })
    setSubmitError(null)
    setShowModal(true)
  }, [])

  const openEditModal = useCallback((coupon: Coupon): void => {
    setEditingCoupon(coupon)
    setFormData({
      code: coupon.code,
      name: coupon.name || '',
      description: coupon.description || '',
      discount_type: coupon.discount_type,
      discount_value: coupon.discount_value,
      min_purchase_amount: coupon.min_purchase_amount || 0,
      max_discount_amount: coupon.max_discount_amount || 0,
      usage_limit: coupon.usage_limit || 0,
      usage_limit_per_user: coupon.usage_limit_per_user || 1,
      valid_from: coupon.valid_from.split('T')[0],
      valid_until: coupon.valid_until ? coupon.valid_until.split('T')[0] : '',
      is_active: coupon.is_active,
    })
    setSubmitError(null)
    setShowModal(true)
  }, [])

  const closeModal = useCallback((): void => {
    setShowModal(false)
    setEditingCoupon(null)
    setSubmitError(null)
  }, [])

  const handleSubmit = useCallback(async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()
    await saveMutation.mutateAsync({
      formData,
      editingId: editingCoupon?.id || null,
    })
  }, [formData, editingCoupon, saveMutation])

  const handleDelete = useCallback(async (id: string): Promise<void> => {
    await deleteMutation.mutateAsync(id)
  }, [deleteMutation])

  return {
    // Data
    coupons,
    pagination,
    loading,
    error,

    // Filters
    search,
    setSearch,
    statusFilter,
    setStatusFilter,
    setPage,

    // Modal state
    showModal,
    editingCoupon,
    formData,
    saving: saveMutation.isPending,

    // Modal actions
    openCreateModal,
    openEditModal,
    closeModal,
    setFormData,
    handleSubmit,

    // Delete
    showDeleteConfirm,
    setShowDeleteConfirm,
    handleDelete,

    // Refetch
    refetch: async () => { await refetch() },
  }
}
