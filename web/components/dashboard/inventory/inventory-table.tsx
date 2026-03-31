'use client'

import { ArrowUp, ArrowDown, ArrowUpDown, Loader2, Package, Plus, Download, ChevronLeft, ChevronRight } from 'lucide-react'
import { InventoryTableRow } from './inventory-table-row'
import { InventoryMobileCard } from './inventory-mobile-card'
import type { InventoryProduct, SortField, SortDirection, PaginationInfo } from './types'

export interface InventoryTableProps {
  products: InventoryProduct[]
  isLoading: boolean
  sortField: SortField
  sortDirection: SortDirection
  onSort: (field: SortField) => void
  onEdit: (product: InventoryProduct) => void
  onDelete: (productId: string) => void
  onViewHistory: (product: { id: string; name: string }) => void
  onAddToPO?: (product: InventoryProduct) => void
  selectedProducts: Set<string>
  onSelectionChange: (productId: string) => void
  onSelectAll: (selected: boolean) => void
  onClearSelection: () => void
  onBulkExport: () => void
  onAddProduct: () => void
  sourceFilter: 'all' | 'own' | 'catalog'
  pagination: PaginationInfo
  onPageChange: (page: number) => void
}

function SortButton({
  field,
  label,
  currentField,
  direction,
  onSort,
}: {
  field: SortField
  label: string
  currentField: SortField
  direction: SortDirection
  onSort: (field: SortField) => void
}) {
  return (
    <button
      onClick={() => onSort(field)}
      className="inline-flex items-center gap-1 transition-colors hover:text-[var(--primary)]"
    >
      {label}
      {currentField === field ? (
        direction === 'asc' ? (
          <ArrowUp className="h-3 w-3" />
        ) : (
          <ArrowDown className="h-3 w-3" />
        )
      ) : (
        <ArrowUpDown className="h-3 w-3 opacity-40" />
      )}
    </button>
  )
}

export function InventoryTable({
  products,
  isLoading,
  sortField,
  sortDirection,
  onSort,
  onEdit,
  onDelete,
  onViewHistory,
  onAddToPO,
  selectedProducts,
  onSelectionChange,
  onSelectAll,
  onClearSelection,
  onBulkExport,
  onAddProduct,
  sourceFilter,
  pagination,
  onPageChange,
}: InventoryTableProps) {
  // Loading state
  if (isLoading) {
    return (
      <div className="py-16 text-center text-[var(--text-muted)]">
        <Loader2 className="mx-auto mb-3 h-8 w-8 animate-spin" />
        Cargando productos...
      </div>
    )
  }

  // Empty state
  if (products.length === 0) {
    return (
      <div className="py-16 text-center">
        <Package className="mx-auto mb-3 h-12 w-12 text-[var(--text-muted)]" />
        <p className="text-[var(--text-muted)]">No se encontraron productos</p>
        <button
          onClick={onAddProduct}
          className="mt-4 inline-flex items-center gap-2 rounded-lg bg-[var(--primary)] px-4 py-2 font-medium text-white hover:opacity-90"
        >
          <Plus className="h-4 w-4" /> Agregar Producto
        </button>
      </div>
    )
  }

  return (
    <>
      {/* Bulk Actions Toolbar */}
      {selectedProducts.size > 0 && (
        <div className="mb-4 flex items-center justify-between rounded-lg bg-[var(--primary)]/10 px-4 py-3">
          <div className="flex items-center gap-3">
            <span className="font-medium text-[var(--primary)]">
              {selectedProducts.size} producto{selectedProducts.size !== 1 ? 's' : ''} seleccionado
              {selectedProducts.size !== 1 ? 's' : ''}
            </span>
            <button
              onClick={onClearSelection}
              className="text-sm text-[var(--text-muted)] underline hover:text-[var(--text-secondary)]"
            >
              Deseleccionar
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onBulkExport}
              className="inline-flex items-center gap-2 rounded-lg bg-[var(--bg-default)] px-3 py-1.5 text-sm font-medium text-[var(--text-secondary)] shadow-sm hover:bg-[var(--bg-subtle)]"
            >
              <Download className="h-4 w-4" />
              Exportar CSV
            </button>
          </div>
        </div>
      )}

      {/* Desktop Table */}
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-[var(--border-light)] text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
              <th className="w-12 px-4 py-4">
                <input
                  type="checkbox"
                  className="rounded border-[var(--border)]"
                  checked={selectedProducts.size === products.length && products.length > 0}
                  onChange={(e) => onSelectAll(e.target.checked)}
                />
              </th>
              <th className="px-4 py-4">
                <SortButton field="name" label="Producto" currentField={sortField} direction={sortDirection} onSort={onSort} />
              </th>
              <th className="px-4 py-4">
                <SortButton field="sku" label="SKU" currentField={sortField} direction={sortDirection} onSort={onSort} />
              </th>
              <th className="px-4 py-4">
                <SortButton field="category" label="Categoría" currentField={sortField} direction={sortDirection} onSort={onSort} />
              </th>
              <th className="px-4 py-4 text-right">
                <SortButton field="base_price" label="Precio" currentField={sortField} direction={sortDirection} onSort={onSort} />
              </th>
              <th className="px-4 py-4 text-center">
                <SortButton field="stock" label="Stock" currentField={sortField} direction={sortDirection} onSort={onSort} />
              </th>
              <th className="px-4 py-4 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {products.map((product) => (
              <InventoryTableRow
                key={product.id}
                product={product}
                isSelected={selectedProducts.has(product.id)}
                onSelect={() => onSelectionChange(product.id)}
                onEdit={() => onEdit(product)}
                onDelete={() => onDelete(product.id)}
                onViewHistory={() => onViewHistory({ id: product.id, name: product.name })}
                onAddToPO={onAddToPO ? () => onAddToPO(product) : undefined}
                showSourceBadge={sourceFilter === 'all'}
              />
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Cards */}
      <div className="divide-y divide-gray-50 md:hidden">
        {products.map((product) => (
          <InventoryMobileCard
            key={product.id}
            product={product}
            onEdit={() => onEdit(product)}
            onDelete={() => onDelete(product.id)}
            onViewHistory={() => onViewHistory({ id: product.id, name: product.name })}
            showSourceBadge={sourceFilter === 'all'}
          />
        ))}
      </div>

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="flex items-center justify-between border-t border-[var(--border)] p-4">
          <div className="text-sm text-[var(--text-muted)]">
            Mostrando {(pagination.page - 1) * pagination.limit + 1} -{' '}
            {Math.min(pagination.page * pagination.limit, pagination.total)} de {pagination.total}
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => onPageChange(pagination.page - 1)}
              disabled={!pagination.hasPrev}
              className="rounded-lg p-2 text-[var(--text-secondary)] transition hover:bg-[var(--bg-muted)] disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            {Array.from({ length: Math.min(5, pagination.pages) }, (_, i) => {
              let pageNum: number
              if (pagination.pages <= 5) {
                pageNum = i + 1
              } else if (pagination.page <= 3) {
                pageNum = i + 1
              } else if (pagination.page >= pagination.pages - 2) {
                pageNum = pagination.pages - 4 + i
              } else {
                pageNum = pagination.page - 2 + i
              }
              return (
                <button
                  key={pageNum}
                  onClick={() => onPageChange(pageNum)}
                  className={`h-10 w-10 rounded-lg text-sm font-bold transition ${
                    pagination.page === pageNum
                      ? 'bg-[var(--primary)] text-white'
                      : 'text-[var(--text-secondary)] hover:bg-[var(--bg-muted)]'
                  }`}
                >
                  {pageNum}
                </button>
              )
            })}
            <button
              onClick={() => onPageChange(pagination.page + 1)}
              disabled={!pagination.hasNext}
              className="rounded-lg p-2 text-[var(--text-secondary)] transition hover:bg-[var(--bg-muted)] disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}
    </>
  )
}

export default InventoryTable
