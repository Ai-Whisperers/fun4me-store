'use client'

import { useState } from 'react'
import { X, Loader2, Plus } from 'lucide-react'

interface Category {
  id: string
  name: string
}

interface NewProductForm {
  name: string
  sku: string
  barcode: string
  category: string
  description: string
  base_price: number
  cost: number
  stock: number
  min_stock: number
}

const initialNewProduct: NewProductForm = {
  name: '',
  sku: '',
  barcode: '',
  category: '',
  description: '',
  base_price: 0,
  cost: 0,
  stock: 0,
  min_stock: 5,
}

interface AddProductModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (product: NewProductForm) => Promise<void>
  categories: Category[]
  isCreating: boolean
}

export function AddProductModal({
  isOpen,
  onClose,
  onSubmit,
  categories,
  isCreating,
}: AddProductModalProps) {
  const [newProduct, setNewProduct] = useState<NewProductForm>(initialNewProduct)

  if (!isOpen) return null

  const handleClose = () => {
    setNewProduct(initialNewProduct)
    onClose()
  }

  const handleSubmit = async () => {
    await onSubmit(newProduct)
    setNewProduct(initialNewProduct)
  }

  const isValid = newProduct.name && newProduct.base_price > 0

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="max-h-[90vh] w-full max-w-lg overflow-hidden overflow-y-auto rounded-2xl bg-[var(--bg-default)] shadow-2xl">
        <div className="sticky top-0 flex items-center justify-between border-b border-[var(--border)] bg-[var(--bg-default)] p-6">
          <div>
            <h3 className="text-lg font-bold text-[var(--text-primary)]">Nuevo Producto</h3>
            <p className="text-sm text-[var(--text-muted)]">Agregar producto al inventario</p>
          </div>
          <button onClick={handleClose} className="rounded-lg p-2 hover:bg-[var(--bg-muted)]">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="space-y-4 p-6">
          <div>
            <label className="mb-2 block text-xs font-bold uppercase text-[var(--text-muted)]">
              Nombre del Producto <span className="text-[var(--status-error)]">*</span>
            </label>
            <input
              type="text"
              value={newProduct.name}
              onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
              placeholder="Ej: Royal Canin Adult 15kg"
              className="focus:ring-[var(--primary)]/20 w-full rounded-xl border border-[var(--border)] bg-[var(--bg-subtle)] px-4 py-3 outline-none focus:ring-2"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-2 block text-xs font-bold uppercase text-[var(--text-muted)]">
                SKU (opcional)
              </label>
              <input
                type="text"
                value={newProduct.sku}
                onChange={(e) => setNewProduct({ ...newProduct, sku: e.target.value })}
                placeholder="Auto-generado"
                className="focus:ring-[var(--primary)]/20 w-full rounded-xl border border-[var(--border)] bg-[var(--bg-subtle)] px-4 py-3 outline-none focus:ring-2"
              />
            </div>
            <div>
              <label className="mb-2 block text-xs font-bold uppercase text-[var(--text-muted)]">
                Código de Barras
              </label>
              <input
                type="text"
                value={newProduct.barcode}
                onChange={(e) => setNewProduct({ ...newProduct, barcode: e.target.value })}
                placeholder="7891234567890"
                className="focus:ring-[var(--primary)]/20 w-full rounded-xl border border-[var(--border)] bg-[var(--bg-subtle)] px-4 py-3 outline-none focus:ring-2"
              />
            </div>
          </div>
          <div>
            <label className="mb-2 block text-xs font-bold uppercase text-[var(--text-muted)]">
              Categoría
            </label>
            <select
              value={newProduct.category}
              onChange={(e) => setNewProduct({ ...newProduct, category: e.target.value })}
              className="focus:ring-[var(--primary)]/20 w-full rounded-xl border border-[var(--border)] bg-[var(--bg-subtle)] px-4 py-3 outline-none focus:ring-2"
            >
              <option value="">Seleccionar categoría</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.name}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-2 block text-xs font-bold uppercase text-[var(--text-muted)]">
              Descripción
            </label>
            <textarea
              value={newProduct.description}
              onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })}
              placeholder="Descripción del producto..."
              rows={2}
              className="focus:ring-[var(--primary)]/20 w-full resize-none rounded-xl border border-[var(--border)] bg-[var(--bg-subtle)] px-4 py-3 outline-none focus:ring-2"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-2 block text-xs font-bold uppercase text-[var(--text-muted)]">
                Precio de Venta <span className="text-[var(--status-error)]">*</span>
              </label>
              <input
                type="number"
                value={newProduct.base_price || ''}
                onChange={(e) => setNewProduct({ ...newProduct, base_price: Number(e.target.value) })}
                placeholder="0"
                className="focus:ring-[var(--primary)]/20 w-full rounded-xl border border-[var(--border)] bg-[var(--bg-subtle)] px-4 py-3 font-bold outline-none focus:ring-2"
              />
            </div>
            <div>
              <label className="mb-2 block text-xs font-bold uppercase text-[var(--text-muted)]">
                Costo Unitario
              </label>
              <input
                type="number"
                value={newProduct.cost || ''}
                onChange={(e) => setNewProduct({ ...newProduct, cost: Number(e.target.value) })}
                placeholder="0"
                className="focus:ring-[var(--primary)]/20 w-full rounded-xl border border-[var(--border)] bg-[var(--bg-subtle)] px-4 py-3 outline-none focus:ring-2"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-2 block text-xs font-bold uppercase text-[var(--text-muted)]">
                Stock Inicial
              </label>
              <input
                type="number"
                value={newProduct.stock || ''}
                onChange={(e) => setNewProduct({ ...newProduct, stock: Number(e.target.value) })}
                placeholder="0"
                className="focus:ring-[var(--primary)]/20 w-full rounded-xl border border-[var(--border)] bg-[var(--bg-subtle)] px-4 py-3 outline-none focus:ring-2"
              />
            </div>
            <div>
              <label className="mb-2 block text-xs font-bold uppercase text-[var(--text-muted)]">
                Stock Mínimo
              </label>
              <input
                type="number"
                value={newProduct.min_stock || ''}
                onChange={(e) => setNewProduct({ ...newProduct, min_stock: Number(e.target.value) })}
                placeholder="5"
                className="focus:ring-[var(--primary)]/20 w-full rounded-xl border border-[var(--border)] bg-[var(--bg-subtle)] px-4 py-3 outline-none focus:ring-2"
              />
            </div>
          </div>
        </div>
        <div className="sticky bottom-0 flex gap-3 bg-[var(--bg-subtle)] p-6">
          <button
            onClick={handleClose}
            className="flex-1 py-3 font-bold text-[var(--text-muted)] transition hover:text-[var(--text-secondary)]"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={isCreating || !isValid}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[var(--primary)] py-3 font-bold text-white transition hover:opacity-90 disabled:opacity-50"
          >
            {isCreating ? <Loader2 className="h-5 w-5 animate-spin" /> : <Plus className="h-5 w-5" />}
            Crear Producto
          </button>
        </div>
      </div>
    </div>
  )
}

export type { NewProductForm }
export default AddProductModal
