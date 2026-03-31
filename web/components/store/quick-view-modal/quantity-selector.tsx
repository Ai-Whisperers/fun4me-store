'use client'

import { Minus, Plus } from 'lucide-react'
import type { QuantitySelectorProps } from './types'

export function QuantitySelector({
  quantity,
  stock,
  onChange,
}: QuantitySelectorProps): React.ReactElement {
  const decrease = (): void => {
    onChange(Math.max(1, quantity - 1))
  }

  const increase = (): void => {
    onChange(Math.min(stock, quantity + 1))
  }

  return (
    <div className="mb-6 flex items-center gap-4">
      <span className="text-sm font-medium text-[var(--text-secondary)]">Cantidad:</span>
      <div className="flex items-center gap-2">
        <button
          onClick={decrease}
          disabled={quantity <= 1}
          className="rounded-lg border border-[var(--border-default)] p-2 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
          aria-label="Disminuir cantidad"
        >
          <Minus className="h-4 w-4" />
        </button>
        <span className="w-12 text-center text-lg font-bold">{quantity}</span>
        <button
          onClick={increase}
          disabled={quantity >= stock}
          className="rounded-lg border border-[var(--border-default)] p-2 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
          aria-label="Aumentar cantidad"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
