'use client'

/**
 * Inventory Operations Hook
 *
 * REF-006: Product operations extracted from client component
 */

import { useState, useCallback } from 'react'
import type { NewProductForm } from '@/components/dashboard/inventory'
import type { Product } from '../types'

interface ImportResult {
  success: number
  errors: string[]
  message?: string
}

interface UseInventoryOperationsProps {
  onRefetch: () => void
  onRefetchStats: () => void
  searchQuery: string
  paginationPage: number
  paginationLimit: number
}

interface UseInventoryOperationsReturn {
  // Edit operations
  editingProduct: Product | null
  setEditingProduct: (product: Product | null) => void
  isSaving: boolean
  handleQuickEditSave: (values: { price: number; stock: number }) => Promise<void>

  // Create operations
  showAddModal: boolean
  setShowAddModal: (show: boolean) => void
  isCreating: boolean
  handleCreateProduct: (product: NewProductForm) => Promise<void>

  // Delete operations
  deleteConfirm: string | null
  setDeleteConfirm: (productId: string | null) => void
  isDeleting: boolean
  handleDeleteProduct: (productId: string) => Promise<void>

  // Import/Export operations
  isUploading: boolean
  result: ImportResult | null
  setResult: (result: ImportResult | null) => void
  error: string | null
  setError: (error: string | null) => void
  handleExport: (type: 'template' | 'catalog') => Promise<void>

  // Bulk operations
  handleBulkExport: (selectedProducts: Set<string>, products: Product[]) => void
}

export function useInventoryOperations({
  onRefetch,
  onRefetchStats,
  searchQuery,
  paginationPage,
  paginationLimit,
}: UseInventoryOperationsProps): UseInventoryOperationsReturn {
  // Edit state
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  // Create state
  const [showAddModal, setShowAddModal] = useState(false)
  const [isCreating, setIsCreating] = useState(false)

  // Delete state
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Import state
  const [isUploading, setIsUploading] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleQuickEditSave = useCallback(
    async (values: { price: number; stock: number }) => {
      if (!editingProduct) return
      setIsSaving(true)
      try {
        const res = await fetch('/api/inventory/import', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            rows: [
              {
                operation: 'adjustment',
                sku: editingProduct.sku || editingProduct.id,
                price: values.price,
                quantity: values.stock - (editingProduct.inventory?.stock_quantity || 0),
              },
            ],
          }),
        })

        if (res.ok) {
          setEditingProduct(null)
          onRefetch()
          onRefetchStats()
        } else {
          const text = await res.text()
          setError(text || 'Error al guardar')
        }
      } catch (e) {
        if (process.env.NODE_ENV === 'development') {
          console.error('Error al guardar', e)
        }
        setError('Error de conexión')
      } finally {
        setIsSaving(false)
      }
    },
    [editingProduct, onRefetch, onRefetchStats]
  )

  const handleCreateProduct = useCallback(
    async (product: NewProductForm) => {
      if (!product.name || !product.base_price) {
        setError('Nombre y Precio son obligatorios')
        return
      }
      setIsCreating(true)
      try {
        const res = await fetch('/api/inventory/import', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            rows: [
              {
                operation: 'new product',
                sku: product.sku || undefined,
                barcode: product.barcode || undefined,
                name: product.name,
                category: product.category || undefined,
                description: product.description || undefined,
                price: product.base_price,
                quantity: product.stock,
                unit_cost: product.cost || undefined,
                min_stock: product.min_stock,
              },
            ],
          }),
        })

        if (res.ok) {
          setShowAddModal(false)
          onRefetch()
          onRefetchStats()
          setResult({ success: 1, errors: [], message: 'Producto creado exitosamente' })
        } else {
          const text = await res.text()
          setError(text || 'Error al crear producto')
        }
      } catch (e) {
        if (process.env.NODE_ENV === 'development') {
          console.error('Error al crear producto', e)
        }
        setError('Error de conexión')
      } finally {
        setIsCreating(false)
      }
    },
    [onRefetch, onRefetchStats]
  )

  const handleDeleteProduct = useCallback(
    async (productId: string) => {
      setIsDeleting(true)
      try {
        const res = await fetch(`/api/store/products/${productId}`, {
          method: 'DELETE',
        })

        if (res.ok) {
          setDeleteConfirm(null)
          onRefetch()
          onRefetchStats()
        } else {
          const data = await res.json()
          setError(data.error || 'Error al eliminar producto')
        }
      } catch (e) {
        if (process.env.NODE_ENV === 'development') {
          console.error('Error al eliminar', e)
        }
        setError('Error de conexión')
      } finally {
        setIsDeleting(false)
      }
    },
    [onRefetch, onRefetchStats]
  )

  const handleExport = useCallback(async (type: 'template' | 'catalog') => {
    try {
      const res = await fetch(`/api/inventory/export?type=${type}`)
      if (!res.ok) throw new Error('Error en la exportación')

      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `inventario_${type}.xlsx`
      document.body.appendChild(a)
      a.click()
      a.remove()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error desconocido')
    }
  }, [])

  const handleBulkExport = useCallback(
    (selectedProducts: Set<string>, products: Product[]) => {
      const selected = products.filter((p) => selectedProducts.has(p.id))
      const csvContent = [
        ['SKU', 'Nombre', 'Stock'].join(','),
        ...selected.map((p) =>
          [
            p.sku || '',
            `"${p.name.replace(/"/g, '""')}"`,
            p.inventory?.stock_quantity || 0,
          ].join(',')
        ),
      ].join('\n')

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `inventario-seleccionado-${new Date().toISOString().split('T')[0]}.csv`
      a.click()
      URL.revokeObjectURL(url)
    },
    []
  )

  return {
    editingProduct,
    setEditingProduct,
    isSaving,
    handleQuickEditSave,
    showAddModal,
    setShowAddModal,
    isCreating,
    handleCreateProduct,
    deleteConfirm,
    setDeleteConfirm,
    isDeleting,
    handleDeleteProduct,
    isUploading,
    result,
    setResult,
    error,
    setError,
    handleExport,
    handleBulkExport,
  }
}
