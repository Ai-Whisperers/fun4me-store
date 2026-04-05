'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { CartDrawer } from '@/components/store/cart-drawer';
import { SearchAutocomplete } from '@/components/store/search-autocomplete';
import { generateWhatsAppLink } from '@/lib/utils/whatsapp';
import { Menu, X, ChevronDown } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import type { ExtendedCategory, KinkCategory } from '@/types/database';

export function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const [categories, setCategories] = useState<ExtendedCategory[]>([]);
  const [kinks, setKinks] = useState<KinkCategory[]>([]);

  useEffect(() => {
    const supabase = createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any;
    supabase.from('categories').select('*').eq('is_active', true).order('sort_order').then(({ data }) => {
      if (data) setCategories(data as unknown as ExtendedCategory[]);
    });
    sb.from('kink_categories').select('*').eq('is_active', true).order('sort_order').then(({ data }: { data: KinkCategory[] | null }) => {
      if (data) setKinks(data);
    });
  }, []);

  const whatsappLink = generateWhatsAppLink('¡Hola! Me interesa saber más sobre Fun4Me Store.');

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-14 items-center justify-between gap-4 px-4">
        {/* Logo */}
        <Link href="/" className="flex shrink-0 items-center gap-2">
          <span className="bg-gradient-to-r from-rose-500 to-purple-600 bg-clip-text text-xl font-bold text-transparent">
            Fun4Me
          </span>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden items-center gap-1 md:flex">
          <Link href="/">
            <Button variant="ghost" size="sm">Tienda</Button>
          </Link>
          <div className="relative">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCategoriesOpen(!categoriesOpen)}
              className="gap-1"
            >
              Categorías <ChevronDown className="h-3 w-3" />
            </Button>
            {categoriesOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setCategoriesOpen(false)} />
                <div className="absolute left-0 top-full z-20 mt-1 w-56 rounded-lg border bg-popover p-2 shadow-lg">
                  {categories.map((cat) => (
                    <Link
                      key={cat.id}
                      href={`/categoria/${cat.slug}`}
                      onClick={() => setCategoriesOpen(false)}
                      className="flex items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-muted"
                    >
                      {cat.name}
                    </Link>
                  ))}
                </div>
              </>
            )}
          </div>
          <Link href="/#kinks">
            <Button variant="ghost" size="sm">Por Kink</Button>
          </Link>
          <Link href="/ofertas">
            <Button variant="ghost" size="sm">Ofertas</Button>
          </Link>
        </nav>

        {/* Search Bar */}
        <SearchAutocomplete className="hidden flex-1 max-w-xs md:block" />

        {/* Right Icons */}
        <div className="flex items-center gap-3">
          <a
            href={whatsappLink}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden text-green-500 hover:text-green-600 sm:block"
            aria-label="WhatsApp"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
          </a>
          <CartDrawer />
          {/* Mobile menu */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden"
            aria-label="Menú"
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Nav */}
      {mobileOpen && (
        <div className="border-t bg-background md:hidden">
          <div className="container mx-auto space-y-1 px-4 py-4">
            <div className="mb-4">
              <SearchAutocomplete onNavigate={() => setMobileOpen(false)} />
            </div>
            <Link href="/" onClick={() => setMobileOpen(false)} className="block rounded-md px-3 py-2 text-sm font-medium hover:bg-muted">
              Inicio
            </Link>
            <p className="px-3 pt-3 text-xs font-semibold uppercase text-muted-foreground">Categorías</p>
            {categories.map((cat) => (
              <Link
                key={cat.id}
                href={`/categoria/${cat.slug}`}
                onClick={() => setMobileOpen(false)}
                className="block rounded-md px-3 py-2 text-sm hover:bg-muted"
              >
                {cat.name}
              </Link>
            ))}
            <p className="px-3 pt-3 text-xs font-semibold uppercase text-muted-foreground">Por Kink</p>
            {kinks.map((k) => (
              <Link
                key={k.id}
                href={`/kink/${k.slug}`}
                onClick={() => setMobileOpen(false)}
                className="block rounded-md px-3 py-2 text-sm hover:bg-muted"
              >
                {k.name}
              </Link>
            ))}
          </div>
        </div>
      )}
    </header>
  );
}
