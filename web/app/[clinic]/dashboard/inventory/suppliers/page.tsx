'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Building2, AlertTriangle } from 'lucide-react'
import { SupplierList, SupplierForm, SupplierDetailModal } from '@/components/dashboard/suppliers'
import { useToast } from '@/components/ui/Toast'

interface Supplier {
  id: string
  name: string
  legal_name: string | null
  tax_id: string | null
  contact_info: {
    email?: string
    phone?: string
    address?: string
    city?: string
    contact_person?: string
  } | null
  supplier_type: 'products' | 'services' | 'both'
  minimum_order_amount: number | null
  payment_terms: string | null
  delivery_time_days: number | null
  verification_status: 'pending' | 'verified' | 'rejected'
  notes?: string | null
  created_at: string
}

export default function SuppliersPage(): React.ReactElement {
  const params = useParams()
  const clinic = params?.clinic as string
  const { showToast } = useToast()

  const [showForm, setShowForm] = useState(false)
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null)
  const [viewingSupplier, setViewingSupplier] = useState<string | null>(null)
  const [deletingSupplier, setDeletingSupplier] = useState<Supplier | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  const handleCreateClick = () => {
    setEditingSupplier(null)
    setShowForm(true)
  }

  const handleViewClick = (supplier: Supplier) => {
    setViewingSupplier(supplier.id)
  }

  const handleEditClick = (supplier: Supplier) => {
    setEditingSupplier(supplier)
    setShowForm(true)
  }

  const handleDeleteClick = (supplier: Supplier) => {
    setDeletingSupplier(supplier)
  }

  const handleFormSuccess = () => {
    setShowForm(false)
    setEditingSupplier(null)
    setRefreshKey(k => k + 1)
  }

  const handleConfirmDelete = async () => {
    if (!deletingSupplier) return

    try {
      const res = await fetch(`/api/suppliers/${deletingSupplier.id}`, {
        method: 'DELETE',
      })

      if (!res.ok) throw new Error('Error al eliminar proveedor')

      showToast(`Proveedor eliminado: ${deletingSupplier.name}`)

      setDeletingSupplier(null)
      setRefreshKey(k => k + 1)
    } catch (_error) {
      showToast('Error: No se pudo eliminar el proveedor')
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href={`/${clinic}/dashboard/inventory`}
          className="rounded-xl p-2 transition-colors hover:bg-gray-100"
          aria-label="Volver al inventario"
        >
          <ArrowLeft className="h-5 w-5 text-gray-600" />
        </Link>
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--primary)]/10">
            <Building2 className="h-6 w-6 text-[var(--primary)]" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-[var(--text-primary)]">
              Gestión de Proveedores
            </h1>
            <p className="text-sm text-gray-500">
              Administra tus proveedores y cotizaciones
            </p>
          </div>
        </div>
      </div>

      {/* Supplier List */}
      <SupplierList
        key={refreshKey}
        onCreateClick={handleCreateClick}
        onViewClick={handleViewClick}
        onEditClick={handleEditClick}
        onDeleteClick={handleDeleteClick}
      />

      {/* Create/Edit Form Modal */}
      {showForm && (
        <SupplierForm
          supplier={editingSupplier}
          onClose={() => {
            setShowForm(false)
            setEditingSupplier(null)
          }}
          onSuccess={handleFormSuccess}
        />
      )}

      {/* View Detail Modal */}
      {viewingSupplier && (
        <SupplierDetailModal
          supplierId={viewingSupplier}
          onClose={() => setViewingSupplier(null)}
          onVerify={() => setRefreshKey(k => k + 1)}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deletingSupplier && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <h3 className="font-semibold text-[var(--text-primary)]">Eliminar Proveedor</h3>
                <p className="text-sm text-gray-500">Esta acción no se puede deshacer</p>
              </div>
            </div>

            <p className="mb-6 text-gray-600">
              ¿Estás seguro que deseas eliminar a <strong>{deletingSupplier.name}</strong>?
              Se eliminarán también todas las cotizaciones asociadas.
            </p>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeletingSupplier(null)}
                className="rounded-lg border border-gray-200 px-4 py-2 font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmDelete}
                className="rounded-lg bg-red-600 px-4 py-2 font-medium text-white hover:bg-red-700"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
