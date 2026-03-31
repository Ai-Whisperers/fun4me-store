'use client'

import { useState } from 'react'
import {
  X,
  Package,
  DollarSign,
  MapPin,
  Loader2,
  CheckCircle,
  AlertCircle,
  Pill,
} from 'lucide-react'
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

interface AssignProductModalProps {
  product: CatalogProduct
  clinic: string
  onClose: () => void
  onSuccess: () => void
}

export default function AssignProductModal({
  product,
  clinic,
  onClose,
  onSuccess,
}: AssignProductModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // Form state
  const [salePrice, setSalePrice] = useState(product.base_price.toString())
  const [minStockLevel, setMinStockLevel] = useState('5')
  const [location, setLocation] = useState('')
  const [initialStock, setInitialStock] = useState('')
  const [requiresPrescription, setRequiresPrescription] = useState(
    product.requires_prescription || false
  )

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-PY', {
      style: 'currency',
      currency: 'PYG',
      maximumFractionDigits: 0,
    }).format(price)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validation
    const price = parseFloat(salePrice)
    if (isNaN(price) || price < 0) {
      setError('El precio de venta debe ser un número válido mayor o igual a 0')
      return
    }

    const minStock = parseInt(minStockLevel)
    if (isNaN(minStock) || minStock < 0) {
      setError('El stock mínimo debe ser un número válido mayor o igual a 0')
      return
    }

    const stock = initialStock ? parseInt(initialStock) : 0
    if (isNaN(stock) || stock < 0) {
      setError('El stock inicial debe ser un número válido mayor o igual a 0')
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const response = await fetch('/api/inventory/catalog/assign', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          catalog_product_id: product.id,
          clinic_id: clinic,
          sale_price: price,
          min_stock_level: minStock,
          location: location.trim() || undefined,
          initial_stock: stock > 0 ? stock : undefined,
          requires_prescription: requiresPrescription,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Error al asignar el producto')
      }

      const result = await response.json()
      setSuccess(true)

      // Close modal after short delay to show success
      setTimeout(() => {
        onSuccess()
      }, 1500)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (success) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
        <div className="animate-in zoom-in-95 w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl duration-200">
          <div className="p-8 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-500">
              <CheckCircle className="h-8 w-8 text-white" />
            </div>
            <h3 className="mb-2 text-xl font-bold text-gray-900">¡Producto Agregado!</h3>
            <p className="text-gray-600">
              {product.name} ha sido agregado exitosamente a tu inventario.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="animate-in zoom-in-95 max-h-[90vh] w-full max-w-2xl overflow-hidden overflow-y-auto rounded-3xl bg-white shadow-2xl duration-200">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-gray-100 p-6">
          <div className="flex items-start gap-4">
            <div className="h-12 w-12 flex-shrink-0 overflow-hidden rounded-xl bg-gray-50">
              {product.image_url ? (
                <Image
                  src={product.image_url}
                  alt={product.name}
                  width={48}
                  height={48}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <Package className="h-6 w-6 text-gray-300" />
                </div>
              )}
            </div>
            <div>
              <h2 className="mb-1 text-xl font-bold text-gray-900">Agregar a Clínica</h2>
              <p className="text-sm text-gray-600">{product.name}</p>
              <p className="mt-1 text-xs text-gray-400">SKU: {product.sku}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl p-2 transition hover:bg-gray-50"
            disabled={isSubmitting}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="space-y-6 p-6">
          {/* Product Info Summary */}
          <div className="rounded-2xl bg-gray-50 p-4">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-medium text-gray-600">Precio Sugerido</span>
              <span className="font-bold text-gray-900">{formatPrice(product.base_price)}</span>
            </div>
            {product.store_brands && (
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-medium text-gray-600">Marca</span>
                <div className="flex items-center gap-2">
                  {product.store_brands.logo_url && (
                    <Image
                      src={product.store_brands.logo_url}
                      alt={product.store_brands.name}
                      width={16}
                      height={16}
                      className="h-4 w-4 object-contain"
                    />
                  )}
                  <span className="text-sm text-gray-900">{product.store_brands.name}</span>
                </div>
              </div>
            )}
            {product.store_categories && (
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-600">Categoría</span>
                <span className="text-sm text-gray-900">{product.store_categories.name}</span>
              </div>
            )}
            {product.requires_prescription && (
              <div className="mt-3 flex items-center gap-2 rounded-lg bg-orange-50 p-2">
                <Pill className="h-4 w-4 text-orange-500" />
                <span className="text-xs font-medium text-orange-700">Requiere receta médica</span>
              </div>
            )}
          </div>

          {/* Configuration Form */}
          <div className="space-y-6">
            {/* Sale Price */}
            <div>
              <label className="mb-2 block text-sm font-bold text-gray-700">
                Precio de Venta en tu Clínica *
              </label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                <input
                  type="number"
                  value={salePrice}
                  onChange={(e) => setSalePrice(e.target.value)}
                  className="w-full rounded-2xl border border-gray-100 bg-gray-50 py-3 pl-12 pr-4 text-lg font-bold outline-none transition-all focus:ring-2 focus:ring-blue-500/20"
                  placeholder="0"
                  min="0"
                  step="0.01"
                  required
                />
              </div>
              <p className="mt-1 text-xs text-gray-500">
                Precio sugerido: {formatPrice(product.base_price)}
              </p>
            </div>

            {/* Min Stock Level */}
            <div>
              <label className="mb-2 block text-sm font-bold text-gray-700">Stock Mínimo</label>
              <input
                type="number"
                value={minStockLevel}
                onChange={(e) => setMinStockLevel(e.target.value)}
                className="w-full rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3 font-medium outline-none transition-all focus:ring-2 focus:ring-blue-500/20"
                placeholder="5"
                min="0"
              />
              <p className="mt-1 text-xs text-gray-500">
                Nivel mínimo antes de recibir alertas de bajo stock
              </p>
            </div>

            {/* Location */}
            <div>
              <label className="mb-2 block text-sm font-bold text-gray-700">
                Ubicación en la Clínica
              </label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full rounded-2xl border border-gray-100 bg-gray-50 py-3 pl-12 pr-4 font-medium outline-none transition-all focus:ring-2 focus:ring-blue-500/20"
                  placeholder="Ej: Estante A, Refrigerador, etc."
                />
              </div>
            </div>

            {/* Initial Stock */}
            <div>
              <label className="mb-2 block text-sm font-bold text-gray-700">
                Stock Inicial (Opcional)
              </label>
              <input
                type="number"
                value={initialStock}
                onChange={(e) => setInitialStock(e.target.value)}
                className="w-full rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3 font-medium outline-none transition-all focus:ring-2 focus:ring-blue-500/20"
                placeholder="0"
                min="0"
              />
              <p className="mt-1 text-xs text-gray-500">
                Cantidad actual en inventario. Deja vacío si no tienes stock inicial.
              </p>
            </div>

            {/* Prescription Override */}
            <div className="flex items-center justify-between rounded-2xl bg-gray-50 p-4">
              <div>
                <div className="flex items-center gap-2">
                  <Pill className="h-4 w-4 text-orange-500" />
                  <span className="font-medium text-gray-900">Requiere Receta Médica</span>
                </div>
                <p className="mt-1 text-xs text-gray-600">
                  {product.requires_prescription
                    ? 'Este producto requiere receta en el catálogo global'
                    : 'Este producto no requiere receta en el catálogo global'}
                </p>
              </div>
              <label className="relative inline-flex cursor-pointer items-center">
                <input
                  type="checkbox"
                  checked={requiresPrescription}
                  onChange={(e) => setRequiresPrescription(e.target.checked)}
                  className="peer sr-only"
                />
                <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all after:content-[''] peer-checked:bg-blue-600 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300"></div>
              </label>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="flex items-start gap-3 rounded-2xl border border-red-100 bg-red-50 p-4">
              <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-500" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 border-t border-gray-100 pt-6">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-4 font-bold text-gray-500 transition hover:text-gray-700"
              disabled={isSubmitting}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-blue-600 py-4 font-bold text-white transition-all hover:bg-blue-700 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Agregando...
                </>
              ) : (
                <>
                  <Package className="h-5 w-5" />
                  Agregar Producto
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
