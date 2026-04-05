import Link from 'next/link';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/server';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { TrustBadges } from '@/components/store/trust-badges';
import { Newsletter } from '@/components/store/newsletter';
import { ProductCard } from '@/components/store/product-card';
import { generateWhatsAppLink } from '@/lib/utils/whatsapp';
import { CATEGORY_IMAGES, KINK_IMAGES, HERO_IMAGE } from '@/lib/images';
import type { ExtendedProduct, ExtendedCategory, KinkCategory } from '@/types/database';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Fun4Me Store | Tienda Intima en Paraguay',
  description:
    'Tu tienda online de productos intimos y de bienestar en Asuncion, Paraguay. Envio discreto a todo el pais. Vibradores, lubricantes, lenceria y mas.',
  openGraph: {
    title: 'Fun4Me Store | Tienda Intima en Paraguay',
    description:
      'Productos intimos con envio discreto en todo Paraguay. Explora vibradores, lubricantes, lenceria y mas.',
    url: 'https://fun4me.sunstein.cloud',
  },
};

export default async function HomePage() {
  const supabase = await createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any;

  const [categoriesRes, kinksRes, featuredRes] = await Promise.all([
    supabase.from('categories').select('*').eq('is_active', true).order('sort_order'),
    sb.from('kink_categories').select('*').eq('is_active', true).order('sort_order'),
    supabase.from('products').select('*, categories(slug)').eq('is_active', true).eq('is_featured', true).limit(8),
  ]);

  const categories = (categoriesRes.data || []) as ExtendedCategory[];
  const kinks = (kinksRes.data || []) as KinkCategory[];
  const featured = (featuredRes.data || []) as (ExtendedProduct & { categories: { slug: string } | null })[];

  const whatsappLink = generateWhatsAppLink('¡Hola! Me interesa saber más sobre Fun4Me Store.');

  return (
    <div>
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-rose-500 via-pink-500 to-purple-600 py-20 sm:py-32">
        <div className="absolute inset-0">
          <Image
            src={HERO_IMAGE}
            alt="Fun4Me Store"
            fill
            className="object-cover opacity-20"
            priority
          />
        </div>
        <div className="container relative mx-auto px-4 text-center">
          <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl">
            Tu espacio seguro para explorar
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-white/80 sm:text-xl">
            Productos de bienestar íntimo con envío discreto en todo Paraguay
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link href="#categorias">
              <Button size="lg" className="bg-white text-rose-600 hover:bg-white/90">
                Explorar Tienda
              </Button>
            </Link>
            <a href={whatsappLink} target="_blank" rel="noopener noreferrer">
              <Button size="lg" variant="outline" className="border-white/30 text-white hover:bg-white/10">
                Consultar por WhatsApp
              </Button>
            </a>
          </div>
        </div>
      </section>

      {/* Categories Grid */}
      <section id="categorias" className="py-16">
        <div className="container mx-auto px-4">
          <h2 className="mb-2 text-center text-2xl font-bold sm:text-3xl">
            Explorá por Categoría
          </h2>
          <p className="mb-8 text-center text-muted-foreground">
            Encontrá exactamente lo que buscás
          </p>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
            {categories.map((cat) => (
              <Link key={cat.id} href={`/categoria/${cat.slug}`}>
                <Card className="group cursor-pointer overflow-hidden transition-all hover:ring-2 hover:ring-rose-300">
                  <div className="relative aspect-square overflow-hidden">
                    {CATEGORY_IMAGES[cat.slug] ? (
                      <Image
                        src={CATEGORY_IMAGES[cat.slug]}
                        alt={cat.name}
                        fill
                        loading="lazy"
                        sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, 25vw"
                        className="object-cover transition-transform group-hover:scale-105"
                      />
                    ) : (
                      <div className="h-full w-full bg-gradient-to-br from-rose-50 to-purple-50" />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                    <div className="absolute bottom-0 left-0 right-0 p-3 text-white">
                      <h3 className="text-center text-sm font-semibold">{cat.name}</h3>
                      {cat.description && (
                        <p className="mt-1 line-clamp-2 text-center text-xs text-white/80">
                          {cat.description}
                        </p>
                      )}
                    </div>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Kink Section */}
      <section id="kinks" className="bg-muted/30 py-16">
        <div className="container mx-auto px-4">
          <h2 className="mb-2 text-center text-2xl font-bold sm:text-3xl">
            Explora por Kink
          </h2>
          <p className="mb-8 text-center text-muted-foreground">
            Descubrí productos según tus fantasías
          </p>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            {kinks.map((kink) => (
              <Link key={kink.id} href={`/kink/${kink.slug}`}>
                <Card className="group cursor-pointer overflow-hidden transition-all hover:ring-2 hover:ring-orange-300">
                  <div className="relative aspect-[4/3] overflow-hidden">
                    {KINK_IMAGES[kink.slug] ? (
                      <Image
                        src={KINK_IMAGES[kink.slug]}
                        alt={kink.name}
                        fill
                        loading="lazy"
                        sizes="(max-width: 640px) 50vw, 33vw"
                        className="object-cover transition-transform group-hover:scale-105"
                      />
                    ) : (
                      <div className="h-full w-full bg-gradient-to-br from-orange-50 to-rose-50" />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                    <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
                      <h3 className="text-center text-sm font-semibold">{kink.name}</h3>
                      {kink.description && (
                        <p className="mt-1 line-clamp-2 text-center text-xs text-white/80">
                          {kink.description}
                        </p>
                      )}
                    </div>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Bestsellers */}
      <section id="ofertas" className="py-16">
        <div className="container mx-auto px-4">
          <h2 className="mb-2 text-center text-2xl font-bold sm:text-3xl">
            Los Mas Vendidos
          </h2>
          <p className="mb-8 text-center text-muted-foreground">
            Los favoritos de nuestros clientes
          </p>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {featured.map((product) => (
              <ProductCard
                key={product.id}
                product={{
                  ...product,
                  category_slug: product.categories?.slug || undefined,
                }}
              />
            ))}
          </div>
          {featured.length === 0 && (
            <p className="text-center text-muted-foreground">Productos destacados próximamente</p>
          )}
        </div>
      </section>

      {/* Trust Badges */}
      <TrustBadges />

      {/* Newsletter */}
      <Newsletter />
    </div>
  );
}
