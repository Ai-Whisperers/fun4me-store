'use client'

import { Star, Check, AlertTriangle, AlertCircle } from 'lucide-react'
import type { ProductInfoProps } from './types'

export function ProductInfo({
  product,
  stock,
  inStock,
  lowStock,
}: ProductInfoProps): React.ReactElement {
  const formatPrice = (price: number | null | undefined): string => {
    if (price === null || price === undefined) return 'Gs 0'
    return `Gs ${price.toLocaleString('es-PY')}`
  }

  return (
    <div>
      {/* Brand */}
      {product.brand && (
        <span className="text-xs uppercase tracking-wider text-[var(--text-muted)]">
          {product.brand.name}
        </span>
      )}

      {/* Name */}
      <h2 className="mb-2 mt-1 text-2xl font-bold text-[var(--text-primary)]">{product.name}</h2>

      {/* Rating */}
      {(product.review_count ?? 0) > 0 && (
        <div className="mb-4 flex items-center gap-2">
          <div className="flex items-center">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                className={`h-4 w-4 ${
                  star <= Math.round(product.avg_rating ?? 0)
                    ? 'fill-yellow-400 text-yellow-400'
                    : 'text-gray-300'
                }`}
              />
            ))}
          </div>
          <span className="text-sm text-[var(--text-muted)]">
            ({product.review_count ?? 0} reseñas)
          </span>
        </div>
      )}

      {/* Price */}
      <div className="mb-4">
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-black text-[var(--text-primary)]">
            {formatPrice(product.current_price)}
          </span>
          {product.original_price && (
            <span className="text-lg text-[var(--text-muted)] line-through">
              {formatPrice(product.original_price)}
            </span>
          )}
        </div>
      </div>

      {/* Short Description */}
      {product.short_description && (
        <p className="mb-4 line-clamp-3 text-[var(--text-secondary)]">
          {product.short_description}
        </p>
      )}

      {/* Stock Status */}
      <StockStatus inStock={inStock} lowStock={lowStock} stock={stock} />

      {/* Prescription Warning */}
      {product.is_prescription_required && <PrescriptionWarning />}
    </div>
  )
}

function StockStatus({
  inStock,
  lowStock,
  stock,
}: {
  inStock: boolean
  lowStock: boolean
  stock: number
}): React.ReactElement {
  return (
    <div className="mb-4">
      {inStock ? (
        lowStock ? (
          <div className="flex items-center gap-2 text-[var(--status-warning)]">
            <AlertTriangle className="h-4 w-4" />
            <span className="font-medium">¡Solo {stock} disponibles!</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-[var(--status-success)]">
            <Check className="h-4 w-4" />
            <span className="font-medium">En Stock</span>
          </div>
        )
      ) : (
        <div className="flex items-center gap-2 text-[var(--status-error)]">
          <AlertCircle className="h-4 w-4" />
          <span className="font-medium">Sin Stock</span>
        </div>
      )}
    </div>
  )
}

function PrescriptionWarning(): React.ReactElement {
  return (
    <div className="mb-4 rounded-lg border border-[var(--status-warning-border)] bg-[var(--status-warning-bg)] p-3">
      <div className="flex items-start gap-2">
        <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-[var(--status-warning)]" />
        <div>
          <p className="font-medium text-[var(--status-warning-text)]">Requiere Receta</p>
          <p className="text-sm text-[var(--status-warning-text)]">
            Este producto necesita receta veterinaria para ser despachado.
          </p>
        </div>
      </div>
    </div>
  )
}
