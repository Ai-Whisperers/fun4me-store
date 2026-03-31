'use client'

/**
 * Portal Service Subscriptions Client Component
 *
 * REF-006: Decomposed to ~120 lines from 962 lines
 * Pet owner interface for managing service subscriptions.
 */

import Link from 'next/link'
import { RefreshCw, ArrowLeft, AlertCircle } from 'lucide-react'
import { usePortalSubscriptions } from './hooks/use-portal-subscriptions'
import {
  MySubscriptionsList,
  AvailablePlans,
  SubscribeModal,
  SubscriptionDetailModal,
} from './components'

interface ServiceSubscriptionsClientProps {
  clinic: string
  clinicName: string
}

export function ServiceSubscriptionsClient({ clinic, clinicName }: ServiceSubscriptionsClientProps) {
  const {
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
  } = usePortalSubscriptions()

  const handleSelectPlan = (plan: typeof selectedPlan): void => {
    setSelectedPlan(plan)
    setShowSubscribeModal(true)
  }

  const handleCloseSubscribeModal = (): void => {
    setShowSubscribeModal(false)
    resetForm()
  }

  if (loading) {
    return (
      <div className="container mx-auto max-w-6xl px-4 py-8">
        <div className="flex items-center justify-center py-16">
          <RefreshCw className="h-8 w-8 animate-spin text-[var(--primary)]" />
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto max-w-6xl px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <Link
          href={`/${clinic}/portal/dashboard`}
          className="mb-4 inline-flex items-center gap-2 text-[var(--text-secondary)] transition hover:text-[var(--primary)]"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver al portal
        </Link>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--primary-light,#e0e7ff)]">
              <RefreshCw className="h-6 w-6 text-[var(--primary)]" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-[var(--text-primary)]">Suscripciones a Servicios</h1>
              <p className="text-[var(--text-muted)]">Servicios recurrentes con recogida a domicilio</p>
            </div>
          </div>
          <Link
            href={`/${clinic}/portal/subscriptions`}
            className="inline-flex items-center gap-2 rounded-xl border border-[var(--primary)] px-4 py-2 font-medium text-[var(--primary)] transition hover:bg-[var(--primary)]/10"
          >
            <RefreshCw className="h-4 w-4" />
            Ver Suscripciones a Productos
          </Link>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="mb-6 rounded-xl border border-[var(--status-error,#dc2626)] bg-[var(--status-error-bg,#fef2f2)] p-4 text-[var(--status-error,#dc2626)]">
          <AlertCircle className="mr-2 inline h-5 w-5" />
          {error}
        </div>
      )}

      {/* My Subscriptions */}
      <MySubscriptionsList
        subscriptions={subscriptions}
        onSelectSubscription={setSelectedSubscription}
      />

      {/* Available Plans */}
      <AvailablePlans plans={plans} onSelectPlan={handleSelectPlan} />

      {/* Subscribe Modal */}
      {showSubscribeModal && selectedPlan && (
        <SubscribeModal
          plan={selectedPlan}
          pets={pets}
          eligiblePets={getEligiblePets(selectedPlan)}
          form={subscribeForm}
          setForm={setSubscribeForm}
          submitting={submitting}
          onSubmit={handleSubscribe}
          onClose={handleCloseSubscribeModal}
        />
      )}

      {/* Subscription Detail Modal */}
      {selectedSubscription && (
        <SubscriptionDetailModal
          subscription={selectedSubscription}
          onClose={() => setSelectedSubscription(null)}
          onToggleStatus={() => handleToggleStatus(selectedSubscription)}
          onCancel={() => handleCancel(selectedSubscription.id)}
        />
      )}
    </div>
  )
}
