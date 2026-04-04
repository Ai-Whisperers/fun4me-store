import { notFound } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { ProductCard } from '@/components/store/product-card';
import type { ExtendedProduct, ExtendedCategory } from '@/types/database';
import type { Metadata } from 'next';
import { CategoryFilters } from './filters';

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ sort?: string; level?: string; min?: string; max?: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: category } = await supabase
    .from('categories')
    .select('name, description')
    .eq('slug', slug)
    .single();

  if (!category) return { title: 'Categoría no encontrada' };
  const cat = category as unknown as { name: string; description: string | null };

  const description = cat.description || `Explora nuestra coleccion de ${cat.name} en Fun4Me Store. Envio discreto en todo Paraguay.`;

  return {
    title: cat.name,
    description,
    openGraph: {
      title: `${cat.name} | Fun4Me Store`,
      description,
      url: `https://fun4me.sunstein.cloud/categoria/${slug}`,
    },
  };
}

export default async function CategoryPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const sp = await searchParams;
  const supabase = await createClient();

  const { data: category } = await supabase
    .from('categories')
    .select('*')
    .eq('slug', slug)
    .single();

  if (!category) notFound();
  const cat = category as unknown as ExtendedCategory;

  let query = supabase
    .from('products')
    .select('*, categories(slug)')
    .eq('category_id', cat.id)
    .eq('is_active', true);

  if (sp.level) {
    query = query.eq('experience_level' as string, sp.level);
  }
  if (sp.min) {
    query = query.gte('price', parseInt(sp.min));
  }
  if (sp.max) {
    query = query.lte('price', parseInt(sp.max));
  }

  switch (sp.sort) {
    case 'price_asc':
      query = query.order('price', { ascending: true });
      break;
    case 'price_desc':
      query = query.order('price', { ascending: false });
      break;
    case 'newest':
      query = query.order('created_at', { ascending: false });
      break;
    default:
      query = query.order('is_featured', { ascending: false }).order('created_at', { ascending: false });
  }

  const { data: products } = await query;
  const items = (products || []) as unknown as (ExtendedProduct & { categories: { slug: string } | null })[];

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Breadcrumbs */}
      <nav className="mb-6 flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/" className="hover:text-foreground">Inicio</Link>
        <span>/</span>
        <span className="text-foreground">{cat.name}</span>
      </nav>

      <div className="mb-8">
        <h1 className="text-3xl font-bold">{cat.name}</h1>
        {cat.description && (
          <p className="mt-2 text-muted-foreground">{cat.description}</p>
        )}
        <p className="mt-1 text-sm text-muted-foreground">{items.length} productos</p>
      </div>

      <div className="flex flex-col gap-8 lg:flex-row">
        {/* Filters Sidebar */}
        <aside className="w-full shrink-0 lg:w-64">
          <CategoryFilters slug={slug} currentParams={sp} />
        </aside>

        {/* Product Grid */}
        <div className="flex-1">
          {items.length > 0 ? (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((product) => (
                <ProductCard
                  key={product.id}
                  product={{
                    ...product,
                    category_slug: product.categories?.slug || slug,
                  }}
                />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <span className="mb-4 text-2xl font-semibold text-muted-foreground">Sin resultados</span>
              <h2 className="text-xl font-semibold">No encontramos productos</h2>
              <p className="mt-2 text-muted-foreground">Intentá con otros filtros o explorá otras categorías.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
