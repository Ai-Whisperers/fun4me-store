import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { ProductCard } from '@/components/store/product-card';
import type { ExtendedProduct } from '@/types/database';
import type { Metadata } from 'next';

interface Props {
  searchParams: Promise<{ q?: string }>;
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const sp = await searchParams;
  return {
    title: sp.q ? `Buscar: ${sp.q} | Fun4Me Store` : 'Buscar | Fun4Me Store',
  };
}

export default async function SearchPage({ searchParams }: Props) {
  const sp = await searchParams;
  const query = sp.q?.trim() || '';
  const supabase = await createClient();

  let products: (ExtendedProduct & { categories: { slug: string } | null })[] = [];

  if (query) {
    const { data } = await supabase
      .from('products')
      .select('*, categories(slug)')
      .eq('is_active', true)
      .or(`name.ilike.%${query}%,description.ilike.%${query}%`)
      .order('is_featured', { ascending: false })
      .limit(24);

    products = (data || []) as unknown as (ExtendedProduct & { categories: { slug: string } | null })[];
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Breadcrumbs */}
      <nav className="mb-6 flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/" className="hover:text-foreground">Inicio</Link>
        <span>/</span>
        <span className="text-foreground">Buscar</span>
      </nav>

      <h1 className="mb-2 text-3xl font-bold">
        {query ? `Resultados para "${query}"` : 'Buscar Productos'}
      </h1>
      {query && (
        <p className="mb-8 text-muted-foreground">
          {products.length} {products.length === 1 ? 'resultado encontrado' : 'resultados encontrados'}
        </p>
      )}

      {query && products.length > 0 && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {products.map((product) => (
            <ProductCard
              key={product.id}
              product={{
                ...product,
                category_slug: product.categories?.slug || undefined,
              }}
            />
          ))}
        </div>
      )}

      {query && products.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <span className="mb-4 text-6xl">🔍</span>
          <h2 className="text-xl font-semibold">No encontramos resultados</h2>
          <p className="mt-2 max-w-md text-muted-foreground">
            No encontramos productos para &ldquo;{query}&rdquo;. Probá con otras palabras o explorá nuestras categorías.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <Link href="/categoria/vibradores" className="rounded-full border px-4 py-2 text-sm hover:bg-muted">
              💜 Vibradores
            </Link>
            <Link href="/categoria/lubricantes" className="rounded-full border px-4 py-2 text-sm hover:bg-muted">
              💧 Lubricantes
            </Link>
            <Link href="/categoria/lenceria" className="rounded-full border px-4 py-2 text-sm hover:bg-muted">
              👙 Lencería
            </Link>
            <Link href="/categoria/juegos-de-pareja" className="rounded-full border px-4 py-2 text-sm hover:bg-muted">
              🎲 Juegos de Pareja
            </Link>
          </div>
        </div>
      )}

      {!query && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <span className="mb-4 text-6xl">🔍</span>
          <h2 className="text-xl font-semibold">¿Qué estás buscando?</h2>
          <p className="mt-2 text-muted-foreground">
            Usá la barra de búsqueda para encontrar productos.
          </p>
        </div>
      )}
    </div>
  );
}
