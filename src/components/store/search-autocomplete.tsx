'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { formatPrice } from '@/lib/utils/format';
import { DEFAULT_PRODUCT_IMAGE } from '@/lib/images';

interface Suggestion {
  id: string;
  name: string;
  slug: string;
  price: number;
  images: string[] | null;
}

interface SearchAutocompleteProps {
  onNavigate?: () => void;
  className?: string;
}

export function SearchAutocomplete({ onNavigate, className }: SearchAutocompleteProps) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchSuggestions = useCallback(async (searchTerm: string) => {
    if (!searchTerm.trim()) {
      setSuggestions([]);
      setShowDropdown(false);
      return;
    }

    setIsLoading(true);
    try {
      const supabase = createClient();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (supabase as any)
        .from('products')
        .select('id, name, slug, price, images')
        .eq('is_active', true)
        .ilike('name', `%${searchTerm}%`)
        .limit(6);

      const results = (data || []) as Suggestion[];
      setSuggestions(results);
      setShowDropdown(results.length > 0);
    } catch {
      setSuggestions([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      fetchSuggestions(query);
    }, 300);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [query, fetchSuggestions]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/buscar?q=${encodeURIComponent(query.trim())}`);
      setQuery('');
      setShowDropdown(false);
      setSuggestions([]);
      onNavigate?.();
    }
  }

  function handleSuggestionClick() {
    setQuery('');
    setShowDropdown(false);
    setSuggestions([]);
    onNavigate?.();
  }

  return (
    <div ref={containerRef} className={`relative ${className || ''}`}>
      <form onSubmit={handleSubmit}>
        <div className="relative w-full">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Buscar productos..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => {
              if (suggestions.length > 0) setShowDropdown(true);
            }}
            className="pl-8"
          />
        </div>
      </form>

      {showDropdown && (
        <div className="absolute left-0 top-full z-50 mt-1 w-full rounded-lg border bg-popover shadow-lg">
          {isLoading ? (
            <div className="px-4 py-3 text-sm text-muted-foreground">Buscando...</div>
          ) : (
            suggestions.map((s) => (
              <Link
                key={s.id}
                href={`/producto/${s.slug}`}
                onClick={handleSuggestionClick}
                className="flex items-center gap-3 px-3 py-2 transition-colors hover:bg-muted first:rounded-t-lg last:rounded-b-lg"
              >
                <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-md">
                  <Image
                    src={s.images?.[0] || DEFAULT_PRODUCT_IMAGE}
                    alt={s.name}
                    fill
                    className="object-cover"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{s.name}</p>
                  <p className="text-xs font-semibold text-rose-600">{formatPrice(s.price)}</p>
                </div>
              </Link>
            ))
          )}
        </div>
      )}
    </div>
  );
}
