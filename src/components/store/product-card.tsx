'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatPrice } from '@/lib/utils/format';
import { useCartStore } from '@/lib/store/cart';
import { PRODUCT_PLACEHOLDERS, DEFAULT_PRODUCT_IMAGE } from '@/lib/images';
import { toast } from 'sonner';

const LEVEL_BADGES: Record<string, { label: string; dot: string }> = {
  principiante: { label: 'Principiante', dot: 'bg-green-500' },
  intermedio: { label: 'Intermedio', dot: 'bg-yellow-500' },
  avanzado: { label: 'Avanzado', dot: 'bg-red-500' },
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
    image_url?: string | null;
    category_slug?: string;
  };
}

export function ProductCard({ product }: ProductCardProps) {
  const addItem = useCartStore((s) => s.addItem);
  const productImage = product.image_url || PRODUCT_PLACEHOLDERS[product.category_slug || 'default'] || DEFAULT_PRODUCT_IMAGE;
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
        <div className="relative aspect-square overflow-hidden">
          <Image
            src={productImage}
            alt={product.name}
            fill
            className="object-cover transition-transform group-hover:scale-105"
          />
          {hasDiscount && (
            <span className="absolute left-2 top-2 rounded-full bg-red-500 px-2 py-0.5 text-xs font-bold text-white">
              -{discountPct}%
            </span>
          )}
          {level && (
            <span className={`absolute right-2 top-2 h-3 w-3 rounded-full ${level.dot}`} title={level.label} />
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
              <span className={`mr-1 inline-block h-2 w-2 rounded-full ${level.dot}`} />
              {level.label}
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
