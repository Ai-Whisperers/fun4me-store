'use client'

import { Plus, CheckCircle, Package, Pill } from 'lucide-react'
import Image from 'next/image'

interface CatalogProduct {
  id: string
  sku: string
  name: string
  description?: string
  short_description?: string
  base_price: number
  image_url?: string
  images?: string[]
  target_species?: string[]
  requires_prescription?: boolean
  is_assigned: boolean
  assignment: {
    sale_price: number
    is_active: boolean
  } | null
  store_categories?: {
    id: string
    name: string
    slug: string
  }
  store_brands?: {
    id: string
    name: string
    slug: string
    logo_url?: string
  }
}

interface CatalogProductCardProps {
  product: CatalogProduct
  viewMode: 'grid' | 'list'
  onAssign: (product: CatalogProduct) => void
}

export default function CatalogProductCard({
  product,
  viewMode,
  onAssign,
}: CatalogProductCardProps) {
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-PY', {
      style: 'currency',
      currency: 'PYG',
      maximumFractionDigits: 0,
    }).format(price)
  }

  const getSpeciesDisplay = (species?: string[]) => {
    if (!species || species.length === 0) return null
    const speciesMap: Record<string, string> = {
      perro: '🐕',
      gato: '🐱',
      ave: '🐦',
      reptil: '🦎',
      pez: '🐠',
      roedor: '🐹',
    }
    return species
      .slice(0, 3)
      .map((s) => speciesMap[s] || s)
      .join(' ')
  }

  if (viewMode === 'list') {
    return (
      <div className="rounded-2xl border border-gray-100 bg-white p-6 transition-all hover:shadow-md">
        <div className="flex items-center gap-6">
          {/* Product Image */}
          <div className="h-20 w-20 flex-shrink-0 overflow-hidden rounded-xl bg-gray-50">
            {product.image_url ? (
              <Image
                src={product.image_url}
                alt={product.name}
                width={80}
                height={80}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                <Package className="h-8 w-8 text-gray-300" />
              </div>
            )}
          </div>

          {/* Product Info */}
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between">
              <div className="min-w-0 flex-1">
                <div className="mb-1 flex items-center gap-2">
                  {product.store_brands?.logo_url && (
                    <Image
                      src={product.store_brands.logo_url}
                      alt={product.store_brands.name}
                      width={16}
                      height={16}
                      className="h-4 w-4 object-contain"
                    />
                  )}
                  <h3 className="truncate font-bold text-gray-900">{product.name}</h3>
                  {product.requires_prescription && (
                    <Pill className="h-4 w-4 flex-shrink-0 text-orange-500" />
                  )}
                </div>

                <div className="mb-2 flex items-center gap-4 text-sm text-gray-500">
                  <span>SKU: {product.sku}</span>
                  {product.store_categories && <span>{product.store_categories.name}</span>}
                  {getSpeciesDisplay(product.target_species) && (
                    <span>{getSpeciesDisplay(product.target_species)}</span>
                  )}
                </div>

                {product.short_description && (
                  <p className="line-clamp-2 text-sm text-gray-600">{product.short_description}</p>
                )}
              </div>

              {/* Price and Action */}
              <div className="ml-6 flex items-center gap-4">
                <div className="text-right">
                  <div className="text-lg font-bold text-gray-900">
                    {formatPrice(product.base_price)}
                  </div>
                  {product.is_assigned && product.assignment && (
                    <div className="text-xs font-medium text-green-600">
                      Tu precio: {formatPrice(product.assignment.sale_price)}
                    </div>
                  )}
                </div>

                <div className="flex-shrink-0">
                  {product.is_assigned ? (
                    <div className="flex items-center gap-2 rounded-xl bg-green-50 px-4 py-2 text-green-700">
                      <CheckCircle className="h-4 w-4" />
                      <span className="text-sm font-bold">Agregado</span>
                    </div>
                  ) : (
                    <button
                      onClick={() => onAssign(product)}
                      className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 font-bold text-white transition hover:bg-blue-700"
                    >
                      <Plus className="h-4 w-4" />
                      Agregar
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Grid view (default)
  return (
    <div className="group overflow-hidden rounded-3xl border border-gray-100 bg-white transition-all hover:shadow-lg">
      {/* Product Image */}
      <div className="relative aspect-square overflow-hidden bg-gray-50">
        {product.image_url ? (
          <Image
            src={product.image_url}
            alt={product.name}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <Package className="h-12 w-12 text-gray-300" />
          </div>
        )}

        {/* Status Badge */}
        <div className="absolute left-3 top-3">
          {product.is_assigned ? (
            <div className="flex items-center gap-1 rounded-full bg-green-500 px-2 py-1 text-xs font-bold text-white">
              <CheckCircle className="h-3 w-3" />
              Agregado
            </div>
          ) : product.requires_prescription ? (
            <div className="flex items-center gap-1 rounded-full bg-orange-500 px-2 py-1 text-xs font-bold text-white">
              <Pill className="h-3 w-3" />
              Receta
            </div>
          ) : null}
        </div>

        {/* Quick Action Overlay */}
        <div className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 transition-opacity group-hover:opacity-100">
          <button
            onClick={() => onAssign(product)}
            disabled={product.is_assigned}
            className={`flex items-center gap-2 rounded-2xl px-6 py-3 font-bold transition-all ${
              product.is_assigned
                ? 'cursor-not-allowed bg-green-500 text-white'
                : 'bg-blue-600 text-white hover:scale-105 hover:bg-blue-700'
            }`}
          >
            {product.is_assigned ? (
              <>
                <CheckCircle className="h-5 w-5" />
                Agregado
              </>
            ) : (
              <>
                <Plus className="h-5 w-5" />
                Agregar a Clínica
              </>
            )}
          </button>
        </div>
      </div>

      {/* Product Info */}
      <div className="p-5">
        {/* Brand */}
        {product.store_brands && (
          <div className="mb-2 flex items-center gap-2">
            {product.store_brands.logo_url && (
              <Image
                src={product.store_brands.logo_url}
                alt={product.store_brands.name}
                width={16}
                height={16}
                className="h-4 w-4 object-contain"
              />
            )}
            <span className="text-xs font-bold uppercase tracking-wider text-gray-400">
              {product.store_brands.name}
            </span>
          </div>
        )}

        {/* Product Name */}
        <h3 className="mb-2 line-clamp-2 font-bold leading-tight text-gray-900">{product.name}</h3>

        {/* SKU and Category */}
        <div className="mb-3 flex items-center gap-2 text-xs text-gray-500">
          <span>SKU: {product.sku}</span>
          {product.store_categories && (
            <>
              <span>•</span>
              <span>{product.store_categories.name}</span>
            </>
          )}
        </div>

        {/* Species */}
        {getSpeciesDisplay(product.target_species) && (
          <div className="mb-3 text-sm">{getSpeciesDisplay(product.target_species)}</div>
        )}

        {/* Description */}
        {product.short_description && (
          <p className="mb-4 line-clamp-2 text-sm text-gray-600">{product.short_description}</p>
        )}

        {/* Price */}
        <div className="flex items-center justify-between">
          <div>
            <div className="text-lg font-bold text-gray-900">{formatPrice(product.base_price)}</div>
            {product.is_assigned && product.assignment && (
              <div className="text-xs font-medium text-green-600">
                Tu precio: {formatPrice(product.assignment.sale_price)}
              </div>
            )}
          </div>

          {/* Action Button (Mobile) */}
          <div className="lg:hidden">
            {product.is_assigned ? (
              <div className="flex items-center gap-1 rounded-lg bg-green-50 px-3 py-1 text-xs font-bold text-green-700">
                <CheckCircle className="h-3 w-3" />
                Agregado
              </div>
            ) : (
              <button
                onClick={() => onAssign(product)}
                className="flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-1 text-xs font-bold text-white transition hover:bg-blue-700"
              >
                <Plus className="h-3 w-3" />
                Agregar
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
