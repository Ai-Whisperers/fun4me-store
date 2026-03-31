'use client'

/**
 * Service Subscriptions Data Hook
 *
 * REF-006: Data fetching and state management extracted from client component
 * RES-001: Migrated to React Query for data fetching
 */

import { useState, useCallback, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useToast } from '@/components/ui/Toast'
import { staleTimes, gcTimes } from '@/lib/queries/utils'
import type {
  Subscription,
  Plan,
  UpcomingService,
  ServiceOption,
  SubscriptionsPagination,
  TabId,
  PlanFormData,
} from '../types'
import { DEFAULT_PLAN_FORM, PAGINATION_DEFAULT } from '../constants'

interface UseServiceSubscriptionsReturn {
  // Tab state
  activeTab: TabId
  setActiveTab: (tab: TabId) => void

  // Data
  subscriptions: Subscription[]
  plans: Plan[]
  upcomingServices: UpcomingService[]
  services: ServiceOption[]
  loading: boolean
  error: string | null

  // Filters
  statusFilter: string
  setStatusFilter: (value: string) => void
  searchQuery: string
  setSearchQuery: (value: string) => void
  filteredSubscriptions: Subscription[]

  // Pagination
  pagination: SubscriptionsPagination
  setPagination: React.Dispatch<React.SetStateAction<SubscriptionsPagination>>

  // Subscription detail
  selectedSubscription: Subscription | null
  setSelectedSubscription: (sub: Subscription | null) => void

  // Plan modal
  showPlanModal: boolean
  setShowPlanModal: (show: boolean) => void
  editingPlan: Plan | null
  planForm: PlanFormData
  setPlanForm: React.Dispatch<React.SetStateAction<PlanFormData>>
  submitting: boolean
  handleEditPlan: (plan: Plan) => void
  handlePlanSubmit: () => Promise<void>
  resetPlanForm: () => void

  // Refetch
  refetch: () => Promise<void>
}

export function useServiceSubscriptions(): UseServiceSubscriptionsReturn {
  const { showToast } = useToast()
  const queryClient = useQueryClient()

  // Tab state
  const [activeTab, setActiveTabState] = useState<TabId>('subscriptions')

  // Filter state
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')

  // Pagination
  const [pagination, setPagination] = useState<SubscriptionsPagination>(PAGINATION_DEFAULT)

  // Subscription detail
  const [selectedSubscription, setSelectedSubscription] = useState<Subscription | null>(null)

  // Plan modal state
  const [showPlanModal, setShowPlanModal] = useState(false)
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null)
  const [planForm, setPlanForm] = useState<PlanFormData>(DEFAULT_PLAN_FORM)

  // React Query: Fetch subscriptions
  const {
    data: subscriptionsData,
    isLoading: loadingSubscriptions,
    error: subscriptionsError,
    refetch: refetchSubscriptions,
  } = useQuery({
    queryKey: ['subscriptions', 'list', statusFilter, pagination.limit, pagination.offset],
    queryFn: async (): Promise<{ subscriptions: Subscription[]; total: number }> => {
      const params = new URLSearchParams()
      params.set('limit', pagination.limit.toString())
      params.set('offset', pagination.offset.toString())
      if (statusFilter !== 'all') params.set('status', statusFilter)

      const res = await fetch(`/api/subscriptions?${params}`)
      if (!res.ok) throw new Error('Error al cargar suscripciones')
      const data = await res.json()
      return {
        subscriptions: data.subscriptions || [],
        total: data.pagination?.total || 0,
      }
    },
    enabled: activeTab === 'subscriptions',
    staleTime: staleTimes.SHORT,
    gcTime: gcTimes.SHORT,
  })

  // React Query: Fetch plans and services
  const {
    data: plansData,
    isLoading: loadingPlans,
    error: plansError,
    refetch: refetchPlans,
  } = useQuery({
    queryKey: ['subscriptions', 'plans', 'all'],
    queryFn: async (): Promise<{ plans: Plan[]; services: ServiceOption[] }> => {
      const [plansRes, servicesRes] = await Promise.all([
        fetch('/api/subscriptions/plans?active_only=false'),
        fetch('/api/services'),
      ])

      const plans = plansRes.ok ? await plansRes.json() : []
      const servicesData = servicesRes.ok ? await servicesRes.json() : { services: [] }

      return {
        plans: plans || [],
        services: servicesData.services || servicesData || [],
      }
    },
    enabled: activeTab === 'plans',
    staleTime: staleTimes.MEDIUM,
    gcTime: gcTimes.MEDIUM,
  })

  // React Query: Fetch upcoming services
  const {
    data: upcomingData,
    isLoading: loadingUpcoming,
    error: upcomingError,
    refetch: refetchUpcoming,
  } = useQuery({
    queryKey: ['subscriptions', 'instances', 'today'],
    queryFn: async (): Promise<UpcomingService[]> => {
      const res = await fetch('/api/subscriptions/instances?date=today&needs_transport=true')
      if (!res.ok) throw new Error('Error al cargar servicios')
      const data = await res.json()
      return data.instances || []
    },
    enabled: activeTab === 'today',
    staleTime: staleTimes.SHORT,
    gcTime: gcTimes.SHORT,
  })

  // Mutation: Save plan
  const planMutation = useMutation({
    mutationFn: async (params: { planForm: PlanFormData; editingPlan: Plan | null }) => {
      const method = params.editingPlan ? 'PUT' : 'POST'
      const url = params.editingPlan
        ? `/api/subscriptions/plans/${params.editingPlan.id}`
        : '/api/subscriptions/plans'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...params.planForm,
          price_per_period: parseFloat(params.planForm.price_per_period),
          services_per_period: parseInt(params.planForm.services_per_period),
          pickup_fee: parseFloat(params.planForm.pickup_fee),
          delivery_fee: parseFloat(params.planForm.delivery_fee),
        }),
      })

      if (!res.ok) throw new Error('Error al guardar plan')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscriptions', 'plans'] })
      setShowPlanModal(false)
      resetPlanForm()
    },
    onError: (err) => {
      showToast({ title: err instanceof Error ? err.message : 'Error', variant: 'error' })
    },
  })

  // Update pagination total when subscriptions data changes
  const subscriptions = subscriptionsData?.subscriptions || []
  const total = subscriptionsData?.total || 0

  // Update pagination total
  useMemo(() => {
    if (total !== pagination.total) {
      setPagination((prev) => ({ ...prev, total }))
    }
  }, [total, pagination.total])

  const plans = plansData?.plans || []
  const services = plansData?.services || []
  const upcomingServices = upcomingData || []

  // Determine loading state based on active tab
  const loading =
    (activeTab === 'subscriptions' && loadingSubscriptions) ||
    (activeTab === 'plans' && loadingPlans) ||
    (activeTab === 'today' && loadingUpcoming)

  // Determine error based on active tab
  const error =
    (activeTab === 'subscriptions' && subscriptionsError?.message) ||
    (activeTab === 'plans' && plansError?.message) ||
    (activeTab === 'today' && upcomingError?.message) ||
    null

  const filteredSubscriptions = useMemo(() => {
    return subscriptions.filter((sub) => {
      if (!searchQuery) return true
      const query = searchQuery.toLowerCase()
      return (
        sub.customer.full_name.toLowerCase().includes(query) ||
        sub.pet.name.toLowerCase().includes(query) ||
        sub.plan.name.toLowerCase().includes(query)
      )
    })
  }, [subscriptions, searchQuery])

  const resetPlanForm = useCallback((): void => {
    setPlanForm(DEFAULT_PLAN_FORM)
    setEditingPlan(null)
  }, [])

  const handleEditPlan = useCallback((plan: Plan): void => {
    setEditingPlan(plan)
    setPlanForm({
      name: plan.name,
      description: plan.description || '',
      service_id: plan.service.id,
      price_per_period: plan.price_per_period.toString(),
      billing_frequency: plan.billing_frequency,
      service_frequency: plan.service_frequency,
      services_per_period: plan.services_per_period.toString(),
      includes_pickup: plan.includes_pickup,
      includes_delivery: plan.includes_delivery,
      pickup_fee: plan.pickup_fee.toString(),
      delivery_fee: plan.delivery_fee.toString(),
      is_featured: plan.is_featured,
    })
    setShowPlanModal(true)
  }, [])

  const handlePlanSubmit = useCallback(async (): Promise<void> => {
    if (!planForm.name || !planForm.service_id || !planForm.price_per_period) return
    await planMutation.mutateAsync({ planForm, editingPlan })
  }, [planForm, editingPlan, planMutation])

  const handleTabChange = useCallback((tab: TabId): void => {
    setActiveTabState(tab)
    setPagination((prev) => ({ ...prev, offset: 0 }))
  }, [])

  const refetch = useCallback(async (): Promise<void> => {
    if (activeTab === 'subscriptions') {
      await refetchSubscriptions()
    } else if (activeTab === 'plans') {
      await refetchPlans()
    } else if (activeTab === 'today') {
      await refetchUpcoming()
    }
  }, [activeTab, refetchSubscriptions, refetchPlans, refetchUpcoming])

  return {
    // Tab state
    activeTab,
    setActiveTab: handleTabChange,

    // Data
    subscriptions,
    plans,
    upcomingServices,
    services,
    loading,
    error,

    // Filters
    statusFilter,
    setStatusFilter,
    searchQuery,
    setSearchQuery,
    filteredSubscriptions,

    // Pagination
    pagination,
    setPagination,

    // Subscription detail
    selectedSubscription,
    setSelectedSubscription,

    // Plan modal
    showPlanModal,
    setShowPlanModal,
    editingPlan,
    planForm,
    setPlanForm,
    submitting: planMutation.isPending,
    handleEditPlan,
    handlePlanSubmit,
    resetPlanForm,

    // Refetch
    refetch,
  }
}
