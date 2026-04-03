'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useCartStore } from '@/lib/store/cart';
import { formatPrice } from '@/lib/utils/format';
import { generateOrderWhatsAppLink } from '@/lib/utils/whatsapp';
import { Plus, Minus, Trash2, ShoppingCart, ArrowLeft } from 'lucide-react';

const FREE_SHIPPING_THRESHOLD = 500000;

export default function CartPage() {
  const items = useCartStore((s) => s.items);
  const totalItems = useCartStore((s) => s.totalItems);
  const totalPrice = useCartStore((s) => s.totalPrice);
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const removeItem = useCartStore((s) => s.removeItem);
  const clearCart = useCartStore((s) => s.clearCart);

  const total = totalPrice();
  const count = totalItems();
  const progress = Math.min((total / FREE_SHIPPING_THRESHOLD) * 100, 100);
  const remaining = FREE_SHIPPING_THRESHOLD - total;

  if (items.length === 0) {
    return (
      <div className="container mx-auto px-4 py-20 text-center">
        <ShoppingCart className="mx-auto mb-6 h-24 w-24 text-muted-foreground/20" />
        <h1 className="text-2xl font-bold">Tu carrito está vacío</h1>
        <p className="mt-2 text-muted-foreground">
          ¡Explorá nuestra tienda y encontrá algo que te guste!
        </p>
        <Link href="/">
          <Button className="mt-6 bg-gradient-to-r from-rose-500 to-purple-600 text-white">
            Ir a la Tienda
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Breadcrumbs */}
      <nav className="mb-6 flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/" className="hover:text-foreground">Inicio</Link>
        <span>/</span>
        <span className="text-foreground">Carrito</span>
      </nav>

      <h1 className="mb-8 text-3xl font-bold">Tu Carrito ({count} {count === 1 ? 'producto' : 'productos'})</h1>

      {/* Free shipping progress */}
      <div className="mb-8 rounded-xl border p-4">
        {remaining > 0 ? (
          <p className="mb-2 text-sm text-muted-foreground">
            🚚 ¡Agregá {formatPrice(remaining)} más para envío gratis!
          </p>
        ) : (
          <p className="mb-2 text-sm font-medium text-green-600">
            🎉 ¡Tenés envío gratis!
          </p>
        )}
        <div className="h-3 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-gradient-to-r from-rose-500 to-purple-600 transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Cart Items */}
        <div className="lg:col-span-2">
          <div className="space-y-4">
            {items.map((item) => (
              <div
                key={item.id}
                className="flex flex-col gap-4 rounded-xl border p-4 sm:flex-row sm:items-center"
              >
                <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-rose-400 to-purple-500">
                  <span className="text-3xl">🛍️</span>
                </div>
                <div className="flex-1">
                  <h3 className="font-medium">{item.name}</h3>
                  <p className="text-sm font-bold text-rose-600">{formatPrice(item.price)}</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 rounded-lg border">
                    <button
                      onClick={() => updateQuantity(item.id, item.quantity - 1)}
                      className="flex h-8 w-8 items-center justify-center hover:bg-muted"
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item.id, item.quantity + 1)}
                      className="flex h-8 w-8 items-center justify-center hover:bg-muted"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                  <span className="w-24 text-right text-sm font-bold">
                    {formatPrice(item.price * item.quantity)}
                  </span>
                  <button
                    onClick={() => removeItem(item.id)}
                    className="flex h-8 w-8 items-center justify-center rounded text-red-500 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 flex gap-3">
            <Link href="/">
              <Button variant="outline" size="sm">
                <ArrowLeft className="mr-1 h-4 w-4" /> Seguir Comprando
              </Button>
            </Link>
            <Button variant="outline" size="sm" onClick={clearCart} className="text-red-500 hover:bg-red-50">
              <Trash2 className="mr-1 h-4 w-4" /> Vaciar Carrito
            </Button>
          </div>
        </div>

        {/* Order Summary */}
        <div className="lg:col-span-1">
          <div className="sticky top-32 rounded-xl border p-6">
            <h2 className="mb-4 text-lg font-bold">Resumen del Pedido</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal ({count} productos)</span>
                <span>{formatPrice(total)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Envío</span>
                <span>{remaining <= 0 ? 'Gratis 🎉' : 'A calcular'}</span>
              </div>
              <div className="my-3 border-t" />
              <div className="flex justify-between text-lg font-bold">
                <span>Total</span>
                <span className="text-rose-600">{formatPrice(total)}</span>
              </div>
            </div>

            <div className="mt-6 space-y-3">
              <a
                href={generateOrderWhatsAppLink(items)}
                target="_blank"
                rel="noopener noreferrer"
                className="block"
              >
                <Button className="w-full bg-green-500 text-white hover:bg-green-600" size="lg">
                  💬 Finalizar por WhatsApp
                </Button>
              </a>
              <p className="text-center text-xs text-muted-foreground">
                Enviamos tu pedido por WhatsApp para confirmar la compra y coordinar el envío.
              </p>
            </div>

            {/* Mini trust badges */}
            <div className="mt-6 grid grid-cols-2 gap-2">
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <span>📦</span> Envío discreto
              </div>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <span>🔒</span> Pago seguro
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
