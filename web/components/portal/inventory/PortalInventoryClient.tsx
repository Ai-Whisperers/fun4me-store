'use client'

/**
 * Portal Inventory Client Component
 *
 * Main orchestrator for the inventory management page.
 * Coordinates all sub-components and manages shared state.
 */

import { useState, useMemo } from 'react'
import { usePortalInventory } from './hooks/use-portal-inventory'
import { InventoryHeader } from './InventoryHeader'
import { StockAlertsPanel } from './StockAlertsPanel'
import { ImportSection } from './ImportSection'
import { StatsCards } from './StatsCards'
import { FilterBar } from './FilterBar'
import { ProductTable } from './ProductTable'
import { Pagination } from './Pagination'
import { ProductEditModal } from './ProductEditModal'
import type { Product, ImportResult, StockFilterValue } from './types'

interface PortalInventoryClientProps {
  clinic: string
  googleSheetUrl: string | null
}

export function PortalInventoryClient({
  clinic,
  googleSheetUrl,
}: PortalInventoryClientProps): React.ReactElement {
  // Import state
  const [isUploading, setIsUploading] = useState(false)
  const [importResult, setImportResult] = useState<ImportResult | null>(null)
  const [importError, setImportError] = useState<string | null>(null)

  // Edit modal state (modal manages its own editValues and isSaving internally)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)

  // Filter state
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [stockFilter, setStockFilter] = useState<StockFilterValue>('all')

  // Data hook
  const {
    products,
    categories,
    stats,
    alerts,
    pagination,
    isLoading,
    fetchProducts,
    fetchStats,
    setItemsPerPage,
  } = usePortalInventory({
    clinic,
    searchQuery,
    selectedCategory,
    stockFilter,
  })

  // Apply local stock filtering for low_stock and out_of_stock
  const filteredProducts = useMemo(() => {
    if (stockFilter === 'low_stock') {
      return products.filter(
        (p) =>
          (p.inventory?.stock_quantity ?? 0) > 0 &&
          (p.inventory?.stock_quantity ?? 0) <= (p.inventory?.min_stock_level || 5)
      )
    }
    if (stockFilter === 'out_of_stock') {
      return products.filter((p) => (p.inventory?.stock_quantity || 0) === 0)
    }
    return products
  }, [products, stockFilter])

  // Handlers
  const handleExport = async (type: 'template' | 'catalog') => {
    try {
      const res = await fetch(`/api/inventory/export?type=${type}`)
      if (!res.ok) throw new Error('Export failed')

      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `inventory_${type}.xlsx`
      document.body.appendChild(a)
      a.click()
      a.remove()
    } catch (e) {
      setImportError(e instanceof Error ? e.message : 'Error desconocido')
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsUploading(true)
    setImportError(null)
    setImportResult(null)

    const formData = new FormData()
    formData.append('file', file)

    try {
      const res = await fetch('/api/inventory/import', {
        method: 'POST',
        body: formData,
      })

      if (!res.ok) {
        const text = await res.text()
        throw new Error(text || 'Import failed')
      }

      const data = await res.json()
      setImportResult(data)
      fetchStats()
    } catch (e) {
      setImportError(e instanceof Error ? e.message : 'Error desconocido')
    } finally {
      setIsUploading(false)
    }
  }

  const handlePageChange = (newPage: number) => {
    fetchProducts(searchQuery, newPage)
  }

  const handleItemsPerPageChange = (newLimit: number) => {
    setItemsPerPage(newLimit)
    fetchProducts(searchQuery, 1, newLimit)
  }

  const openEdit = (product: Product) => {
    setEditingProduct(product)
  }

  // Called by modal after successful save to refresh data
  const handleSaveComplete = () => {
    fetchProducts(searchQuery)
    fetchStats()
  }

  return (
    <div className="space-y-8 pb-20">
      <InventoryHeader clinic={clinic} googleSheetUrl={googleSheetUrl} onExport={handleExport} />

      {alerts && <StockAlertsPanel alerts={alerts} />}

      <ImportSection
        isUploading={isUploading}
        result={importResult}
        error={importError}
        onFileUpload={handleFileUpload}
      />

      <StatsCards stats={stats} />

      {/* Quick Edit Section */}
      <div className="space-y-6 rounded-3xl border border-gray-100 bg-white p-8 shadow-sm">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Edición Rápida</h2>
            <p className="text-sm text-gray-500">Busca y ajusta precios o stock directamente.</p>
          </div>
        </div>

        <FilterBar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          categories={categories}
          selectedCategory={selectedCategory}
          onCategoryChange={setSelectedCategory}
          stockFilter={stockFilter}
          onStockFilterChange={setStockFilter}
          itemsPerPage={pagination.limit}
          onItemsPerPageChange={handleItemsPerPageChange}
        />

        <ProductTable
          products={filteredProducts}
          isLoading={isLoading}
          onEditProduct={openEdit}
        />

        <Pagination pagination={pagination} onPageChange={handlePageChange} />
      </div>

      {/* Edit Modal */}
      {editingProduct && (
        <ProductEditModal
          product={editingProduct}
          onSave={handleSaveComplete}
          onClose={() => setEditingProduct(null)}
        />
      )}
    </div>
  )
}
