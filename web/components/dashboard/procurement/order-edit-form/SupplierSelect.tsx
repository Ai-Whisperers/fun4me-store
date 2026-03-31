/**
 * Supplier Select Component
 *
 * Dropdown for selecting a supplier from verified suppliers list.
 */

'use client'

import { Building2, Loader2 } from 'lucide-react'
import type { Supplier } from './types'

interface SupplierSelectProps {
  suppliers: Supplier[]
  selectedSupplier: string
  onSupplierChange: (supplierId: string) => void
  loading: boolean
}

export function SupplierSelect({
  suppliers,
  selectedSupplier,
  onSupplierChange,
  loading,
}: SupplierSelectProps) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-gray-700">
        Proveedor <span className="text-[var(--status-error)]">*</span>
      </label>
      {loading ? (
        <div className="flex items-center gap-2 text-gray-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          Cargando proveedores...
        </div>
      ) : (
        <div className="relative">
          <Building2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <select
            value={selectedSupplier}
            onChange={(e) => onSupplierChange(e.target.value)}
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
  )
}
