'use client'

/**
 * Inventory Client Component
 *
 * REF-006: Refactored from 1421 lines to use decomposed components
 */

import { useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import {
  ImportWizard,
  MultiModeScanner,
  InventoryFilters,
  InventoryTable,
  ProductEditModal,
  AddProductModal,
  DeleteConfirmModal,
  type InventoryProduct,
  type ScannerMode,
} from '@/components/dashboard/inventory'
import { StockHistoryModal } from '@/components/dashboard/inventory/stock-history-modal'

// Local decomposed components
import {
  InventoryHeader,
  SourceTabs,
  AlertsSection,
  StatsCards,
  QuickLinks,
  ImportSection,
  LegacyImportPreviewModal,
} from './components'

// Local hooks
import { useInventoryData, useInventoryOperations, useImportPreview } from './hooks'

// Local types and constants
import type { InventoryClientProps, Product } from './types'
import { ITEMS_PER_PAGE_OPTIONS } from './constants'

export default function InventoryClient({ googleSheetUrl }: InventoryClientProps) {
  const { clinic } = useParams() as { clinic: string }

  // Data hook - handles fetching and filter state
  const inventoryData = useInventoryData({ clinic })

  // Operations hook - handles CRUD operations
  const operations = useInventoryOperations({
    onRefetch: () => inventoryData.fetchProducts(inventoryData.searchQuery, inventoryData.pagination.page, inventoryData.pagination.limit),
    onRefetchStats: inventoryData.fetchStats,
    searchQuery: inventoryData.searchQuery,
    paginationPage: inventoryData.pagination.page,
    paginationLimit: inventoryData.pagination.limit,
  })

  // Import preview hook
  const importPreview = useImportPreview({
    onRefetch: () => inventoryData.fetchProducts(inventoryData.searchQuery, inventoryData.pagination.page, inventoryData.pagination.limit),
    onRefetchStats: inventoryData.fetchStats,
    setError: operations.setError,
    setResult: operations.setResult,
  })

  // UI State for modals
  const [showImportWizard, setShowImportWizard] = useState(false)
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false)
  const [historyProduct, setHistoryProduct] = useState<{ id: string; name: string } | null>(null)

  // Bulk Selection State
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set())

  // Bulk selection handlers
  const toggleSelectProduct = useCallback((productId: string) => {
    setSelectedProducts((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(productId)) {
        newSet.delete(productId)
      } else {
        newSet.add(productId)
      }
      return newSet
    })
  }, [])

  const clearSelection = useCallback(() => {
    setSelectedProducts(new Set())
  }, [])

  const handleSelectAll = useCallback((selected: boolean) => {
    if (selected) {
      setSelectedProducts(new Set(inventoryData.filteredAndSortedProducts.map((p) => p.id)))
    } else {
      setSelectedProducts(new Set())
    }
  }, [inventoryData.filteredAndSortedProducts])

  // Scanner action handler
  const handleScannerAction = useCallback((action: {
    mode: ScannerMode
    product: { id: string; sku: string | null; name: string; base_price: number; stock_quantity: number; barcode: string }
    quantity: number
    notes?: string
  }) => {
    if (action.mode === 'lookup') {
      const foundProduct = inventoryData.products.find((p) => p.id === action.product.id)
      if (foundProduct) {
        operations.setEditingProduct(foundProduct)
      } else {
        inventoryData.setSearchQuery(action.product.sku || action.product.name)
        operations.setResult({
          success: 1,
          errors: [],
          message: `Producto encontrado: ${action.product.name}`,
        })
      }
    } else if (action.mode === 'receive' || action.mode === 'count') {
      inventoryData.fetchProducts()
      operations.setResult({
        success: 1,
        errors: [],
        message:
          action.mode === 'receive'
            ? `Stock actualizado: +${action.quantity} unidades de ${action.product.name}`
            : `Conteo registrado: ${action.product.name} → ${action.quantity} unidades`,
      })
    }
  }, [inventoryData, operations])

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <InventoryHeader
        clinic={clinic}
        googleSheetUrl={googleSheetUrl}
        onAddProduct={() => operations.setShowAddModal(true)}
        onScan={() => setShowBarcodeScanner(true)}
        onImportWizard={() => setShowImportWizard(true)}
        onExport={operations.handleExport}
      />

      {/* Source Tabs */}
      <SourceTabs
        sourceFilter={inventoryData.sourceFilter}
        onSourceChange={inventoryData.setSourceFilter}
        sourceSummary={inventoryData.sourceSummary}
      />

      {/* Alerts */}
      <AlertsSection alerts={inventoryData.alerts} clinic={clinic} />

      {/* Stats Cards */}
      <StatsCards stats={inventoryData.stats} />

      {/* Quick Links */}
      <QuickLinks
        clinic={clinic}
        onScan={() => setShowBarcodeScanner(true)}
        onAddProduct={() => operations.setShowAddModal(true)}
      />

      {/* Import Section */}
      <ImportSection
        isUploading={importPreview.isUploading}
        isLoadingPreview={importPreview.isLoadingPreview}
        error={operations.error}
        result={operations.result}
        onFileUpload={importPreview.handleFileUpload}
        onClearError={() => operations.setError(null)}
        onClearResult={() => operations.setResult(null)}
      />

      {/* Products Table */}
      <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--bg-default)]">
        <InventoryFilters
          search={inventoryData.searchQuery}
          onSearchChange={inventoryData.setSearchQuery}
          categoryFilter={inventoryData.selectedCategory}
          onCategoryChange={inventoryData.setSelectedCategory}
          categories={inventoryData.categories}
          stockFilter={inventoryData.stockFilter}
          onStockChange={inventoryData.setStockFilter}
          onClearFilters={inventoryData.clearFilters}
          activeFilterCount={inventoryData.activeFilterCount}
          itemsPerPage={inventoryData.pagination.limit}
          onItemsPerPageChange={inventoryData.handleLimitChange}
          itemsPerPageOptions={ITEMS_PER_PAGE_OPTIONS}
          totalCount={inventoryData.pagination.total}
        />

        <InventoryTable
          products={inventoryData.filteredAndSortedProducts as InventoryProduct[]}
          isLoading={inventoryData.isLoadingProducts}
          sortField={inventoryData.sortField}
          sortDirection={inventoryData.sortDirection}
          onSort={inventoryData.toggleSort}
          onEdit={(p) => operations.setEditingProduct(p as Product)}
          onDelete={(productId) => operations.setDeleteConfirm(productId)}
          onViewHistory={setHistoryProduct}
          selectedProducts={selectedProducts}
          onSelectionChange={toggleSelectProduct}
          onSelectAll={handleSelectAll}
          onClearSelection={clearSelection}
          onBulkExport={() => operations.handleBulkExport(selectedProducts, inventoryData.products)}
          onAddProduct={() => operations.setShowAddModal(true)}
          sourceFilter={inventoryData.sourceFilter}
          pagination={inventoryData.pagination}
          onPageChange={inventoryData.handlePageChange}
        />
      </div>

      {/* Modals */}
      <ProductEditModal
        product={operations.editingProduct}
        onClose={() => operations.setEditingProduct(null)}
        onSave={operations.handleQuickEditSave}
        isSaving={operations.isSaving}
      />

      <AddProductModal
        isOpen={operations.showAddModal}
        onClose={() => operations.setShowAddModal(false)}
        onSubmit={operations.handleCreateProduct}
        categories={inventoryData.categories}
        isCreating={operations.isCreating}
      />

      <DeleteConfirmModal
        isOpen={!!operations.deleteConfirm}
        onClose={() => operations.setDeleteConfirm(null)}
        onConfirm={() => operations.deleteConfirm && operations.handleDeleteProduct(operations.deleteConfirm)}
        isDeleting={operations.isDeleting}
      />

      <ImportWizard
        isOpen={showImportWizard}
        onClose={() => setShowImportWizard(false)}
        onImportComplete={() => {
          inventoryData.fetchStats()
          inventoryData.fetchProducts(inventoryData.searchQuery, inventoryData.pagination.page, inventoryData.pagination.limit)
        }}
        clinic={clinic}
      />

      <MultiModeScanner
        isOpen={showBarcodeScanner}
        onClose={() => setShowBarcodeScanner(false)}
        clinic={clinic}
        onActionComplete={handleScannerAction}
      />

      <LegacyImportPreviewModal
        isOpen={importPreview.showPreview}
        previewData={importPreview.previewData}
        onConfirm={importPreview.handleConfirmImport}
        onCancel={importPreview.handleCancelImport}
      />

      {historyProduct && (
        <StockHistoryModal
          productId={historyProduct.id}
          productName={historyProduct.name}
          isOpen={!!historyProduct}
          onClose={() => setHistoryProduct(null)}
          clinic={clinic}
        />
      )}
    </div>
  )
}
