import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/server';
import { ProductCard } from '@/components/store/product-card';
import { KINK_IMAGES } from '@/lib/images';
import { Search } from 'lucide-react';
import type { Product, KinkCategory } from '@/types/database';
import type { Metadata } from 'next';

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: kinkData } = await (supabase as any)
    .from('kink_categories')
    .select('name, description')
    .eq('slug', slug)
    .single();

  if (!kinkData) return { title: 'Kink no encontrado' };
  const k = kinkData as { name: string; description: string | null };

  const description = k.description || `Explora productos de ${k.name} en Fun4Me Store. Envio discreto en todo Paraguay.`;

  return {
    title: k.name,
    description,
    openGraph: {
      title: `${k.name} | Fun4Me Store`,
      description,
      url: `https://fun4me.sunstein.cloud/kink/${slug}`,
    },
  };
}

export default async function KinkPage({ params }: Props) {
  const { slug } = await params;
  const supabase = await createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any;

  const { data: kink } = await sb
    .from('kink_categories')
    .select('*')
    .eq('slug', slug)
    .single();

  if (!kink) notFound();
  const kinkCat = kink as KinkCategory;

  // Get products associated with this kink through product_kinks
  const { data: productKinks } = await sb
    .from('product_kinks')
    .select('product_id')
    .eq('kink_category_id', kinkCat.id);

  const productIds = (productKinks || []).map((pk: { product_id: string }) => pk.product_id);

  let products: (Product & { categories: { slug: string } | null })[] = [];
  if (productIds.length > 0) {
    const { data } = await supabase
      .from('products')
      .select('*, categories(slug)')
      .in('id', productIds)
      .eq('is_active', true)
      .order('is_featured', { ascending: false });
    products = (data || []) as (Product & { categories: { slug: string } | null })[];
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Breadcrumbs */}
      <nav className="mb-6 flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/" className="hover:text-foreground">Inicio</Link>
        <span>/</span>
        <Link href="/#kinks" className="hover:text-foreground">Kinks</Link>
        <span>/</span>
        <span className="text-foreground">{kinkCat.name}</span>
      </nav>

      {/* Kink Header */}
      <div className="relative mb-10 overflow-hidden rounded-2xl bg-gradient-to-r from-orange-50 to-rose-50 p-8">
        {KINK_IMAGES[kinkCat.slug] && (
          <div className="absolute inset-0">
            <Image
              src={KINK_IMAGES[kinkCat.slug]}
              alt={kinkCat.name}
              fill
              className="object-cover opacity-10"
            />
          </div>
        )}
        <div className="relative">
          <h1 className="text-3xl font-bold">{kinkCat.name}</h1>
          {kinkCat.description && (
            <p className="mt-4 max-w-2xl text-muted-foreground leading-relaxed">
              {kinkCat.description}
            </p>
          )}
          <p className="mt-3 text-sm text-muted-foreground">
            Recorda que la comunicacion con tu pareja es clave. Todos los productos son seleccionados pensando en tu seguridad y bienestar.
          </p>
        </div>
      </div>

      <p className="mb-6 text-sm text-muted-foreground">{products.length} productos</p>

      {/* Product Grid */}
      {products.length > 0 ? (
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
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Search className="mx-auto mb-4 h-16 w-16 text-muted-foreground/30" />
          <h2 className="text-xl font-semibold">Proximamente</h2>
          <p className="mt-2 text-muted-foreground">
            Estamos agregando productos para esta categoría. ¡Volvé pronto!
          </p>
        </div>
      )}
    </div>
  );
}
