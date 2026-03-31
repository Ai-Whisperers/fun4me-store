'use client'

/**
 * Coupons Dashboard Client Component
 *
 * REF-006: Refactored from 910 lines to ~80 lines
 * Original responsibilities extracted to:
 * - hooks/use-coupons.ts - Data fetching and state management
 * - components/CouponStatusBadge.tsx - Status badge display
 * - components/CouponsFilters.tsx - Search and filter controls
 * - components/CouponsTable.tsx - Coupons listing table
 * - components/CouponFormModal.tsx - Create/edit modal
 * - components/DeleteConfirmModal.tsx - Delete confirmation
 * - types.ts - Type definitions
 * - constants.ts - Configuration constants
 * - utils.ts - Formatting utilities
 */

import { Ticket, Plus, AlertCircle } from 'lucide-react'
import { useCoupons } from './hooks/use-coupons'
import {
  CouponsFilters,
  CouponsTable,
  CouponFormModal,
  DeleteConfirmModal,
} from './components'

interface CouponsClientProps {
  clinic: string
}

export default function CouponsClient({ clinic }: CouponsClientProps): React.ReactElement {
  const {
    coupons,
    pagination,
    loading,
    error,
    search,
    setSearch,
    statusFilter,
    setStatusFilter,
    setPage,
    showModal,
    editingCoupon,
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
  } = useCoupons({ clinic })

  const hasFilters = search !== '' || statusFilter !== 'all'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-[var(--text-primary)]">
            <Ticket className="h-7 w-7 text-[var(--primary)]" />
            Cupones de Descuento
          </h1>
          <p className="mt-1 text-[var(--text-secondary)]">
            Gestiona los cupones promocionales de tu tienda
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="inline-flex items-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-2.5 text-sm font-semibold text-white shadow-md transition-all hover:opacity-90"
        >
          <Plus className="h-4 w-4" />
          Nuevo Cupón
        </button>
      </div>

      {/* Filters */}
      <CouponsFilters
        search={search}
        onSearchChange={setSearch}
        onSearchSubmit={() => setPage(1)}
        statusFilter={statusFilter}
        onStatusChange={setStatusFilter}
      />

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-700">
          <AlertCircle className="h-5 w-5" />
          {error}
        </div>
      )}

      {/* Coupons Table */}
      <CouponsTable
        coupons={coupons}
        loading={loading}
        hasFilters={hasFilters}
        pagination={pagination}
        onEdit={openEditModal}
        onDelete={setShowDeleteConfirm}
        onPageChange={setPage}
        onCreateNew={openCreateModal}
      />

      {/* Create/Edit Modal */}
      {showModal && (
        <CouponFormModal
          editingCoupon={editingCoupon}
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
