'use client'

/**
 * Service Subscriptions Dashboard Client Component
 *
 * REF-006: Decomposed to ~120 lines from 1034 lines
 * Staff management interface for recurring service subscriptions.
 */

import { RefreshCw, Truck, Package, AlertCircle } from 'lucide-react'
import { useServiceSubscriptions } from './hooks/use-service-subscriptions'
import {
  SubscriptionsTab,
  TodayTab,
  PlansTab,
  SubscriptionDetailModal,
  PlanFormModal,
} from './components'
import { TABS } from './constants'

const ICON_MAP = {
  RefreshCw: RefreshCw,
  Truck: Truck,
  Package: Package,
} as const

interface ServiceSubscriptionsDashboardProps {
  clinic: string
}

export function ServiceSubscriptionsDashboard({ clinic: _clinic }: ServiceSubscriptionsDashboardProps) {
  const {
    // Tab state
    activeTab,
    setActiveTab,

    // Data
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
    submitting,
    handleEditPlan,
    handlePlanSubmit,
    resetPlanForm,
  } = useServiceSubscriptions()

  const handleCreatePlan = (): void => {
    resetPlanForm()
    setShowPlanModal(true)
  }

  const handleClosePlanModal = (): void => {
    setShowPlanModal(false)
    resetPlanForm()
  }

  return (
    <div className="container mx-auto max-w-7xl px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Suscripciones a Servicios</h1>
        <p className="text-[var(--text-muted)]">Gestiona suscripciones recurrentes y rutas de transporte</p>
      </div>

      {/* Tabs */}
      <div className="mb-6 flex gap-2 overflow-x-auto border-b border-[var(--border-light,#e5e7eb)]">
        {TABS.map((tab) => {
          const Icon = ICON_MAP[tab.iconName]
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 whitespace-nowrap border-b-2 px-4 py-3 text-sm font-medium transition ${
                activeTab === tab.id
                  ? 'border-[var(--primary)] text-[var(--primary)]'
                  : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
              }`}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* Error Alert */}
      {error && (
        <div className="mb-6 rounded-xl border border-[var(--status-error,#dc2626)] bg-[var(--status-error-bg,#fef2f2)] p-4 text-[var(--status-error,#dc2626)]">
          <AlertCircle className="mr-2 inline h-5 w-5" />
          {error}
        </div>
      )}

      {/* Tab Content */}
      {activeTab === 'subscriptions' && (
        <SubscriptionsTab
          loading={loading}
          subscriptions={filteredSubscriptions}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          pagination={pagination}
          setPagination={setPagination}
          setSelectedSubscription={setSelectedSubscription}
        />
      )}

      {activeTab === 'today' && <TodayTab loading={loading} upcomingServices={upcomingServices} />}

      {activeTab === 'plans' && (
        <PlansTab
          loading={loading}
          plans={plans}
          onEditPlan={handleEditPlan}
          onCreatePlan={handleCreatePlan}
        />
      )}

      {/* Modals */}
      {selectedSubscription && (
        <SubscriptionDetailModal
          subscription={selectedSubscription}
          onClose={() => setSelectedSubscription(null)}
        />
      )}

      {showPlanModal && (
        <PlanFormModal
          editingPlan={editingPlan}
          planForm={planForm}
          setPlanForm={setPlanForm}
          services={services}
          submitting={submitting}
          onSubmit={handlePlanSubmit}
          onClose={handleClosePlanModal}
        />
      )}
    </div>
  )
}
