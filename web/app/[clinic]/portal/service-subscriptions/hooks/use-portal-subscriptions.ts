'use client'

/**
 * Portal Service Subscriptions Hook
 *
 * REF-006: Data fetching and state management extracted from client component
 */

import { useState, useEffect } from 'react'
import { useToast } from '@/components/ui/Toast'
import { logger } from '@/lib/logger'
import type { Subscription, Plan, Pet, SubscribeFormData } from '../types'
import { DEFAULT_SUBSCRIBE_FORM } from '../constants'

interface UsePortalSubscriptionsReturn {
  // Data
  subscriptions: Subscription[]
  plans: Plan[]
  pets: Pet[]
  loading: boolean
  error: string | null

  // Subscribe modal
  showSubscribeModal: boolean
  setShowSubscribeModal: (show: boolean) => void
  selectedPlan: Plan | null
  setSelectedPlan: (plan: Plan | null) => void
  subscribeForm: SubscribeFormData
  setSubscribeForm: React.Dispatch<React.SetStateAction<SubscribeFormData>>
  submitting: boolean
  handleSubscribe: () => Promise<void>
  resetForm: () => void
  getEligiblePets: (plan: Plan) => Pet[]

  // Detail modal
  selectedSubscription: Subscription | null
  setSelectedSubscription: (sub: Subscription | null) => void

  // Actions
  handleToggleStatus: (sub: Subscription) => Promise<void>
  handleCancel: (subId: string) => Promise<void>
}

export function usePortalSubscriptions(): UsePortalSubscriptionsReturn {
  const { showToast } = useToast()

  // Data state
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [plans, setPlans] = useState<Plan[]>([])
  const [pets, setPets] = useState<Pet[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Subscribe modal state
  const [showSubscribeModal, setShowSubscribeModal] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null)
  const [subscribeForm, setSubscribeForm] = useState<SubscribeFormData>(DEFAULT_SUBSCRIBE_FORM)
  const [submitting, setSubmitting] = useState(false)

  // Detail modal state
  const [selectedSubscription, setSelectedSubscription] = useState<Subscription | null>(null)

  // Fetch data
  useEffect(() => {
    async function fetchData(): Promise<void> {
      try {
        const [subsRes, plansRes, petsRes] = await Promise.all([
          fetch('/api/subscriptions'),
          fetch('/api/subscriptions/plans'),
          fetch('/api/pets'),
        ])

        if (subsRes.ok) {
          const subsData = await subsRes.json()
          setSubscriptions(subsData.subscriptions || [])
        }

        if (plansRes.ok) {
          const plansData = await plansRes.json()
          setPlans(plansData || [])
        }

        if (petsRes.ok) {
          const petsData = await petsRes.json()
          setPets(petsData.pets || petsData || [])
        }
      } catch (err) {
        setError('Error al cargar datos')
        logger.error('Error loading portal subscriptions data', {
          error: err instanceof Error ? err.message : 'Unknown error'
        })
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  const resetForm = (): void => {
    setSelectedPlan(null)
    setSubscribeForm(DEFAULT_SUBSCRIBE_FORM)
  }

  const getEligiblePets = (plan: Plan): Pet[] => {
    return pets.filter((pet) => {
      if (!plan.species_allowed.includes(pet.species)) return false
      if (plan.max_pet_weight_kg && pet.weight_kg && pet.weight_kg > plan.max_pet_weight_kg) return false
      return true
    })
  }

  const handleSubscribe = async (): Promise<void> => {
    if (!selectedPlan || !subscribeForm.selectedPetId) return

    setSubmitting(true)
    try {
      const res = await fetch('/api/subscriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan_id: selectedPlan.id,
          pet_id: subscribeForm.selectedPetId,
          preferred_day_of_week: subscribeForm.preferredDay,
          preferred_time_slot: subscribeForm.preferredTime,
          wants_pickup: subscribeForm.wantsPickup && selectedPlan.includes_pickup,
          wants_delivery: subscribeForm.wantsDelivery && selectedPlan.includes_delivery,
          pickup_address: subscribeForm.wantsPickup ? subscribeForm.pickupAddress : null,
          delivery_address: subscribeForm.wantsDelivery ? subscribeForm.deliveryAddress : null,
          special_instructions: subscribeForm.specialInstructions || null,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error?.message || 'Error al crear suscripción')
      }

      const newSub = await res.json()
      setSubscriptions((prev) => [newSub, ...prev])
      setShowSubscribeModal(false)
      resetForm()
    } catch (err) {
      showToast({ title: err instanceof Error ? err.message : 'Error al suscribirse', variant: 'error' })
    } finally {
      setSubmitting(false)
    }
  }

  const handleToggleStatus = async (sub: Subscription): Promise<void> => {
    const newStatus = sub.status === 'active' ? 'paused' : 'active'

    try {
      const res = await fetch(`/api/subscriptions/${sub.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })

      if (res.ok) {
        setSubscriptions((prev) =>
          prev.map((s) => (s.id === sub.id ? { ...s, status: newStatus } : s))
        )
      }
    } catch (err) {
      logger.error('Error toggling subscription status', {
        error: err instanceof Error ? err.message : 'Unknown error',
        subscriptionId: sub.id,
        newStatus
      })
    }
  }

  const handleCancel = async (subId: string): Promise<void> => {
    if (!confirm('¿Estás seguro de cancelar esta suscripción?')) return

    try {
      const res = await fetch(`/api/subscriptions/${subId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'Cancelado por el cliente' }),
      })

      if (res.ok) {
        setSubscriptions((prev) =>
          prev.map((s) => (s.id === subId ? { ...s, status: 'cancelled' } : s))
        )
        setSelectedSubscription(null)
      }
    } catch (err) {
      logger.error('Error canceling subscription', {
        error: err instanceof Error ? err.message : 'Unknown error',
        subscriptionId: subId
      })
    }
  }

  return {
    // Data
    subscriptions,
    plans,
    pets,
    loading,
    error,

    // Subscribe modal
    showSubscribeModal,
    setShowSubscribeModal,
    selectedPlan,
    setSelectedPlan,
    subscribeForm,
    setSubscribeForm,
    submitting,
    handleSubscribe,
    resetForm,
    getEligiblePets,

    // Detail modal
    selectedSubscription,
    setSelectedSubscription,

    // Actions
    handleToggleStatus,
    handleCancel,
  }
}
