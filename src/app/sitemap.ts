import { MetadataRoute } from 'next';
import { createClient } from '@/lib/supabase/server';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://fun4me.sunstein.cloud';
  const supabase = await createClient();

  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: `${baseUrl}/ofertas`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/buscar`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.3,
    },
  ];

  // Categories
  const { data: categoriesRaw } = await supabase
    .from('categories')
    .select('slug, created_at')
    .eq('is_active', true);

  const categories = (categoriesRaw || []) as unknown as { slug: string; created_at: string }[];

  const categoryPages: MetadataRoute.Sitemap = categories.map((cat) => ({
    url: `${baseUrl}/categoria/${cat.slug}`,
    lastModified: new Date(cat.created_at),
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }));

  // Products
  const { data: productsRaw } = await supabase
    .from('products')
    .select('slug, updated_at')
    .eq('is_active', true);

  const products = (productsRaw || []) as unknown as { slug: string; updated_at: string }[];

  const productPages: MetadataRoute.Sitemap = products.map((product) => ({
    url: `${baseUrl}/producto/${product.slug}`,
    lastModified: new Date(product.updated_at),
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }));

  // Kink categories (untyped table)
  let kinkPages: MetadataRoute.Sitemap = [];
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: kinksRaw } = await (supabase as any)
      .from('kink_categories')
      .select('slug, created_at')
      .eq('is_active', true);

    const kinks = (kinksRaw || []) as { slug: string; created_at: string }[];

    kinkPages = kinks.map((kink) => ({
      url: `${baseUrl}/kink/${kink.slug}`,
      lastModified: new Date(kink.created_at),
      changeFrequency: 'weekly' as const,
      priority: 0.6,
    }));
  } catch {
    // kink_categories table may not exist
  }

  return [...staticPages, ...categoryPages, ...productPages, ...kinkPages];
}
