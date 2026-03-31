'use client'

/**
 * Campaigns Dashboard Client Component
 *
 * REF-006: Refactored from 959 lines to ~100 lines
 * Original responsibilities extracted to:
 * - hooks/use-campaigns.ts - Data fetching and state management
 * - components/CampaignStatusBadge.tsx - Status badge display
 * - components/CampaignsFilters.tsx - Filter and view mode controls
 * - components/CampaignCard.tsx - Individual campaign card
 * - components/CampaignsGrid.tsx - Grid view with empty state
 * - components/CampaignsCalendar.tsx - Calendar view
 * - components/CampaignFormModal.tsx - Create/edit modal
 * - components/DeleteConfirmModal.tsx - Delete confirmation
 * - types.ts - Type definitions
 * - constants.ts - Configuration constants
 * - utils.ts - Formatting utilities
 */

import { Megaphone, Plus, AlertCircle } from 'lucide-react'
import { useCampaigns } from './hooks/use-campaigns'
import {
  CampaignsFilters,
  CampaignsGrid,
  CampaignsCalendar,
  CampaignFormModal,
  DeleteConfirmModal,
} from './components'

interface CampaignsClientProps {
  clinic: string
}

export default function CampaignsClient({ clinic }: CampaignsClientProps): React.ReactElement {
  const {
    campaigns,
    loading,
    error,
    statusFilter,
    setStatusFilter,
    typeFilter,
    setTypeFilter,
    viewMode,
    setViewMode,
    currentMonth,
    navigateMonth,
    showModal,
    editingCampaign,
    formData,
    saving,
    openCreateModal,
    openEditModal,
    closeModal,
    setFormData,
    handleSubmit,
    showDeleteConfirm,
    setShowDeleteConfirm,
    handleDelete,
  } = useCampaigns({ clinic })

  const hasFilters = statusFilter !== 'all' || typeFilter !== 'all'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-[var(--text-primary)]">
            <Megaphone className="h-7 w-7 text-[var(--primary)]" />
            Campañas Promocionales
          </h1>
          <p className="mt-1 text-[var(--text-secondary)]">
            Gestiona ofertas, descuentos y promociones de tu tienda
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="inline-flex items-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-2.5 text-sm font-semibold text-white shadow-md transition-all hover:opacity-90"
        >
          <Plus className="h-4 w-4" />
          Nueva Campaña
        </button>
      </div>

      {/* Filters & View Toggle */}
      <CampaignsFilters
        statusFilter={statusFilter}
        onStatusChange={setStatusFilter}
        typeFilter={typeFilter}
        onTypeChange={setTypeFilter}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
      />

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-700">
          <AlertCircle className="h-5 w-5" />
          {error}
        </div>
      )}

      {/* Content */}
      {viewMode === 'calendar' ? (
        <CampaignsCalendar
          campaigns={campaigns}
          currentMonth={currentMonth}
          onNavigateMonth={navigateMonth}
          onEditCampaign={openEditModal}
        />
      ) : (
        <CampaignsGrid
          campaigns={campaigns}
          loading={loading}
          hasFilters={hasFilters}
          onEdit={openEditModal}
          onDelete={setShowDeleteConfirm}
          onCreateNew={openCreateModal}
        />
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <CampaignFormModal
          editingCampaign={editingCampaign}
          formData={formData}
          saving={saving}
          onClose={closeModal}
          onSubmit={handleSubmit}
          onFormChange={setFormData}
        />
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <DeleteConfirmModal
          onClose={() => setShowDeleteConfirm(null)}
          onConfirm={() => handleDelete(showDeleteConfirm)}
        />
      )}
    </div>
  )
}
