'use client'

/**
 * Orders Dashboard Client Component
 *
 * REF-006: Refactored from 908 lines to ~90 lines
 * Original responsibilities extracted to:
 * - hooks/use-orders.ts - Data fetching and state management
 * - components/OrdersSummaryCards.tsx - Summary statistics display
 * - components/OrdersFilters.tsx - Search and filter controls
 * - components/OrdersTable.tsx - Orders listing table
 * - components/OrderDetailModal.tsx - Order detail view
 * - components/OrderStatusBadge.tsx - Status badge components
 * - types.ts - Type definitions
 * - constants.ts - Configuration constants
 * - utils.ts - Formatting utilities
 */

import Link from 'next/link'
import { ShoppingBag, FileText, AlertCircle } from 'lucide-react'
import { useOrders } from './hooks/use-orders'
import {
  OrdersSummaryCards,
  OrdersFilters,
  OrdersTable,
  OrderDetailModal,
} from './components'

interface OrdersClientProps {
  clinic: string
}

export default function OrdersClient({ clinic }: OrdersClientProps): React.ReactElement {
  const {
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
    selectedOrder,
    orderItems,
    showDetail,
    fetchOrderDetails,
    closeDetail,
    updating,
    updateOrderStatus,
    getNextStatus,
  } = useOrders({ clinic })

  const hasFilters = search !== '' || statusFilter !== 'all' || paymentFilter !== 'all'

  const handleCancelOrder = (orderId: string, reason: string): void => {
    updateOrderStatus(orderId, 'cancelled', reason)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-[var(--text-primary)]">
            <ShoppingBag className="h-7 w-7 text-[var(--primary)]" />
            Gestión de Pedidos
          </h1>
          <p className="mt-1 text-[var(--text-secondary)]">Administra los pedidos de la tienda</p>
        </div>
        <Link
          href={`/${clinic}/dashboard/orders/prescriptions`}
          className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-[var(--text-primary)] shadow-sm transition-all hover:bg-gray-50"
        >
          <FileText className="h-4 w-4" />
          Recetas Pendientes
        </Link>
      </div>

      {/* Summary Cards */}
      <OrdersSummaryCards
        summary={summary}
        statusFilter={statusFilter}
        onFilterChange={setStatusFilter}
      />

      {/* Filters */}
      <OrdersFilters
        search={search}
        onSearchChange={setSearch}
        onSearchSubmit={() => setPage(1)}
        statusFilter={statusFilter}
        onStatusChange={setStatusFilter}
        paymentFilter={paymentFilter}
        onPaymentChange={setPaymentFilter}
      />

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-700">
          <AlertCircle className="h-5 w-5" />
          {error}
        </div>
      )}

      {/* Orders Table */}
      <OrdersTable
        orders={orders}
        loading={loading}
        hasFilters={hasFilters}
        pagination={pagination}
        updating={updating}
        onViewDetails={fetchOrderDetails}
        onAdvanceStatus={updateOrderStatus}
        getNextStatus={getNextStatus}
        onPageChange={setPage}
      />

      {/* Order Detail Modal */}
      {showDetail && selectedOrder && (
        <OrderDetailModal
          order={selectedOrder}
          items={orderItems}
          updating={updating}
          onClose={closeDetail}
          onAdvanceStatus={updateOrderStatus}
          onCancel={handleCancelOrder}
          getNextStatus={getNextStatus}
        />
      )}
    </div>
  )
}
