'use client'

import { useState, useEffect } from 'react'
import { X, Loader2, Info } from 'lucide-react'

interface Product {
  id: string
  name: string
  sku: string
  base_price: number
  sale_price?: number | null
  inventory?: {
    stock_quantity: number
    weighted_average_cost?: number | null
  } | null
}

interface ProductEditModalProps {
  product: Product | null
  onClose: () => void
  onSave: (values: { price: number; stock: number }) => Promise<void>
  isSaving: boolean
}

export function ProductEditModal({ product, onClose, onSave, isSaving }: ProductEditModalProps) {
  const [editValues, setEditValues] = useState({ price: 0, stock: 0 })

  useEffect(() => {
    if (product) {
      setEditValues({
        price: product.sale_price || product.base_price,
        stock: product.inventory?.stock_quantity || 0,
      })
    }
  }, [product])

  if (!product) return null

  const handleSubmit = async () => {
    await onSave(editValues)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md overflow-hidden rounded-2xl bg-[var(--bg-default)] shadow-2xl">
        <div className="flex items-center justify-between border-b border-[var(--border)] p-6">
          <div>
            <h3 className="text-lg font-bold text-[var(--text-primary)]">Edición Rápida</h3>
            <p className="max-w-[280px] truncate text-sm text-[var(--text-muted)]">{product.name}</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 hover:bg-[var(--bg-muted)]">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="space-y-4 p-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-2 block text-xs font-bold uppercase text-[var(--text-muted)]">
                Precio de Venta
              </label>
              <input
                type="number"
                value={editValues.price}
                onChange={(e) => setEditValues({ ...editValues, price: Number(e.target.value) })}
                className="focus:ring-[var(--primary)]/20 w-full rounded-xl border border-[var(--border)] bg-[var(--bg-subtle)] px-4 py-3 text-lg font-bold outline-none focus:ring-2"
              />
            </div>
            <div>
              <label className="mb-2 block text-xs font-bold uppercase text-[var(--text-muted)]">
                Stock Actual
              </label>
              <input
                type="number"
                value={editValues.stock}
                onChange={(e) => setEditValues({ ...editValues, stock: Number(e.target.value) })}
                className="focus:ring-[var(--primary)]/20 w-full rounded-xl border border-[var(--border)] bg-[var(--bg-subtle)] px-4 py-3 text-lg font-bold outline-none focus:ring-2"
              />
            </div>
          </div>
          <div className="flex gap-2 rounded-xl bg-[var(--status-info-bg)] p-3">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-[var(--status-info)]" />
            <p className="text-xs text-[var(--status-info)]">
              Los cambios de stock generan un ajuste automático. Para compras, usa la importación Excel.
            </p>
          </div>
        </div>
        <div className="flex gap-3 bg-[var(--bg-subtle)] p-6">
          <button
            onClick={onClose}
            className="flex-1 py-3 font-bold text-[var(--text-muted)] transition hover:text-[var(--text-secondary)]"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSaving}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[var(--bg-dark)] py-3 font-bold text-white transition hover:bg-[var(--bg-inverse)] disabled:opacity-50"
          >
            {isSaving ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default ProductEditModal
