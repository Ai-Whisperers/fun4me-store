import * as Icons from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { SuccessToast } from './success-toast'

interface ProductsPageProps {
  params: Promise<{ clinic: string }>
  searchParams: Promise<{ success?: string }>
}

// Helper to get category display name from target_species
function getCategoryDisplay(targetSpecies: string[] | null): string {
  if (!targetSpecies || targetSpecies.length === 0) return 'Otro'
  const species = targetSpecies[0]
  const categoryLabels: Record<string, string> = {
    dog: 'Perros',
    cat: 'Gatos',
    exotic: 'Exóticos',
  }
  return categoryLabels[species] || 'Otro'
}

export default async function ProductsPage({
  params,
  searchParams,
}: ProductsPageProps): Promise<React.ReactElement> {
  const supabase = await createClient()
  const { clinic } = await params
  const { success } = await searchParams

  // Success messages
  const successMessages: Record<string, string> = {
    product_created: 'Producto creado exitosamente',
    product_updated: 'Producto actualizado exitosamente',
    product_deleted: 'Producto eliminado exitosamente',
  }

  // 1. Auth Check & Role
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect(`/${clinic}/portal/login`)

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, tenant_id')
    .eq('id', user.id)
    .single()

  const isStaff = profile?.role === 'vet' || profile?.role === 'admin'

  if (!isStaff) {
    return (
      <div className="py-20 text-center">
        <h1 className="text-2xl font-bold text-red-500">Acceso Restringido</h1>
        <p className="text-gray-500">Solo el personal de la clínica puede ver esta sección.</p>
        <Link
          href={`/${clinic}/portal/dashboard`}
          className="mt-4 inline-block text-blue-500 hover:underline"
        >
          Volver al Dashboard
        </Link>
      </div>
    )
  }

  // 2. Fetch Products with inventory
  const { data: products } = await supabase
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
      is_active,
      store_inventory (
        stock_quantity
      )
    `
    )
    .eq('tenant_id', profile.tenant_id)
    .is('deleted_at', null)
    .order('name', { ascending: true })

  // Transform products to include stock from inventory
  const productsWithStock =
    products?.map((product) => {
      const inventory = Array.isArray(product.store_inventory)
        ? product.store_inventory[0]
        : product.store_inventory
      return {
        ...product,
        price: product.base_price,
        stock: inventory?.stock_quantity ?? 0,
        category: getCategoryDisplay(product.target_species),
      }
    }) || []

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      {/* Success Toast */}
      {success && successMessages[success] && <SuccessToast message={successMessages[success]} />}

      {/* Header */}
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="font-heading text-3xl font-black text-[var(--text-primary)]">
            Inventario de Productos
          </h1>
          <p className="text-[var(--text-secondary)]">Gestiona el stock y precios de la clínica.</p>
        </div>

        <div className="flex gap-3">
          <Link
            href={`/${clinic}/portal/products/new`}
            className="bg-[var(--primary)]/10 flex shrink-0 items-center justify-center gap-2 rounded-xl px-6 py-3 font-bold text-[var(--primary)] transition-all hover:bg-[var(--primary)] hover:text-white"
          >
            <Icons.Plus className="h-5 w-5" />{' '}
            <span className="hidden md:inline">Nuevo Producto</span>
          </Link>
        </div>
      </div>

      {/* Empty State */}
      {productsWithStock.length === 0 && (
        <div className="rounded-3xl border border-dashed border-gray-300 bg-white py-16 text-center">
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-gray-50 text-gray-400">
            <Icons.Package className="h-10 w-10" />
          </div>
          <h3 className="text-xl font-bold text-gray-600">Sin productos registrados</h3>
          <p className="mb-6 text-gray-500">Comienza a agregar productos.</p>
        </div>
      )}

      {/* Product Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {productsWithStock.map((product) => (
          <div
            key={product.id}
            className="group overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-sm transition-all hover:shadow-md"
          >
            {/* Image / Placeholder */}
            <div className="relative h-48 bg-gray-100">
              {product.image_url ? (
                <img
                  src={product.image_url}
                  alt={product.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-gray-300">
                  <Icons.ShoppingBag className="h-12 w-12" />
                </div>
              )}
              <span className="absolute right-3 top-3 rounded-lg bg-white/90 px-2 py-1 text-xs font-bold uppercase tracking-wider text-gray-600 backdrop-blur">
                {product.category}
              </span>
            </div>

            <div className="p-5">
              <div className="mb-2 flex items-start justify-between">
                <h2 className="text-lg font-bold leading-tight text-[var(--text-primary)]">
                  {product.name}
                </h2>
                <span className="font-heading text-lg font-black text-[var(--primary)]">
                  ${product.price}
                </span>
              </div>

              <div className="mb-4 flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                <Icons.Package className="h-4 w-4" />
                <span>
                  Stock:{' '}
                  <span className={product.stock < 5 ? 'font-bold text-red-500' : 'font-bold'}>
                    {product.stock}
                  </span>{' '}
                  u.
                </span>
              </div>

              <div className="flex gap-2">
                <Link
                  href={`/${clinic}/portal/products/${product.id}`}
                  className="flex-1 rounded-xl bg-gray-50 py-2 text-center text-sm font-bold text-gray-600 transition-colors hover:bg-gray-100"
                >
                  Editar
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
