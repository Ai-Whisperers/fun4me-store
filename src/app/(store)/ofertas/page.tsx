import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { ProductCard } from '@/components/store/product-card';
import { Tag } from 'lucide-react';
import type { ExtendedProduct } from '@/types/database';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Ofertas',
  description:
    'Aprovecha las mejores ofertas y descuentos en productos intimos en Fun4Me Store. Envio discreto en todo Paraguay.',
  openGraph: {
    title: 'Ofertas | Fun4Me Store',
    description:
      'Descuentos exclusivos en productos intimos. Aprovecha nuestras ofertas con envio discreto en todo Paraguay.',
    url: 'https://fun4me.sunstein.cloud/ofertas',
  },
};

export default async function OfertasPage() {
  const supabase = await createClient();

  const { data: products } = await supabase
    .from('products')
    .select('*, categories(slug)')
    .eq('is_active', true)
    .not('compare_at_price', 'is', null)
    .gt('compare_at_price', 0)
    .order('created_at', { ascending: false });

  // Filter to only products where compare_at_price > price
  const onSale = (
    (products || []) as unknown as (ExtendedProduct & { categories: { slug: string } | null })[]
  ).filter((p) => p.compare_at_price && p.compare_at_price > p.price);

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Breadcrumbs */}
      <nav className="mb-6 flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/" className="hover:text-foreground">
          Inicio
        </Link>
        <span>/</span>
        <span className="text-foreground">Ofertas</span>
      </nav>

      <div className="mb-8">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-red-500 to-orange-500">
            <Tag className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Ofertas</h1>
            <p className="text-muted-foreground">
              Los mejores descuentos en productos seleccionados
            </p>
          </div>
        </div>
        <p className="mt-4 text-sm text-muted-foreground">
          {onSale.length} {onSale.length === 1 ? 'producto en oferta' : 'productos en oferta'}
        </p>
      </div>

      {/* Product Grid */}
      {onSale.length > 0 ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {onSale.map((product) => (
            <ProductCard
              key={product.id}
              product={{
                ...product,
                category_slug: product.categories?.slug || undefined,
              }}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Tag className="mx-auto mb-4 h-16 w-16 text-muted-foreground/30" />
          <h2 className="text-xl font-semibold">No hay ofertas en este momento</h2>
          <p className="mt-2 max-w-md text-muted-foreground">
            Estamos preparando nuevas ofertas para vos. Volve pronto o explora nuestras categorias.
          </p>
          <Link
            href="/"
            className="mt-6 inline-flex items-center rounded-full bg-gradient-to-r from-rose-500 to-purple-600 px-6 py-2 text-sm font-medium text-white hover:from-rose-600 hover:to-purple-700"
          >
            Explorar la Tienda
          </Link>
        </div>
      )}
    </div>
  );
}
