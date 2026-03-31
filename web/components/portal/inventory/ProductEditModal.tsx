'use client'

/**
 * Product Edit Modal Component
 *
 * Modal for editing product price, stock, and inventory details.
 */

import { useState } from 'react'
import { Loader2, Info, X } from 'lucide-react'
import { DatePicker } from '@/components/ui/date-picker'
import { logger } from '@/lib/logger'
import type { Product, EditValues, EditTab } from './types'
import { EDIT_TABS } from './types'

interface ProductEditModalProps {
  product: Product
  onClose: () => void
  onSave: () => void
}

export function ProductEditModal({
  product,
  onClose,
  onSave,
}: ProductEditModalProps): React.ReactElement {
  const [activeTab, setActiveTab] = useState<EditTab>('basic')
  const [isSaving, setIsSaving] = useState(false)
  const [editValues, setEditValues] = useState<EditValues>({
    price: product.base_price ?? product.price ?? 0,
    stock: product.inventory?.stock_quantity ?? product.stock ?? 0,
    expiry_date: product.inventory?.expiry_date ?? '',
    batch_number: product.inventory?.batch_number ?? '',
    location: product.inventory?.location ?? '',
    bin_number: product.inventory?.bin_number ?? '',
    supplier_name: product.inventory?.supplier_name ?? '',
    min_stock_level: product.inventory?.min_stock_level ?? 5,
  })

  const handleSave = async (): Promise<void> => {
    setIsSaving(true)
    try {
      const res = await fetch('/api/inventory/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rows: [
            {
              operation: 'adjustment',
              sku: product.sku ?? product.id,
              name: product.name,
              price: editValues.price,
              quantity:
                editValues.stock -
                (product.inventory?.stock_quantity ?? product.stock ?? 0),
              expiry_date: editValues.expiry_date || undefined,
              batch_number: editValues.batch_number || undefined,
              supplier_name: editValues.supplier_name || undefined,
              min_stock_level: editValues.min_stock_level,
            },
          ],
        }),
      })

      if (res.ok) {
        onSave()
        onClose()
      }
    } catch (e) {
      logger.error('Failed to save product edit', {
        error: e instanceof Error ? e.message : 'Unknown',
      })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="animate-in fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm duration-200">
      <div className="animate-in zoom-in-95 w-full max-w-lg overflow-hidden rounded-3xl bg-white shadow-2xl duration-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-50 p-8">
          <div>
            <h3 className="text-xl font-bold text-gray-900">Actualizar Producto</h3>
            <p className="text-sm text-gray-500">
              {product.name} ({product.id})
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl p-2 transition hover:bg-gray-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="px-8 pt-6">
          <div className="flex border-b border-gray-100">
            {EDIT_TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`border-b-2 px-4 py-3 text-sm font-bold transition-all ${
                  activeTab === tab.id
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-400 hover:text-gray-600'
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-6 p-8">
          {/* Basic Tab */}
          {activeTab === 'basic' && (
            <BasicTabContent editValues={editValues} setEditValues={setEditValues} />
          )}

          {/* Inventory Tab */}
          {activeTab === 'inventory' && (
            <InventoryTabContent editValues={editValues} setEditValues={setEditValues} />
          )}

          {/* Location Tab */}
          {activeTab === 'location' && (
            <LocationTabContent editValues={editValues} setEditValues={setEditValues} />
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 bg-gray-50 p-8">
          <button
            onClick={onClose}
            className="flex-1 py-4 font-bold text-gray-500 transition hover:text-gray-700"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-gray-900 py-4 font-bold text-white shadow-xl transition-all hover:-translate-y-1 disabled:opacity-50"
          >
            {isSaving ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Guardar Cambios'}
          </button>
        </div>
      </div>
    </div>
  )
}

// =============================================================================
// Tab Content Components
// =============================================================================

interface TabContentProps {
  editValues: EditValues
  setEditValues: React.Dispatch<React.SetStateAction<EditValues>>
}

function BasicTabContent({ editValues, setEditValues }: TabContentProps): React.ReactElement {
  return (
    <>
      <div className="grid grid-cols-2 gap-6">
        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-wider text-gray-400">
            Precio de Venta
          </label>
          <input
            type="number"
            value={editValues.price}
            onChange={(e) => setEditValues({ ...editValues, price: Number(e.target.value) })}
            className="w-full rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3 text-lg font-bold outline-none focus:ring-2 focus:ring-blue-500/20"
            min="0"
            step="0.01"
          />
        </div>
        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-wider text-gray-400">
            Stock Actual
          </label>
          <input
            type="number"
            value={editValues.stock}
            onChange={(e) => setEditValues({ ...editValues, stock: Number(e.target.value) })}
            className="w-full rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3 text-lg font-bold outline-none focus:ring-2 focus:ring-blue-500/20"
            min="0"
          />
        </div>
      </div>
      <div className="flex gap-3 rounded-2xl bg-blue-50 p-4">
        <Info className="mt-0.5 h-5 w-5 shrink-0 text-blue-500" />
        <div className="text-xs leading-relaxed text-blue-700">
          <p className="mb-1 font-medium">Cambios de Stock:</p>
          <p>
            Al cambiar el stock manualmente se generará una transacción de ajuste. Para compras
            a proveedores, utiliza la carga de planilla Excel para registrar el costo de compra
            correctamente.
          </p>
        </div>
      </div>
    </>
  )
}

function InventoryTabContent({ editValues, setEditValues }: TabContentProps): React.ReactElement {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-6">
        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-wider text-gray-400">
            Fecha de Vencimiento
          </label>
          <DatePicker
            value={editValues.expiry_date}
            onChange={(date) => setEditValues({ ...editValues, expiry_date: date })}
            placeholder="Seleccionar fecha"
          />
        </div>
        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-wider text-gray-400">
            Número de Lote
          </label>
          <input
            type="text"
            value={editValues.batch_number}
            onChange={(e) => setEditValues({ ...editValues, batch_number: e.target.value })}
            className="w-full rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3 font-medium outline-none focus:ring-2 focus:ring-blue-500/20"
            placeholder="Ej: LOTE-2024-001"
          />
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-xs font-bold uppercase tracking-wider text-gray-400">
          Stock Mínimo (Alerta)
        </label>
        <input
          type="number"
          value={editValues.min_stock_level}
          onChange={(e) =>
            setEditValues({ ...editValues, min_stock_level: Number(e.target.value) })
          }
          className="w-full rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3 font-medium outline-none focus:ring-2 focus:ring-blue-500/20"
          min="0"
          placeholder="5"
        />
        <p className="text-xs text-gray-500">
          Cantidad mínima antes de mostrar alerta de bajo stock
        </p>
      </div>
    </div>
  )
}

function LocationTabContent({ editValues, setEditValues }: TabContentProps): React.ReactElement {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-6">
        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-wider text-gray-400">
            Ubicación
          </label>
          <input
            type="text"
            value={editValues.location}
            onChange={(e) => setEditValues({ ...editValues, location: e.target.value })}
            className="w-full rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3 font-medium outline-none focus:ring-2 focus:ring-blue-500/20"
            placeholder="Ej: Estante A, Refrigerador"
          />
        </div>
        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-wider text-gray-400">
            Número de Bandeja
          </label>
          <input
            type="text"
            value={editValues.bin_number}
            onChange={(e) => setEditValues({ ...editValues, bin_number: e.target.value })}
            className="w-full rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3 font-medium outline-none focus:ring-2 focus:ring-blue-500/20"
            placeholder="Ej: BIN-01, Cajón 3"
          />
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-xs font-bold uppercase tracking-wider text-gray-400">
          Proveedor
        </label>
        <input
          type="text"
          value={editValues.supplier_name}
          onChange={(e) => setEditValues({ ...editValues, supplier_name: e.target.value })}
          className="w-full rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3 font-medium outline-none focus:ring-2 focus:ring-blue-500/20"
          placeholder="Nombre del proveedor"
        />
      </div>
    </div>
  )
}
