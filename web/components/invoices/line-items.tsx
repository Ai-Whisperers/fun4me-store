'use client'

import * as Icons from 'lucide-react'
import { LineItemRow } from './line-item-row'

interface Service {
  id: string
  name: string
  base_price: number
  category?: string
}

interface LineItem {
  id: string
  service_id: string | null
  description: string
  quantity: number
  unit_price: number
  discount_percent: number
}

interface LineItemsProps {
  items: LineItem[]
  services: Service[]
  onChange: (items: LineItem[]) => void
  disabled?: boolean
}

export function LineItems({ items, services, onChange, disabled }: LineItemsProps) {
  const addItem = () => {
    const newItem: LineItem = {
      id: `temp-${Date.now()}`,
      service_id: null,
      description: '',
      quantity: 1,
      unit_price: 0,
      discount_percent: 0,
    }
    onChange([...items, newItem])
  }

  const updateItem = (index: number, updatedItem: LineItem) => {
    const newItems = [...items]
    newItems[index] = updatedItem
    onChange(newItems)
  }

  const removeItem = (index: number) => {
    onChange(items.filter((_, i) => i !== index))
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-medium text-[var(--text-primary)]">Artículos</h3>
        {!disabled && (
          <button
            type="button"
            onClick={addItem}
            className="hover:bg-[var(--primary)]/10 inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm text-[var(--primary)] transition-colors"
          >
            <Icons.Plus className="h-4 w-4" />
            Agregar artículo
          </button>
        )}
      </div>

      {items.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 p-8 text-center">
          <Icons.Package className="mx-auto mb-2 h-8 w-8 text-gray-300" />
          <p className="text-[var(--text-secondary)]">
            No hay artículos. Agrega servicios o productos a la factura.
          </p>
          {!disabled && (
            <button
              type="button"
              onClick={addItem}
              className="mt-3 inline-flex items-center gap-1 rounded-lg bg-[var(--primary)] px-4 py-2 text-sm text-white"
            >
              <Icons.Plus className="h-4 w-4" />
              Agregar artículo
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item, index) => (
            <LineItemRow
              key={item.id}
              item={item}
              services={services}
              onUpdate={(updatedItem) => updateItem(index, updatedItem)}
              onRemove={() => removeItem(index)}
              disabled={disabled}
            />
          ))}
        </div>
      )}
    </div>
  )
}
