'use client'

/**
 * Campaigns Data Hook
 *
 * REF-006: Data fetching and state management extracted from client component
 * RES-001: Migrated to React Query for data fetching
 */

import { useState, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { staleTimes, gcTimes } from '@/lib/queries/utils'
import type {
  Campaign,
  CampaignsPagination,
  CampaignStatusFilter,
  CampaignFormData,
  ViewMode,
} from '../types'
import { PAGINATION_DEFAULT, getDefaultFormData } from '../constants'

interface UseCampaignsOptions {
  clinic: string
}

interface UseCampaignsReturn {
  // Data
  campaigns: Campaign[]
  pagination: CampaignsPagination
  loading: boolean
  error: string | null

  // Filters
  statusFilter: CampaignStatusFilter
  setStatusFilter: (value: CampaignStatusFilter) => void
  typeFilter: string
  setTypeFilter: (value: string) => void
  setPage: (page: number) => void

  // View
  viewMode: ViewMode
  setViewMode: (mode: ViewMode) => void
  currentMonth: Date
  navigateMonth: (direction: 'prev' | 'next') => void

  // Modal state
  showModal: boolean
  editingCampaign: Campaign | null
  formData: CampaignFormData
  saving: boolean

  // Modal actions
  openCreateModal: () => void
  openEditModal: (campaign: Campaign) => void
  closeModal: () => void
  setFormData: React.Dispatch<React.SetStateAction<CampaignFormData>>
  handleSubmit: (e: React.FormEvent) => Promise<void>

  // Delete
  showDeleteConfirm: string | null
  setShowDeleteConfirm: (id: string | null) => void
  handleDelete: (id: string) => Promise<void>

  // Refetch
  refetch: () => Promise<void>
}

export function useCampaigns({ clinic }: UseCampaignsOptions): UseCampaignsReturn {
  const queryClient = useQueryClient()

  // Filter state
  const [statusFilter, setStatusFilterState] = useState<CampaignStatusFilter>('all')
  const [typeFilter, setTypeFilterState] = useState('all')
  const [page, setPageState] = useState(1)
  const [limit] = useState(PAGINATION_DEFAULT.limit)

  // View state
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [currentMonth, setCurrentMonth] = useState(new Date())

  // Modal state
  const [showModal, setShowModal] = useState(false)
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null)
  const [formData, setFormData] = useState<CampaignFormData>(getDefaultFormData())
  const [submitError, setSubmitError] = useState<string | null>(null)

  // Delete state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null)

  // Build month string for calendar view
  const monthStr = viewMode === 'calendar'
    ? `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}`
    : undefined

  // React Query: Fetch campaigns
  const {
    data: campaignsData,
    isLoading: loading,
    error: queryError,
    refetch,
  } = useQuery({
    queryKey: ['campaigns', clinic, page, limit, statusFilter, typeFilter, viewMode, monthStr],
    queryFn: async (): Promise<{ campaigns: Campaign[]; pagination: CampaignsPagination }> => {
      const params = new URLSearchParams({
        clinic,
        page: String(page),
        limit: String(limit),
        status: statusFilter,
      })

      if (typeFilter !== 'all') {
        params.append('type', typeFilter)
      }

      if (monthStr) {
        params.append('month', monthStr)
      }

      const response = await fetch(`/api/dashboard/campaigns?${params}`)

      if (!response.ok) {
        throw new Error('Error al cargar campañas')
      }

      const data = await response.json()
      return {
        campaigns: data.campaigns || [],
        pagination: data.pagination || PAGINATION_DEFAULT,
      }
    },
    staleTime: staleTimes.SHORT,
    gcTime: gcTimes.SHORT,
  })

  // Mutation: Save campaign (create/update)
  const saveMutation = useMutation({
    mutationFn: async (params: { formData: CampaignFormData; editingId: string | null }) => {
      const url = params.editingId
        ? `/api/dashboard/campaigns/${params.editingId}`
        : '/api/dashboard/campaigns'

      const response = await fetch(url, {
        method: params.editingId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params.formData),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error?.details?.message || 'Error al guardar campaña')
      }

      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns', clinic] })
      setShowModal(false)
      setEditingCampaign(null)
      setSubmitError(null)
    },
    onError: (err) => {
      setSubmitError(err instanceof Error ? err.message : 'Error al guardar')
    },
  })

  // Mutation: Delete campaign
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/dashboard/campaigns/${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Error al eliminar campaña')
      }

      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns', clinic] })
      setShowDeleteConfirm(null)
    },
    onError: () => {
      setSubmitError('Error al eliminar la campaña')
    },
  })

  const campaigns = campaignsData?.campaigns || []
  const pagination = campaignsData?.pagination || PAGINATION_DEFAULT
  const error = queryError?.message || submitError

  const setPage = (newPage: number): void => {
    setPageState(newPage)
  }

  const setStatusFilter = (value: CampaignStatusFilter): void => {
    setStatusFilterState(value)
    setPageState(1)
  }

  const setTypeFilter = (value: string): void => {
    setTypeFilterState(value)
    setPageState(1)
  }

  const navigateMonth = (direction: 'prev' | 'next'): void => {
    setCurrentMonth((prev) => {
      const newDate = new Date(prev)
      if (direction === 'prev') {
        newDate.setMonth(newDate.getMonth() - 1)
      } else {
        newDate.setMonth(newDate.getMonth() + 1)
      }
      return newDate
    })
  }

  const openCreateModal = useCallback((): void => {
    setEditingCampaign(null)
    setFormData(getDefaultFormData())
    setSubmitError(null)
    setShowModal(true)
  }, [])

  const openEditModal = useCallback((campaign: Campaign): void => {
    setEditingCampaign(campaign)
    setFormData({
      name: campaign.name,
      description: campaign.description || '',
      campaign_type: campaign.campaign_type,
      discount_type: campaign.discount_type,
      discount_value: campaign.discount_value,
      start_date: campaign.start_date.split('T')[0],
      end_date: campaign.end_date.split('T')[0],
      is_active: campaign.is_active,
    })
    setSubmitError(null)
    setShowModal(true)
  }, [])

  const closeModal = useCallback((): void => {
    setShowModal(false)
    setEditingCampaign(null)
    setSubmitError(null)
  }, [])

  const handleSubmit = useCallback(async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()
    await saveMutation.mutateAsync({
      formData,
      editingId: editingCampaign?.id || null,
    })
  }, [formData, editingCampaign, saveMutation])

  const handleDelete = useCallback(async (id: string): Promise<void> => {
    await deleteMutation.mutateAsync(id)
  }, [deleteMutation])

  return {
    // Data
    campaigns,
    pagination,
    loading,
    error,

    // Filters
    statusFilter,
    setStatusFilter,
    typeFilter,
    setTypeFilter,
    setPage,

    // View
    viewMode,
    setViewMode,
    currentMonth,
    navigateMonth,

    // Modal state
    showModal,
    editingCampaign,
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
