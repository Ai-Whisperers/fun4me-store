import { notFound } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { formatPrice } from '@/lib/utils/format';
import { Badge } from '@/components/ui/badge';
import { ProductCard } from '@/components/store/product-card';
import { ProductActions } from './product-actions';
import { ProductTabs } from './product-tabs';
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

const LEVEL_BADGES: Record<string, { emoji: string; label: string; color: string }> = {
  principiante: { emoji: '🟢', label: 'Principiante', color: 'bg-green-100 text-green-800' },
  intermedio: { emoji: '🟡', label: 'Intermedio', color: 'bg-yellow-100 text-yellow-800' },
  avanzado: { emoji: '🔴', label: 'Avanzado', color: 'bg-red-100 text-red-800' },
};

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: product } = await supabase
    .from('products')
    .select('name, description, price')
    .eq('slug', slug)
    .single();

  if (!product) return { title: 'Producto no encontrado' };
  const p = product as unknown as { name: string; description: string | null; price: number };

  return {
    title: `${p.name} | Fun4Me Store`,
    description: p.description || `Comprá ${p.name} en Fun4Me Store`,
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

  // JSON-LD
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: p.name,
    description: p.description,
    offers: {
      '@type': 'Offer',
      price: p.price,
      priceCurrency: 'PYG',
      availability: p.stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
    },
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
          <div className={`aspect-square rounded-2xl bg-gradient-to-br ${gradient} flex items-center justify-center`}>
            <span className="text-9xl opacity-30">🛍️</span>
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
                  {level.emoji} {level.label}
                </Badge>
              )}
              {p.is_body_safe && (
                <Badge variant="outline" className="bg-green-50 text-green-700">
                  ✅ Body Safe
                </Badge>
              )}
              {p.material && (
                <Badge variant="outline">
                  🧪 {p.material}
                </Badge>
              )}
              {p.stock > 0 ? (
                <Badge variant="outline" className="bg-green-50 text-green-700">
                  ✅ En Stock
                </Badge>
              ) : (
                <Badge variant="outline" className="bg-red-50 text-red-700">
                  ❌ Agotado
                </Badge>
              )}
            </div>

            {/* Short description */}
            {p.short_description && (
              <p className="text-muted-foreground">{p.short_description}</p>
            )}

            {/* Actions */}
            <ProductActions product={p} />

            {/* Trust badges inline */}
            <div className="grid grid-cols-2 gap-3 rounded-xl border p-4">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>📦</span> Envío discreto
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>🔒</span> Pago seguro
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>🇵🇾</span> Empresa paraguaya
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>✅</span> Garantía
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
            <h2 className="mb-6 text-2xl font-bold">Productos Relacionados</h2>
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
      </div>
    </>
  );
}
