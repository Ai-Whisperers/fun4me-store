'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface FiltersProps {
  slug: string;
  currentParams: { sort?: string; level?: string; min?: string; max?: string };
}

const PRICE_RANGES = [
  { label: 'Hasta ₲ 100.000', min: '0', max: '100000' },
  { label: '₲ 100.000 - ₲ 300.000', min: '100000', max: '300000' },
  { label: '₲ 300.000 - ₲ 500.000', min: '300000', max: '500000' },
  { label: 'Más de ₲ 500.000', min: '500000', max: '' },
];

const LEVELS = [
  { value: 'principiante', label: 'Principiante' },
  { value: 'intermedio', label: 'Intermedio' },
  { value: 'avanzado', label: 'Avanzado' },
];

const SORT_OPTIONS = [
  { value: '', label: 'Destacados' },
  { value: 'price_asc', label: 'Precio: Menor a Mayor' },
  { value: 'price_desc', label: 'Precio: Mayor a Menor' },
  { value: 'newest', label: 'Más Recientes' },
];

export function CategoryFilters({ slug, currentParams }: FiltersProps) {
  const router = useRouter();

  function applyFilter(key: string, value: string) {
    const params = new URLSearchParams();
    const current = { ...currentParams, [key]: value };

    // Handle price ranges
    if (key === 'price') {
      const range = PRICE_RANGES.find((r) => `${r.min}-${r.max}` === value);
      if (range) {
        if (range.min) params.set('min', range.min);
        if (range.max) params.set('max', range.max);
      }
      if (current.sort) params.set('sort', current.sort);
      if (current.level) params.set('level', current.level);
    } else {
      if (value) params.set(key, value);
      if (key !== 'sort' && current.sort) params.set('sort', current.sort);
      if (key !== 'level' && current.level) params.set('level', current.level);
      if (key !== 'price' && current.min) params.set('min', current.min);
      if (key !== 'price' && current.max) params.set('max', current.max);
    }

    const qs = params.toString();
    router.push(`/categoria/${slug}${qs ? `?${qs}` : ''}`);
  }

  function clearFilters() {
    router.push(`/categoria/${slug}`);
  }

  const hasFilters = currentParams.sort || currentParams.level || currentParams.min || currentParams.max;

  return (
    <div className="space-y-4">
      {/* Sort */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Ordenar</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          {SORT_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => applyFilter('sort', opt.value)}
              className={`block w-full rounded-md px-3 py-1.5 text-left text-sm transition-colors hover:bg-muted ${
                currentParams.sort === opt.value || (!currentParams.sort && !opt.value)
                  ? 'bg-rose-50 font-medium text-rose-600'
                  : ''
              }`}
            >
              {opt.label}
            </button>
          ))}
        </CardContent>
      </Card>

      {/* Price Range */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Precio</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          {PRICE_RANGES.map((range) => (
            <button
              key={range.label}
              onClick={() => applyFilter('price', `${range.min}-${range.max}`)}
              className={`block w-full rounded-md px-3 py-1.5 text-left text-sm transition-colors hover:bg-muted ${
                currentParams.min === range.min && currentParams.max === range.max
                  ? 'bg-rose-50 font-medium text-rose-600'
                  : ''
              }`}
            >
              {range.label}
            </button>
          ))}
        </CardContent>
      </Card>

      {/* Experience Level */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Nivel de Experiencia</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          {LEVELS.map((level) => (
            <button
              key={level.value}
              onClick={() => applyFilter('level', level.value)}
              className={`block w-full rounded-md px-3 py-1.5 text-left text-sm transition-colors hover:bg-muted ${
                currentParams.level === level.value ? 'bg-rose-50 font-medium text-rose-600' : ''
              }`}
            >
              {level.label}
            </button>
          ))}
        </CardContent>
      </Card>

      {hasFilters && (
        <Button variant="outline" onClick={clearFilters} className="w-full">
          Limpiar Filtros
        </Button>
      )}
    </div>
  );
}
