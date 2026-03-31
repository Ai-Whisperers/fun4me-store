/**
 * Deleted Items Warning Component
 *
 * Shows items marked for deletion with option to restore.
 */

'use client'

import type { OrderItem } from './types'

interface DeletedItemsWarningProps {
  items: OrderItem[]
  onRestoreItem: (index: number) => void
}

export function DeletedItemsWarning({ items, onRestoreItem }: DeletedItemsWarningProps) {
  const deletedItems = items.filter((i) => i.isDeleted && !i.isNew)

  if (deletedItems.length === 0) {
    return null
  }

  return (
    <div className="rounded-lg bg-[var(--status-warning-bg)] p-4">
      <p className="mb-2 text-sm font-medium text-[var(--status-warning)]">
        Items a eliminar ({deletedItems.length}):
      </p>
      <div className="space-y-1">
        {items.map((item, index) => {
          if (!item.isDeleted || item.isNew) return null
          return (
            <div key={item.id} className="flex items-center justify-between text-sm text-gray-600">
              <span className="line-through">{item.product_name}</span>
              <button
                type="button"
                onClick={() => onRestoreItem(index)}
                className="text-[var(--primary)] hover:underline"
              >
                Restaurar
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
