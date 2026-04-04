'use client';

import { Button } from '@/components/ui/button';
import { useCartStore } from '@/lib/store/cart';
import { generateWhatsAppLink } from '@/lib/utils/whatsapp';
import { formatPrice } from '@/lib/utils/format';
import { toast } from 'sonner';
import { ShoppingCart } from 'lucide-react';

interface Props {
  product: {
    id: string;
    name: string;
    price: number;
    stock: number;
    slug: string;
  };
}

export function ProductActions({ product }: Props) {
  const addItem = useCartStore((s) => s.addItem);

  function handleAddToCart() {
    addItem({
      id: product.id,
      name: product.name,
      price: product.price,
      max_stock: product.stock,
    });
    toast.success('¡Producto agregado al carrito!');
  }

  const whatsappMessage = `¡Hola! Me interesa este producto:\n\n${product.name}\nPrecio: ${formatPrice(product.price)}\nhttps://fun4me.sunstein.cloud/producto/${product.slug}\n\n¿Está disponible?`;
  const whatsappLink = generateWhatsAppLink(whatsappMessage);

  return (
    <div className="space-y-3">
      <Button
        onClick={handleAddToCart}
        disabled={product.stock <= 0}
        size="lg"
        className="w-full bg-gradient-to-r from-rose-500 to-purple-600 text-white hover:from-rose-600 hover:to-purple-700"
      >
        <ShoppingCart className="mr-2 h-5 w-5" />
        Agregar al Carrito
      </Button>
      <a href={whatsappLink} target="_blank" rel="noopener noreferrer" className="block">
        <Button variant="outline" size="lg" className="w-full border-green-300 text-green-600 hover:bg-green-50">
          Pedir por WhatsApp
        </Button>
      </a>
    </div>
  );
}
