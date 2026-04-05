import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { ProductCard } from '@/components/store/product-card';
import { Pagination } from '@/components/store/pagination';
import { SortSelect } from '@/components/store/sort-select';
import { Search } from 'lucide-react';
import type { ExtendedProduct } from '@/types/database';
import type { Metadata } from 'next';

const PAGE_SIZE = 12;

interface Props {
  searchParams: Promise<{ q?: string; sort?: string; page?: string }>;
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const sp = await searchParams;
  return {
    title: sp.q ? `Buscar: ${sp.q}` : 'Buscar Productos',
    description: sp.q
      ? `Resultados de busqueda para "${sp.q}" en Fun4Me Store.`
      : 'Busca productos intimos y de bienestar en Fun4Me Store.',
    robots: { index: false, follow: true },
  };
}

export default async function SearchPage({ searchParams }: Props) {
  const sp = await searchParams;
  const query = sp.q?.trim() || '';
  const supabase = await createClient();

  let products: (ExtendedProduct & { categories: { slug: string } | null })[] = [];
  let total = 0;
  const currentPage = Math.max(1, parseInt(sp.page || '1', 10));

  if (query) {
    // Count total results
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { count } = await (supabase as any)
      .from('products')
      .select('id', { count: 'exact', head: true })
      .eq('is_active', true)
      .or(`name.ilike.%${query}%,description.ilike.%${query}%`);

    total = count || 0;

    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    const safePage = Math.min(currentPage, totalPages);
    const from = (safePage - 1) * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    let dbQuery = supabase
      .from('products')
      .select('*, categories(slug)')
      .eq('is_active', true)
      .or(`name.ilike.%${query}%,description.ilike.%${query}%`);

    switch (sp.sort) {
      case 'price-asc':
        dbQuery = dbQuery.order('price', { ascending: true });
        break;
      case 'price-desc':
        dbQuery = dbQuery.order('price', { ascending: false });
        break;
      case 'newest':
        dbQuery = dbQuery.order('created_at', { ascending: false });
        break;
      case 'name':
        dbQuery = dbQuery.order('name', { ascending: true });
        break;
      default:
        dbQuery = dbQuery.order('is_featured', { ascending: false });
    }

    dbQuery = dbQuery.range(from, to);

    const { data } = await dbQuery;
    products = (data || []) as unknown as (ExtendedProduct & { categories: { slug: string } | null })[];
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);

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
          {total} {total === 1 ? 'resultado encontrado' : 'resultados encontrados'}
        </p>
      )}

      {query && products.length > 0 && (
        <>
          <div className="mb-4 flex justify-end">
            <SortSelect />
          </div>
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
          <Pagination
            currentPage={safePage}
            totalPages={totalPages}
            totalItems={total}
            pageSize={PAGE_SIZE}
          />
        </>
      )}

      {query && products.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Search className="mx-auto mb-4 h-16 w-16 text-muted-foreground/30" />
          <h2 className="text-xl font-semibold">No encontramos resultados</h2>
          <p className="mt-2 max-w-md text-muted-foreground">
            No encontramos productos para &ldquo;{query}&rdquo;. Proba con otras palabras o explora nuestras categorias.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <Link href="/categoria/vibradores" className="rounded-full border px-4 py-2 text-sm hover:bg-muted">
              Vibradores
            </Link>
            <Link href="/categoria/lubricantes" className="rounded-full border px-4 py-2 text-sm hover:bg-muted">
              Lubricantes
            </Link>
            <Link href="/categoria/lenceria" className="rounded-full border px-4 py-2 text-sm hover:bg-muted">
              Lenceria
            </Link>
            <Link href="/categoria/juegos-de-pareja" className="rounded-full border px-4 py-2 text-sm hover:bg-muted">
              Juegos de Pareja
            </Link>
          </div>
        </div>
      )}

      {!query && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Search className="mx-auto mb-4 h-16 w-16 text-muted-foreground/30" />
          <h2 className="text-xl font-semibold">Que estas buscando?</h2>
          <p className="mt-2 text-muted-foreground">
            Usá la barra de búsqueda para encontrar productos.
          </p>
        </div>
      )}
    </div>
  );
}
