/**
 * Order Edit Form Component
 *
 * Main orchestrator for editing procurement orders.
 * Manages form state and coordinates between sub-components.
 */

'use client'

import { useState, useEffect } from 'react'
import { X, Loader2, AlertCircle, Save } from 'lucide-react'
import { useToast } from '@/components/ui/Toast'
import { useOrderEditData } from './use-order-edit-data'
import { SupplierSelect } from './SupplierSelect'
import { ProductSearch } from './ProductSearch'
import { OrderItemsTable } from './OrderItemsTable'
import { DeletedItemsWarning } from './DeletedItemsWarning'
import { OrderEditFields } from './OrderEditFields'
import type { OrderEditFormProps, OrderItem, Product } from './types'

export function OrderEditForm({
  orderId,
  isOpen,
  onClose,
  onSuccess,
}: OrderEditFormProps): React.ReactElement | null {
  const { toast } = useToast()

  // Form state
  const [selectedSupplier, setSelectedSupplier] = useState<string>('')
  const [items, setItems] = useState<OrderItem[]>([])
  const [expectedDelivery, setExpectedDelivery] = useState('')
  const [notes, setNotes] = useState('')
  const [shippingAddress, setShippingAddress] = useState('')

  // Data hooks
  const {
    order,
    suppliers,
    searchResults,
    error,
    loading,
    loadingSuppliers,
    searching,
    productSearch,
    setProductSearch,
    clearSearch,
    updateMutation,
  } = useOrderEditData({ orderId, isOpen, onSuccess, onClose })

  // Populate form when order loads
  useEffect(() => {
    if (order && order.status === 'draft') {
      setSelectedSupplier(order.supplier_id)
      setExpectedDelivery(order.expected_delivery_date || '')
      setNotes(order.notes || '')
      setShippingAddress(order.shipping_address || '')
      setItems(
        order.purchase_order_items.map((item) => ({
          id: item.id,
          catalog_product_id: item.catalog_product_id,
          product_name: item.store_products?.name || 'Producto',
          product_sku: item.store_products?.sku || '-',
          quantity: item.quantity,
          unit_cost: item.unit_cost,
        }))
      )
    }
  }, [order])

  // Item management handlers
  const addItem = (product: Product) => {
    if (items.find((i) => i.catalog_product_id === product.id && !i.isDeleted)) {
      toast({
        title: 'Producto ya agregado',
        description: 'Este producto ya está en la orden',
      })
      return
    }

    setItems((prev) => [
      ...prev,
      {
        catalog_product_id: product.id,
        product_name: product.name,
        product_sku: product.sku,
        quantity: 1,
        unit_cost: 0,
        isNew: true,
      },
    ])
    clearSearch()
  }

  const updateItem = (index: number, field: 'quantity' | 'unit_cost', value: number) => {
    setItems((prev) => prev.map((item, i) => (i === index ? { ...item, [field]: value } : item)))
  }

  const removeItem = (index: number) => {
    setItems((prev) =>
      prev.map((item, i) => {
        if (i !== index) return item
        return { ...item, isDeleted: true }
      })
    )
  }

  const restoreItem = (index: number) => {
    setItems((prev) => prev.map((item, i) => (i === index ? { ...item, isDeleted: false } : item)))
  }

  const calculateTotal = (): number => {
    return items
      .filter((i) => !i.isDeleted)
      .reduce((sum, item) => sum + item.quantity * item.unit_cost, 0)
  }

  // Form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!order) return

    const activeItems = items.filter((i) => !i.isDeleted)

    if (!selectedSupplier) {
      toast({
        title: 'Error',
        description: 'Selecciona un proveedor',
        variant: 'destructive',
      })
      return
    }

    if (activeItems.length === 0) {
      toast({
        title: 'Error',
        description: 'La orden debe tener al menos un producto',
        variant: 'destructive',
      })
      return
    }

    const invalidItems = activeItems.filter((i) => i.quantity <= 0 || i.unit_cost <= 0)
    if (invalidItems.length > 0) {
      toast({
        title: 'Error',
        description: 'Todos los productos deben tener cantidad y costo válidos',
        variant: 'destructive',
      })
      return
    }

    updateMutation.mutate({
      orderId: order.id,
      supplier_id: selectedSupplier,
      items: activeItems.map((i) => ({
        catalog_product_id: i.catalog_product_id,
        quantity: i.quantity,
        unit_cost: i.unit_cost,
      })),
      expected_delivery_date: expectedDelivery || undefined,
      notes: notes.trim() || undefined,
      shipping_address: shippingAddress.trim() || undefined,
    })
  }

  if (!isOpen) return null

  const activeItems = items.filter((i) => !i.isDeleted)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 p-6">
          <div>
            <h2 className="text-lg font-bold text-[var(--text-primary)]">
              Editar Orden {order?.order_number || ''}
            </h2>
            <p className="text-sm text-gray-500">Modifica los detalles de la orden de compra</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 hover:bg-gray-100" aria-label="Cerrar">
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex min-h-[300px] items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-[var(--primary)]" />
          </div>
        ) : error ? (
          <div className="flex min-h-[200px] flex-col items-center justify-center p-6">
            <AlertCircle className="mb-4 h-12 w-12 text-[var(--status-error)]" />
            <p className="text-[var(--status-error)]">{error}</p>
            <button
              onClick={onClose}
              className="mt-4 rounded-lg border border-gray-200 px-4 py-2 font-medium text-gray-700 hover:bg-gray-50"
            >
              Cerrar
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6">
            <div className="space-y-6">
              <SupplierSelect
                suppliers={suppliers}
                selectedSupplier={selectedSupplier}
                onSupplierChange={setSelectedSupplier}
                loading={loadingSuppliers}
              />

              <ProductSearch
                searchValue={productSearch}
                onSearchChange={setProductSearch}
                searchResults={searchResults}
                searching={searching}
                onSelectProduct={addItem}
              />

              <OrderItemsTable
                items={items}
                onUpdateItem={updateItem}
                onRemoveItem={removeItem}
                total={calculateTotal()}
              />

              <DeletedItemsWarning items={items} onRestoreItem={restoreItem} />

              <OrderEditFields
                expectedDelivery={expectedDelivery}
                onExpectedDeliveryChange={setExpectedDelivery}
                shippingAddress={shippingAddress}
                onShippingAddressChange={setShippingAddress}
                notes={notes}
                onNotesChange={setNotes}
              />
            </div>

            {/* Actions */}
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-gray-200 px-4 py-2 font-medium text-gray-700 hover:bg-gray-50"
                disabled={updateMutation.isPending}
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={updateMutation.isPending || activeItems.length === 0}
                className="flex items-center gap-2 rounded-lg bg-[var(--primary)] px-4 py-2 font-medium text-white hover:opacity-90 disabled:opacity-50"
              >
                {updateMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                Guardar Cambios
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
