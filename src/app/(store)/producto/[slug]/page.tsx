import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/server';
import { formatPrice } from '@/lib/utils/format';
import { Badge } from '@/components/ui/badge';
import { ProductCard } from '@/components/store/product-card';
import { ProductActions } from './product-actions';
import { ProductTabs } from './product-tabs';
import { PRODUCT_PLACEHOLDERS, DEFAULT_PRODUCT_IMAGE } from '@/lib/images';
import type { ExtendedProduct, ExtendedCategory } from '@/types/database';
import type { Metadata } from 'next';

const CATEGORY_GRADIENTS: Record<string, string> = {
  vibradores: 'from-pink-400 to-rose-500',
  dildos: 'from-purple-400 to-purple-600',
  lubricantes: 'from-blue-400 to-cyan-500',
  lenceria: 'from-red-400 to-pink-500',
  'juegos-de-pareja': 'from-amber-400 to-orange-500',
  bdsm: 'from-gray-700 to-gray-900',
  masturbadores: 'from-indigo-400 to-indigo-600',
  accesorios: 'from-teal-400 to-emerald-500',
  default: 'from-rose-400 to-purple-500',
};

const LEVEL_BADGES: Record<string, { label: string; color: string; dot: string }> = {
  principiante: { label: 'Principiante', color: 'bg-green-100 text-green-800', dot: 'bg-green-500' },
  intermedio: { label: 'Intermedio', color: 'bg-yellow-100 text-yellow-800', dot: 'bg-yellow-500' },
  avanzado: { label: 'Avanzado', color: 'bg-red-100 text-red-800', dot: 'bg-red-500' },
};

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: product } = await supabase
    .from('products')
    .select('name, description, price, images')
    .eq('slug', slug)
    .single();

  if (!product) return { title: 'Producto no encontrado' };
  const p = product as unknown as { name: string; description: string | null; price: number; images: string[] };

  const title = p.name;
  const description = p.description || `Compra ${p.name} en Fun4Me Store. Envio discreto en todo Paraguay.`;
  const productUrl = `https://fun4me.sunstein.cloud/producto/${slug}`;

  return {
    title,
    description,
    openGraph: {
      title: `${p.name} | Fun4Me Store`,
      description,
      url: productUrl,
      type: 'website',
      images: p.images?.[0] ? [{ url: p.images[0], alt: p.name }] : undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title: `${p.name} | Fun4Me Store`,
      description,
    },
  };
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: product } = await supabase
    .from('products')
    .select('*, categories(*)')
    .eq('slug', slug)
    .single();

  if (!product) notFound();

  const p = product as unknown as ExtendedProduct & { categories: ExtendedCategory | null };
  const categorySlug = p.categories?.slug || 'default';
  const gradient = CATEGORY_GRADIENTS[categorySlug] || CATEGORY_GRADIENTS.default;
  const level = p.experience_level ? LEVEL_BADGES[p.experience_level.toLowerCase()] : null;
  const hasDiscount = p.compare_at_price && p.compare_at_price > p.price;
  const discountPct = hasDiscount
    ? Math.round(((p.compare_at_price! - p.price) / p.compare_at_price!) * 100)
    : 0;

  // Related products
  const { data: related } = await supabase
    .from('products')
    .select('*, categories(slug)')
    .eq('is_active', true)
    .eq('category_id', p.category_id || '')
    .neq('id', p.id)
    .limit(4);

  const relatedProducts = (related || []) as unknown as (ExtendedProduct & { categories: { slug: string } | null })[];

  // Cross-sell: random products from same category (excluding current + related)
  const excludeIds = [p.id, ...relatedProducts.map((r) => r.id)];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: crossSellData } = await (supabase as any)
    .from('products')
    .select('*, categories(slug)')
    .eq('is_active', true)
    .eq('category_id', p.category_id || '')
    .not('id', 'in', `(${excludeIds.join(',')})`)
    .limit(4);

  const crossSellProducts = (crossSellData || []) as unknown as (ExtendedProduct & { categories: { slug: string } | null })[];

  // JSON-LD Product Schema
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: p.name,
    description: p.description || `${p.name} - disponible en Fun4Me Store`,
    image: p.images?.[0] || undefined,
    url: `https://fun4me.sunstein.cloud/producto/${slug}`,
    brand: {
      '@type': 'Brand',
      name: 'Fun4Me Store',
    },
    ...(p.sku ? { sku: p.sku } : {}),
    ...(p.categories ? { category: p.categories.name } : {}),
    offers: {
      '@type': 'Offer',
      price: p.price,
      priceCurrency: 'PYG',
      availability: p.stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      url: `https://fun4me.sunstein.cloud/producto/${slug}`,
      seller: {
        '@type': 'Organization',
        name: 'Fun4Me Store',
      },
      ...(hasDiscount && p.compare_at_price ? {
        priceValidUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      } : {}),
    },
    ...(p.material ? {
      additionalProperty: [{
        '@type': 'PropertyValue',
        name: 'Material',
        value: p.material,
      }],
    } : {}),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="container mx-auto px-4 py-8">
        {/* Breadcrumbs */}
        <nav className="mb-6 flex items-center gap-2 text-sm text-muted-foreground">
          <Link href="/" className="hover:text-foreground">Inicio</Link>
          <span>/</span>
          {p.categories && (
            <>
              <Link href={`/categoria/${p.categories.slug}`} className="hover:text-foreground">
                {p.categories.name}
              </Link>
              <span>/</span>
            </>
          )}
          <span className="text-foreground line-clamp-1">{p.name}</span>
        </nav>

        <div className="grid gap-8 lg:grid-cols-2">
          {/* Product Image */}
          <div className="relative aspect-square overflow-hidden rounded-2xl">
            <Image
              src={p.images?.[0] || PRODUCT_PLACEHOLDERS[categorySlug] || DEFAULT_PRODUCT_IMAGE}
              alt={p.name}
              fill
              className="object-cover"
              priority
            />
          </div>

          {/* Product Info */}
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold sm:text-3xl">{p.name}</h1>
              {p.categories && (
                <Link href={`/categoria/${p.categories.slug}`}>
                  <Badge variant="secondary" className="mt-2">
                    {p.categories.name}
                  </Badge>
                </Link>
              )}
            </div>

            {/* Price */}
            <div className="flex items-center gap-3">
              <span className="text-3xl font-bold text-rose-600">{formatPrice(p.price)}</span>
              {hasDiscount && (
                <>
                  <span className="text-lg text-muted-foreground line-through">
                    {formatPrice(p.compare_at_price!)}
                  </span>
                  <Badge variant="destructive">-{discountPct}%</Badge>
                </>
              )}
            </div>

            {/* Badges */}
            <div className="flex flex-wrap gap-2">
              {level && (
                <Badge variant="outline" className={level.color}>
                  <span className={`mr-1.5 inline-block h-2 w-2 rounded-full ${level.dot}`} />
                  {level.label}
                </Badge>
              )}
              {p.is_body_safe && (
                <Badge variant="outline" className="bg-green-50 text-green-700">
                  Body Safe
                </Badge>
              )}
              {p.material && (
                <Badge variant="outline">
                  {p.material}
                </Badge>
              )}
              {p.stock > 0 ? (
                <Badge variant="outline" className="bg-green-50 text-green-700">
                  En Stock
                </Badge>
              ) : (
                <Badge variant="outline" className="bg-red-50 text-red-700">
                  Agotado
                </Badge>
              )}
            </div>

            {/* Short description */}
            {p.short_description && (
              <p className="text-muted-foreground">{p.short_description}</p>
            )}

            {/* Stock urgency */}
            {p.stock > 0 && p.stock < 5 && (
              <div className="inline-flex items-center gap-1.5 rounded-full bg-red-100 px-3 py-1 text-sm font-semibold text-red-700">
                🔥 ¡Quedan solo {p.stock}!
              </div>
            )}
            {p.stock === 0 && (
              <div className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1 text-sm font-semibold text-gray-700">
                Agotado
              </div>
            )}

            {/* Actions */}
            <ProductActions product={p} />

            {/* Trust badges inline */}
            <div className="grid grid-cols-2 gap-3 rounded-xl border p-4">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                Envio discreto
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                Pago seguro
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                Empresa paraguaya
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                Garantia
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="mt-12">
          <ProductTabs
            description={p.description}
            specifications={p.specifications || null}
            careInstructions={p.care_instructions || null}
            material={p.material || null}
          />
        </div>

        {/* Related Products */}
        {relatedProducts.length > 0 && (
          <section className="mt-16">
            <h2 className="mb-6 text-2xl font-bold">También te puede gustar</h2>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {relatedProducts.map((rp) => (
                <ProductCard
                  key={rp.id}
                  product={{
                    ...rp,
                    category_slug: rp.categories?.slug || undefined,
                  }}
                />
              ))}
            </div>
          </section>
        )}

        {/* Cross-sell */}
        {crossSellProducts.length > 0 && (
          <section className="mt-16">
            <h2 className="mb-6 text-2xl font-bold">Clientes también compraron</h2>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {crossSellProducts.map((cp) => (
                <ProductCard
                  key={cp.id}
                  product={{
                    ...cp,
                    category_slug: cp.categories?.slug || undefined,
                  }}
                />
              ))}
            </div>
          </section>
        )}
      </div>
    </>
  );
}
