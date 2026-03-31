import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Heart, ShoppingBag, ArrowLeft, Package } from 'lucide-react'
import { WishlistClient } from './client'

interface WishlistPageProps {
  params: Promise<{ clinic: string }>
}

export default async function WishlistPage({ params }: WishlistPageProps) {
  const supabase = await createClient()
  const { clinic } = await params

  // Auth Check
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    redirect(`/${clinic}/portal/login?returnTo=/${clinic}/portal/wishlist`)
  }

  // Get user's profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('tenant_id')
    .eq('id', user.id)
    .single()

  if (!profile) {
    redirect(`/${clinic}/portal/login`)
  }

  // Fetch wishlist items with product details
  const { data: wishlistItems, error } = await supabase
    .from('store_wishlist')
    .select(
      `
      id,
      product_id,
      created_at,
      store_products (
        id,
        name,
        sku,
        short_description,
        base_price,
        sale_price,
        image_url,
        is_active,
        store_inventory (
          stock_quantity
        )
      )
    `
    )
    .eq('customer_id', user.id)
    .eq('tenant_id', profile.tenant_id)
    .order('created_at', { ascending: false })

  // Transform data - handle Supabase join types safely
  const products =
    wishlistItems?.map((item) => {
      // Supabase may return single object or array depending on relation
      const rawProduct = item.store_products
      const product = Array.isArray(rawProduct) ? rawProduct[0] : rawProduct

      // Get stock from inventory (also may be array)
      const rawInventory = product?.store_inventory
      const inventory = Array.isArray(rawInventory) ? rawInventory[0] : rawInventory
      const stockQuantity = (inventory as { stock_quantity?: number } | null)?.stock_quantity ?? 0

      return {
        id: item.product_id,
        wishlistId: item.id,
        name: product?.name ?? 'Producto no disponible',
        sku: product?.sku ?? '',
        description: product?.short_description ?? '',
        price: product?.sale_price ?? product?.base_price ?? 0,
        originalPrice: product?.sale_price ? product.base_price : undefined,
        imageUrl: product?.image_url ?? null,
        isActive: product?.is_active ?? false,
        inStock: stockQuantity > 0,
        stockQuantity,
        addedAt: item.created_at,
      }
    }) ?? []

  return (
    <div className="container mx-auto max-w-6xl px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <Link
          href={`/${clinic}/store`}
          className="mb-4 inline-flex items-center gap-2 text-[var(--text-secondary)] transition hover:text-[var(--primary)]"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver a la tienda
        </Link>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-pink-100">
              <Heart className="h-6 w-6 text-pink-500" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-[var(--text-primary)]">Mi Lista de Deseos</h1>
              <p className="text-[var(--text-muted)]">
                {products.length}{' '}
                {products.length === 1 ? 'producto guardado' : 'productos guardados'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      {products.length === 0 ? (
        <div className="py-16 text-center">
          <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-gray-100">
            <ShoppingBag className="h-12 w-12 text-gray-400" />
          </div>
          <h2 className="mb-2 text-xl font-bold text-[var(--text-primary)]">
            Tu lista de deseos está vacía
          </h2>
          <p className="mx-auto mb-6 max-w-md text-[var(--text-muted)]">
            Agrega productos a tu lista de deseos para guardarlos y comprarlos más tarde.
          </p>
          <Link
            href={`/${clinic}/store`}
            className="inline-flex items-center gap-2 rounded-xl bg-[var(--primary)] px-6 py-3 font-bold text-white transition hover:brightness-110"
          >
            <Package className="h-5 w-5" />
            Explorar Tienda
          </Link>
        </div>
      ) : (
        <WishlistClient clinic={clinic} initialProducts={products} />
      )}
    </div>
  )
}
