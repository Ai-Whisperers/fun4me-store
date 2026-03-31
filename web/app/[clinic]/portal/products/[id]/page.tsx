'use client'

import { useActionState, useState, useEffect } from 'react'
import {
  ArrowLeft,
  Loader2,
  AlertCircle,
  Info,
  Package,
  DollarSign,
  Boxes,
  Trash2,
  Save,
  ImageIcon,
} from 'lucide-react'
import { updateProduct } from '@/app/actions/update-product'
import { deleteProduct } from '@/app/actions/delete-product'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { ActionResult, FieldErrors } from '@/lib/types/action-result'
import { createClient } from '@/lib/supabase/client'

interface Product {
  id: string
  name: string
  category: string
  price: number
  stock: number
  description: string | null
  sku: string | null
  image_url: string | null
}

// Helper to get category from target_species
function getCategoryFromSpecies(targetSpecies: string[] | null): string {
  if (!targetSpecies || targetSpecies.length === 0) return 'other'
  return targetSpecies[0]
}

// Helper component for field errors
function FieldError({ error }: { error?: string }): React.ReactElement | null {
  if (!error) return null
  return (
    <p className="mt-1 flex items-start gap-1 text-sm text-red-600">
      <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" aria-hidden="true" />
      <span>{error}</span>
    </p>
  )
}

// Helper component for field hints
function FieldHint({ children }: { children: React.ReactNode }): React.ReactElement {
  return (
    <p className="mt-1 flex items-start gap-1 text-xs text-[var(--text-muted)]">
      <Info className="mt-0.5 h-3 w-3 flex-shrink-0" aria-hidden="true" />
      <span>{children}</span>
    </p>
  )
}

// Get field errors from state
function getFieldErrors(state: ActionResult | null): FieldErrors {
  if (!state || state.success) return {}
  return state.fieldErrors || {}
}

// Input class with error state
function inputClass(hasError: boolean): string {
  const base = 'w-full px-4 py-3 rounded-xl border outline-none transition-colors'
  return hasError
    ? `${base} border-red-300 bg-red-50 focus:border-red-500 focus:ring-2 focus:ring-red-200`
    : `${base} border-gray-200 focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20`
}

export default function EditProductPage(): React.ReactElement {
  const { clinic, id } = useParams() as { clinic: string; id: string }
  const router = useRouter()
  const [state, formAction, isPending] = useActionState(updateProduct, null)
  const fieldErrors = getFieldErrors(state)

  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    async function fetchProduct(): Promise<void> {
      const supabase = createClient()

      // Fetch product with inventory
      const { data, error: fetchError } = await supabase
        .from('store_products')
        .select(
          `
          id,
          name,
          description,
          base_price,
          sku,
          image_url,
          target_species,
          store_inventory (
            stock_quantity
          )
        `
        )
        .eq('id', id)
        .is('deleted_at', null)
        .single()

      if (fetchError || !data) {
        setError('Producto no encontrado')
        setLoading(false)
        return
      }

      // Transform to expected format
      const inventory = Array.isArray(data.store_inventory)
        ? data.store_inventory[0]
        : data.store_inventory

      setProduct({
        id: data.id,
        name: data.name,
        category: getCategoryFromSpecies(data.target_species),
        price: data.base_price,
        stock: inventory?.stock_quantity ?? 0,
        description: data.description,
        sku: data.sku,
        image_url: data.image_url,
      })
      setLoading(false)
    }

    fetchProduct()
  }, [id])

  const handleDelete = async (): Promise<void> => {
    setIsDeleting(true)
    const result = await deleteProduct(id, clinic)

    if (result.success) {
      router.push(`/${clinic}/portal/products?success=product_deleted`)
    } else {
      setError(result.error ?? 'Error al eliminar el producto')
      setShowDeleteModal(false)
      setIsDeleting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--primary)]" />
      </div>
    )
  }

  if (error && !product) {
    return (
      <div className="mx-auto max-w-xl">
        <div className="mb-8 flex items-center gap-4">
          <Link
            href={`/${clinic}/portal/products`}
            className="rounded-xl p-2 transition-colors hover:bg-white"
          >
            <ArrowLeft className="h-6 w-6 text-[var(--text-secondary)]" />
          </Link>
          <h1 className="font-heading text-3xl font-black text-[var(--text-primary)]">Error</h1>
        </div>
        <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700">
          <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0" />
          <div>
            <p className="font-bold">Producto no encontrado</p>
            <p className="mt-1 text-sm">{error}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-xl">
      <div className="mb-8 flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link
            href={`/${clinic}/portal/products`}
            className="rounded-xl p-2 transition-colors hover:bg-white"
            aria-label="Volver a productos"
          >
            <ArrowLeft className="h-6 w-6 text-[var(--text-secondary)]" aria-hidden="true" />
          </Link>
          <div>
            <h1 className="font-heading text-3xl font-black text-[var(--text-primary)]">
              Editar Producto
            </h1>
            <p className="mt-1 text-sm text-[var(--text-muted)]">{product?.name}</p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowDeleteModal(true)}
          className="rounded-xl p-3 text-red-500 transition-colors hover:bg-red-50"
          title="Eliminar producto"
        >
          <Trash2 className="h-5 w-5" />
        </button>
      </div>

      {/* Global error message */}
      {((state && !state.success) || error) && (
        <div
          role="alert"
          className="mb-6 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700"
        >
          <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0" aria-hidden="true" />
          <div>
            <p className="font-bold">No se pudo actualizar el producto</p>
            <p className="mt-1 text-sm">{state && !state.success ? state.error : error}</p>
          </div>
        </div>
      )}

      <div className="rounded-3xl border border-gray-100 bg-white p-8 shadow-xl">
        <form action={formAction} className="space-y-6">
          <input type="hidden" name="clinic" value={clinic} />
          <input type="hidden" name="id" value={id} />

          {/* Current Image */}
          {product?.image_url && (
            <div className="flex items-center gap-4 rounded-2xl bg-gray-50 p-4">
              <img
                src={product.image_url}
                alt={product.name}
                className="h-20 w-20 rounded-xl object-cover"
              />
              <div>
                <p className="text-sm font-bold text-[var(--text-secondary)]">Imagen actual</p>
                <p className="text-xs text-[var(--text-muted)]">
                  Sube una nueva imagen para reemplazarla
                </p>
              </div>
            </div>
          )}

          {/* Product Info Section */}
          <div className="space-y-4">
            <h3 className="flex items-center gap-2 font-bold text-[var(--text-primary)]">
              <Package className="h-4 w-4 text-[var(--primary)]" aria-hidden="true" />
              Información del Producto
            </h3>

            {/* Name */}
            <div>
              <label
                htmlFor="name"
                className="mb-1 block text-sm font-bold text-[var(--text-secondary)]"
              >
                Nombre del Producto <span className="text-red-500">*</span>
              </label>
              <input
                id="name"
                name="name"
                required
                type="text"
                defaultValue={product?.name}
                placeholder="Ej: Pipeta Antipulgas, Collar Isabelino"
                className={inputClass(!!fieldErrors.name)}
                aria-invalid={!!fieldErrors.name}
              />
              <FieldError error={fieldErrors.name} />
            </div>

            {/* Category */}
            <div>
              <label
                htmlFor="category"
                className="mb-1 block text-sm font-bold text-[var(--text-secondary)]"
              >
                Categoría <span className="text-red-500">*</span>
              </label>
              <select
                id="category"
                name="category"
                defaultValue={product?.category}
                className={`${inputClass(!!fieldErrors.category)} bg-white`}
                aria-invalid={!!fieldErrors.category}
              >
                <option value="dog">Perros</option>
                <option value="cat">Gatos</option>
                <option value="exotic">Exóticos</option>
                <option value="other">Otro</option>
              </select>
              <FieldError error={fieldErrors.category} />
            </div>

            {/* SKU */}
            <div>
              <label
                htmlFor="sku"
                className="mb-1 block text-sm font-bold text-[var(--text-secondary)]"
              >
                Código SKU
              </label>
              <input
                id="sku"
                name="sku"
                type="text"
                defaultValue={product?.sku || ''}
                placeholder="Ej: PIP-001, COL-XL-001"
                className={inputClass(!!fieldErrors.sku)}
                aria-invalid={!!fieldErrors.sku}
              />
              <FieldError error={fieldErrors.sku} />
              <FieldHint>Código interno para identificar el producto</FieldHint>
            </div>
          </div>

          {/* Pricing & Stock Section */}
          <div className="space-y-4 border-t border-gray-100 pt-4">
            <h3 className="flex items-center gap-2 font-bold text-[var(--text-primary)]">
              <DollarSign className="h-4 w-4 text-[var(--primary)]" aria-hidden="true" />
              Precio y Stock
            </h3>

            <div className="grid grid-cols-2 gap-4">
              {/* Price */}
              <div>
                <label
                  htmlFor="price"
                  className="mb-1 block text-sm font-bold text-[var(--text-secondary)]"
                >
                  Precio (Gs.) <span className="text-red-500">*</span>
                </label>
                <input
                  id="price"
                  name="price"
                  required
                  type="number"
                  step="1"
                  min="0"
                  defaultValue={product?.price}
                  className={inputClass(!!fieldErrors.price)}
                  aria-invalid={!!fieldErrors.price}
                />
                <FieldError error={fieldErrors.price} />
              </div>

              {/* Stock */}
              <div>
                <label
                  htmlFor="stock"
                  className="mb-1 block text-sm font-bold text-[var(--text-secondary)]"
                >
                  <Boxes className="mr-1 inline h-3 w-3" aria-hidden="true" />
                  Stock <span className="text-red-500">*</span>
                </label>
                <input
                  id="stock"
                  name="stock"
                  required
                  type="number"
                  min="0"
                  defaultValue={product?.stock}
                  className={inputClass(!!fieldErrors.stock)}
                  aria-invalid={!!fieldErrors.stock}
                />
                <FieldError error={fieldErrors.stock} />
              </div>
            </div>
          </div>

          {/* Description Section */}
          <div className="space-y-4 border-t border-gray-100 pt-4">
            <div>
              <label
                htmlFor="description"
                className="mb-1 block text-sm font-bold text-[var(--text-secondary)]"
              >
                Descripción
              </label>
              <textarea
                id="description"
                name="description"
                rows={3}
                defaultValue={product?.description || ''}
                placeholder="Describe el producto, sus características, uso recomendado..."
                className={`${inputClass(!!fieldErrors.description)} resize-none`}
                aria-invalid={!!fieldErrors.description}
              />
              <FieldError error={fieldErrors.description} />
            </div>
          </div>

          {/* Image Upload */}
          <div className="space-y-4 border-t border-gray-100 pt-4">
            <h3 className="flex items-center gap-2 font-bold text-[var(--text-primary)]">
              <ImageIcon className="h-4 w-4 text-[var(--primary)]" aria-hidden="true" />
              Imagen del Producto
            </h3>
            <div>
              <input
                id="photo"
                name="photo"
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp"
                className="file:bg-[var(--primary)]/10 hover:file:bg-[var(--primary)]/20 w-full text-sm text-[var(--text-secondary)] file:mr-4 file:cursor-pointer file:rounded-lg file:border-0 file:px-4 file:py-2 file:text-sm file:font-bold file:text-[var(--primary)]"
              />
              <FieldHint>JPG, PNG, GIF o WebP. Máximo 5MB.</FieldHint>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Link
              href={`/${clinic}/portal/products`}
              className="flex-1 rounded-xl border border-gray-200 py-4 text-center font-bold text-[var(--text-secondary)] transition-colors hover:bg-gray-50"
            >
              Cancelar
            </Link>
            <button
              type="submit"
              disabled={isPending}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[var(--primary)] py-4 font-bold text-white shadow-lg transition-all hover:-translate-y-1 hover:shadow-xl active:scale-95 disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:translate-y-0 disabled:hover:shadow-lg"
            >
              {isPending ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
                  <span>Guardando...</span>
                </>
              ) : (
                <>
                  <Save className="h-5 w-5" />
                  <span>Guardar Cambios</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl">
            <div className="p-8">
              <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
                <Trash2 className="h-8 w-8 text-red-600" />
              </div>
              <h3 className="mb-2 text-center text-xl font-bold text-[var(--text-primary)]">
                ¿Eliminar producto?
              </h3>
              <p className="mb-6 text-center text-[var(--text-secondary)]">
                Esta acción no se puede deshacer. El producto <strong>{product?.name}</strong> será
                eliminado permanentemente.
              </p>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowDeleteModal(false)}
                  disabled={isDeleting}
                  className="flex-1 rounded-xl border border-gray-200 py-3 font-bold text-[var(--text-secondary)] transition-colors hover:bg-gray-50 disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-red-600 py-3 font-bold text-white transition-colors hover:bg-red-700 disabled:opacity-50"
                >
                  {isDeleting ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      <span>Eliminando...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="h-5 w-5" />
                      <span>Eliminar</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
