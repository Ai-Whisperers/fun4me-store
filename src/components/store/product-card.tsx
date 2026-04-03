'use client';

import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatPrice } from '@/lib/utils/format';
import { useCartStore } from '@/lib/store/cart';
import { toast } from 'sonner';

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

const LEVEL_BADGES: Record<string, { emoji: string; label: string }> = {
  principiante: { emoji: '🟢', label: 'Principiante' },
  intermedio: { emoji: '🟡', label: 'Intermedio' },
  avanzado: { emoji: '🔴', label: 'Avanzado' },
};

interface ProductCardProps {
  product: {
    id: string;
    name: string;
    slug: string;
    price: number;
    compare_at_price: number | null;
    is_featured: boolean;
    experience_level?: string | null;
    category_slug?: string;
  };
}

export function ProductCard({ product }: ProductCardProps) {
  const addItem = useCartStore((s) => s.addItem);
  const gradient = CATEGORY_GRADIENTS[product.category_slug || 'default'] || CATEGORY_GRADIENTS.default;
  const level = product.experience_level
    ? LEVEL_BADGES[product.experience_level.toLowerCase()]
    : null;
  const hasDiscount = product.compare_at_price && product.compare_at_price > product.price;
  const discountPct = hasDiscount
    ? Math.round(((product.compare_at_price! - product.price) / product.compare_at_price!) * 100)
    : 0;

  function handleAddToCart(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    addItem({
      id: product.id,
      name: product.name,
      price: product.price,
    });
    toast.success('Producto agregado al carrito');
  }

  return (
    <Link href={`/producto/${product.slug}`}>
      <Card className="group overflow-hidden transition-all hover:ring-2 hover:ring-rose-300">
        <div className={`relative aspect-square bg-gradient-to-br ${gradient} flex items-center justify-center`}>
          <span className="text-6xl opacity-30 transition-transform group-hover:scale-110">🛍️</span>
          {hasDiscount && (
            <span className="absolute left-2 top-2 rounded-full bg-red-500 px-2 py-0.5 text-xs font-bold text-white">
              -{discountPct}%
            </span>
          )}
          {level && (
            <span className="absolute right-2 top-2 text-lg" title={level.label}>
              {level.emoji}
            </span>
          )}
        </div>
        <CardContent className="space-y-2 p-3">
          <h3 className="line-clamp-2 text-sm font-medium leading-tight">{product.name}</h3>
          <div className="flex items-center gap-2">
            <span className="text-base font-bold text-rose-600">{formatPrice(product.price)}</span>
            {hasDiscount && (
              <span className="text-xs text-muted-foreground line-through">
                {formatPrice(product.compare_at_price!)}
              </span>
            )}
          </div>
          {level && (
            <Badge variant="secondary" className="text-xs">
              {level.emoji} {level.label}
            </Badge>
          )}
          <Button
            onClick={handleAddToCart}
            size="sm"
            className="w-full bg-gradient-to-r from-rose-500 to-purple-600 text-white hover:from-rose-600 hover:to-purple-700"
          >
            Agregar al Carrito
          </Button>
        </CardContent>
      </Card>
    </Link>
  );
}
