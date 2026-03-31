'use client'

/**
 * Delete Confirmation Modal Component
 *
 * REF-006: Extracted delete confirmation from client component
 */

import { Trash2 } from 'lucide-react'

interface DeleteConfirmModalProps {
  onClose: () => void
  onConfirm: () => void
}

export function DeleteConfirmModal({
  onClose,
  onConfirm,
}: DeleteConfirmModalProps): React.ReactElement {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
            <Trash2 className="h-6 w-6 text-red-600" />
          </div>
          <h3 className="mb-2 text-lg font-bold text-[var(--text-primary)]">
            Eliminar Cupón
          </h3>
          <p className="mb-6 text-[var(--text-secondary)]">
            ¿Estás seguro de que deseas eliminar este cupón? Esta acción no se puede
            deshacer.
          </p>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 rounded-xl border border-gray-200 px-4 py-2.5 font-medium text-[var(--text-primary)] transition-colors hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              onClick={onConfirm}
              className="flex-1 rounded-xl bg-red-600 px-4 py-2.5 font-medium text-white transition-colors hover:bg-red-700"
            >
              Eliminar
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
