'use client';

import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { ArrowUpDown } from 'lucide-react';

const SORT_OPTIONS = [
  { value: '', label: 'Relevancia' },
  { value: 'price-asc', label: 'Precio: menor a mayor' },
  { value: 'price-desc', label: 'Precio: mayor a menor' },
  { value: 'newest', label: 'Más nuevos' },
  { value: 'name', label: 'Nombre A-Z' },
];

export function SortSelect() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentSort = searchParams.get('sort') || '';

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const params = new URLSearchParams(searchParams.toString());
    const value = e.target.value;
    if (value) {
      params.set('sort', value);
    } else {
      params.delete('sort');
    }
    // Reset to page 1 when changing sort
    params.delete('page');
    const qs = params.toString();
    router.push(`${pathname}${qs ? `?${qs}` : ''}`);
  }

  return (
    <div className="flex items-center gap-2">
      <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
      <select
        value={currentSort}
        onChange={handleChange}
        className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none transition-colors focus:border-ring focus:ring-2 focus:ring-ring/50"
      >
        {SORT_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}
