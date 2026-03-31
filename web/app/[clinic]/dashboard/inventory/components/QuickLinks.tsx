'use client'

/**
 * Quick Links Component
 *
 * REF-006: Quick links section extracted from client component
 */

import Link from 'next/link'
import { ShoppingCart, Clock, ScanLine, Plus } from 'lucide-react'

interface QuickLinksProps {
  clinic: string
  onScan: () => void
  onAddProduct: () => void
}

export function QuickLinks({ clinic, onScan, onAddProduct }: QuickLinksProps): React.ReactElement {
  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
      <Link
        href={`/${clinic}/dashboard/inventory/reorders`}
        className="flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--bg-default)] p-4 transition-colors hover:border-[var(--primary)] hover:bg-[var(--primary)]/5"
      >
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--status-info-bg)]">
          <ShoppingCart className="h-5 w-5 text-[var(--status-info)]" />
        </div>
        <div>
          <p className="font-medium text-[var(--text-primary)]">Reorden</p>
          <p className="text-xs text-[var(--text-secondary)]">Sugerencias</p>
        </div>
      </Link>
      <Link
        href={`/${clinic}/dashboard/inventory/expiring`}
        className="flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--bg-default)] p-4 transition-colors hover:border-[var(--primary)] hover:bg-[var(--primary)]/5"
      >
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--status-error-bg)]">
          <Clock className="h-5 w-5 text-[var(--status-error)]" />
        </div>
        <div>
          <p className="font-medium text-[var(--text-primary)]">Vencimientos</p>
          <p className="text-xs text-[var(--text-secondary)]">Control</p>
        </div>
      </Link>
      <button
        onClick={onScan}
        className="flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--bg-default)] p-4 text-left transition-colors hover:border-[var(--primary)] hover:bg-[var(--primary)]/5"
      >
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--status-special-bg)]">
          <ScanLine className="h-5 w-5 text-[var(--status-special)]" />
        </div>
        <div>
          <p className="font-medium text-[var(--text-primary)]">Escáner</p>
          <p className="text-xs text-[var(--text-secondary)]">Código de barras</p>
        </div>
      </button>
      <button
        onClick={onAddProduct}
        className="flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--bg-default)] p-4 text-left transition-colors hover:border-[var(--primary)] hover:bg-[var(--primary)]/5"
      >
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--status-success-bg)]">
          <Plus className="h-5 w-5 text-[var(--status-success)]" />
        </div>
        <div>
          <p className="font-medium text-[var(--text-primary)]">Nuevo</p>
          <p className="text-xs text-[var(--text-secondary)]">Producto</p>
        </div>
      </button>
    </div>
  )
}
