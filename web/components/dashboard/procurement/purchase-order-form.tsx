'use client'

import { useState, useEffect } from 'react'
import { X, Trash2, Loader2, Building2, Package, Search } from 'lucide-react'
import { useToast } from '@/components/ui/Toast'

interface Supplier {
  id: string
  name: string
}

interface Product {
  id: string
  sku: string
  name: string
}

interface OrderItem {
  catalog_product_id: string
  product_name: string
  product_sku: string
  quantity: number
  unit_cost: number
}

interface PurchaseOrderFormProps {
  onClose: () => void
  onSuccess: () => void
}

export function PurchaseOrderForm({ onClose, onSuccess }: PurchaseOrderFormProps): React.ReactElement {
  const { toast } = useToast()
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [selectedSupplier, setSelectedSupplier] = useState<string>('')
  const [items, setItems] = useState<OrderItem[]>([])
  const [expectedDelivery, setExpectedDelivery] = useState('')
  const [notes, setNotes] = useState('')
  const [shippingAddress, setShippingAddress] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [loadingSuppliers, setLoadingSuppliers] = useState(true)

  // Product search
  const [productSearch, setProductSearch] = useState('')
  const [searchResults, setSearchResults] = useState<Product[]>([])
  const [searching, setSearching] = useState(false)

  // Fetch suppliers
  useEffect(() => {
    const fetchSuppliers = async () => {
      try {
        const res = await fetch('/api/suppliers?status=verified')
        if (!res.ok) throw new Error('Error al cargar proveedores')
        const data = await res.json()
        setSuppliers(data.suppliers || [])
      } catch (error) {
        toast({
          title: 'Error',
          description: 'No se pudieron cargar los proveedores',
          variant: 'destructive',
        })
      } finally {
        setLoadingSuppliers(false)
      }
    }

    fetchSuppliers()
  }, [toast])

  // Search products
  useEffect(() => {
    if (!productSearch.trim() || productSearch.length < 2) {
      setSearchResults([])
      return
    }

    const searchProducts = async () => {
      setSearching(true)
      try {
        // In a real implementation, this would search the catalog_products table
        // For now, we'll simulate with a basic search
        const res = await fetch(`/api/procurement/leads?limit=10`)
        if (res.ok) {
          const data = await res.json()
          const products = data.leads
            ?.map((lead: { catalog_products: Product | null }) => lead.catalog_products)
            .filter((p: Product | null): p is Product => p !== null)
            .filter((p: Product, i: number, arr: Product[]) =>
              arr.findIndex(x => x.id === p.id) === i &&
              (p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
               p.sku.toLowerCase().includes(productSearch.toLowerCase()))
            )
            .slice(0, 5) || []
          setSearchResults(products)
        }
      } catch (_error: unknown) {
        // Ignore search errors
      } finally {
        setSearching(false)
      }
    }

    const debounce = setTimeout(searchProducts, 300)
    return () => clearTimeout(debounce)
  }, [productSearch])

  const addItem = (product: Product) => {
    if (items.find(i => i.catalog_product_id === product.id)) {
      toast({
        title: 'Producto ya agregado',
        description: 'Este producto ya está en la orden',
      })
      return
    }

    setItems(prev => [
      ...prev,
      {
        catalog_product_id: product.id,
        product_name: product.name,
        product_sku: product.sku,
        quantity: 1,
        unit_cost: 0,
      },
    ])
    setProductSearch('')
    setSearchResults([])
  }

  const updateItem = (index: number, field: 'quantity' | 'unit_cost', value: number) => {
    setItems(prev => prev.map((item, i) =>
      i === index ? { ...item, [field]: value } : item
    ))
  }

  const removeItem = (index: number) => {
    setItems(prev => prev.filter((_, i) => i !== index))
  }

  const calculateTotal = (): number => {
    return items.reduce((sum, item) => sum + (item.quantity * item.unit_cost), 0)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedSupplier) {
      toast({
        title: 'Error',
        description: 'Selecciona un proveedor',
        variant: 'destructive',
      })
      return
    }

    if (items.length === 0) {
      toast({
        title: 'Error',
        description: 'Agrega al menos un producto',
        variant: 'destructive',
      })
      return
    }

    const invalidItems = items.filter(i => i.quantity <= 0 || i.unit_cost <= 0)
    if (invalidItems.length > 0) {
      toast({
        title: 'Error',
        description: 'Todos los productos deben tener cantidad y costo válidos',
        variant: 'destructive',
      })
      return
    }

    setSubmitting(true)

    try {
      const payload = {
        supplier_id: selectedSupplier,
        items: items.map(i => ({
          catalog_product_id: i.catalog_product_id,
          quantity: i.quantity,
          unit_cost: i.unit_cost,
        })),
        expected_delivery_date: expectedDelivery || undefined,
        notes: notes.trim() || undefined,
        shipping_address: shippingAddress.trim() || undefined,
      }

      const res = await fetch('/api/procurement/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Error al crear orden')
      }

      toast({
        title: 'Orden Creada',
        description: 'La orden de compra ha sido creada exitosamente',
      })

      onSuccess()
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Error al crear la orden',
        variant: 'destructive',
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 p-6">
          <div>
            <h2 className="text-lg font-bold text-[var(--text-primary)]">Nueva Orden de Compra</h2>
            <p className="text-sm text-gray-500">Crea una orden de compra para tu proveedor</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 hover:bg-gray-100" aria-label="Cerrar formulario">
            <X className="h-5 w-5 text-gray-500" aria-hidden="true" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <div className="space-y-6">
            {/* Supplier Selection */}
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Proveedor <span className="text-[var(--status-error)]">*</span>
              </label>
              {loadingSuppliers ? (
                <div className="flex items-center gap-2 text-gray-500">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Cargando proveedores...
                </div>
              ) : (
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <select
                    value={selectedSupplier}
                    onChange={(e) => setSelectedSupplier(e.target.value)}
                    className="w-full appearance-none rounded-lg border border-gray-200 py-2 pl-10 pr-4 focus:border-[var(--primary)] focus:outline-none"
                  >
                    <option value="">Seleccionar proveedor...</option>
                    {suppliers.map((supplier) => (
                      <option key={supplier.id} value={supplier.id}>
                        {supplier.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Product Search */}
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Agregar Productos
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  placeholder="Buscar por nombre o SKU..."
                  className="w-full rounded-lg border border-gray-200 py-2 pl-10 pr-4 focus:border-[var(--primary)] focus:outline-none"
                />
                {searching && (
                  <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-gray-400" />
                )}

                {/* Search Results */}
                {searchResults.length > 0 && (
                  <div className="absolute left-0 right-0 top-full z-10 mt-1 rounded-lg border border-gray-200 bg-white shadow-lg">
                    {searchResults.map((product) => (
                      <button
                        key={product.id}
                        type="button"
                        onClick={() => addItem(product)}
                        className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-gray-50"
                      >
                        <Package className="h-4 w-4 text-gray-400" />
                        <div>
                          <p className="font-medium text-[var(--text-primary)]">{product.name}</p>
                          <p className="text-xs text-gray-500">SKU: {product.sku}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Items Table */}
            {items.length > 0 && (
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Items de la Orden
                </label>
                <div className="overflow-x-auto rounded-lg border border-gray-200">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200 bg-gray-50">
                        <th className="px-4 py-2 text-left font-medium text-gray-600">Producto</th>
                        <th className="px-4 py-2 text-right font-medium text-gray-600">Cantidad</th>
                        <th className="px-4 py-2 text-right font-medium text-gray-600">Costo Unit.</th>
                        <th className="px-4 py-2 text-right font-medium text-gray-600">Subtotal</th>
                        <th className="px-4 py-2"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item, index) => (
                        <tr key={item.catalog_product_id} className="border-b border-gray-100">
                          <td className="px-4 py-2">
                            <p className="font-medium">{item.product_name}</p>
                            <p className="text-xs text-gray-500">SKU: {item.product_sku}</p>
                          </td>
                          <td className="px-4 py-2">
                            <input
                              type="number"
                              value={item.quantity}
                              onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 0)}
                              min="1"
                              className="w-20 rounded border border-gray-200 px-2 py-1 text-right focus:border-[var(--primary)] focus:outline-none"
                            />
                          </td>
                          <td className="px-4 py-2">
                            <input
                              type="number"
                              value={item.unit_cost}
                              onChange={(e) => updateItem(index, 'unit_cost', parseFloat(e.target.value) || 0)}
                              min="0"
                              step="100"
                              className="w-28 rounded border border-gray-200 px-2 py-1 text-right focus:border-[var(--primary)] focus:outline-none"
                            />
                          </td>
                          <td className="px-4 py-2 text-right font-medium">
                            ₲{(item.quantity * item.unit_cost).toLocaleString()}
                          </td>
                          <td className="px-4 py-2 text-right">
                            <button
                              type="button"
                              onClick={() => removeItem(index)}
                              className="rounded p-1 text-[var(--status-error)] hover:bg-[var(--status-error-bg)]"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-gray-50">
                        <td colSpan={3} className="px-4 py-3 text-right font-semibold">
                          Total:
                        </td>
                        <td className="px-4 py-3 text-right text-lg font-bold text-[var(--primary)]">
                          ₲{calculateTotal().toLocaleString()}
                        </td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )}

            {/* Additional Fields */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Fecha de Entrega Esperada
                </label>
                <input
                  type="date"
                  value={expectedDelivery}
                  onChange={(e) => setExpectedDelivery(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 focus:border-[var(--primary)] focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Dirección de Entrega
                </label>
                <input
                  type="text"
                  value={shippingAddress}
                  onChange={(e) => setShippingAddress(e.target.value)}
                  placeholder="Dirección de entrega..."
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 focus:border-[var(--primary)] focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Notas
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder="Notas adicionales para el proveedor..."
                className="w-full rounded-lg border border-gray-200 px-3 py-2 focus:border-[var(--primary)] focus:outline-none"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-gray-200 px-4 py-2 font-medium text-gray-700 hover:bg-gray-50"
              disabled={submitting}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting || items.length === 0}
              className="flex items-center gap-2 rounded-lg bg-[var(--primary)] px-4 py-2 font-medium text-white hover:opacity-90 disabled:opacity-50"
            >
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Crear Orden
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
