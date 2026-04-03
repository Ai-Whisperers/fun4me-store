'use client';

import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { useCartStore } from '@/lib/store/cart';
import { formatPrice } from '@/lib/utils/format';
import { generateOrderWhatsAppLink } from '@/lib/utils/whatsapp';
import { ShoppingCart, Plus, Minus, Trash2 } from 'lucide-react';
import Link from 'next/link';

const FREE_SHIPPING_THRESHOLD = 500000;

export function CartDrawer() {
  const items = useCartStore((s) => s.items);
  const totalItems = useCartStore((s) => s.totalItems);
  const totalPrice = useCartStore((s) => s.totalPrice);
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const removeItem = useCartStore((s) => s.removeItem);

  const total = totalPrice();
  const count = totalItems();
  const progress = Math.min((total / FREE_SHIPPING_THRESHOLD) * 100, 100);
  const remaining = FREE_SHIPPING_THRESHOLD - total;

  return (
    <Sheet>
      <SheetTrigger className="relative inline-flex items-center">
        <ShoppingCart className="h-5 w-5" />
        {count > 0 && (
          <span className="absolute -right-2 -top-2 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white">
            {count}
          </span>
        )}
      </SheetTrigger>
      <SheetContent side="right" className="flex flex-col">
        <SheetHeader>
          <SheetTitle>Tu Carrito ({count})</SheetTitle>
        </SheetHeader>

        {items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
            <ShoppingCart className="h-16 w-16 text-muted-foreground/30" />
            <p className="text-muted-foreground">Tu carrito está vacío</p>
            <p className="text-sm text-muted-foreground">¡Explorá nuestra tienda y encontrá algo que te guste!</p>
          </div>
        ) : (
          <>
            {/* Free shipping progress */}
            <div className="px-4">
              {remaining > 0 ? (
                <p className="mb-2 text-xs text-muted-foreground">
                  ¡Agregá {formatPrice(remaining)} más para envío gratis! 🚚
                </p>
              ) : (
                <p className="mb-2 text-xs font-medium text-green-600">
                  🎉 ¡Tenés envío gratis!
                </p>
              )}
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-rose-500 to-purple-600 transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            {/* Items */}
            <div className="flex-1 overflow-y-auto px-4 py-4">
              <div className="space-y-4">
                {items.map((item) => (
                  <div key={item.id} className="flex items-center gap-3 rounded-lg border p-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-rose-400 to-purple-500">
                      <span className="text-lg">🛍️</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-sm font-medium">{item.name}</p>
                      <p className="text-sm font-bold text-rose-600">{formatPrice(item.price)}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        className="flex h-6 w-6 items-center justify-center rounded border hover:bg-muted"
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                      <span className="w-6 text-center text-sm">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        className="flex h-6 w-6 items-center justify-center rounded border hover:bg-muted"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                      <button
                        onClick={() => removeItem(item.id)}
                        className="ml-1 flex h-6 w-6 items-center justify-center rounded text-red-500 hover:bg-red-50"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {items.length > 0 && (
          <SheetFooter className="border-t pt-4">
            <div className="w-full space-y-3">
              <div className="flex items-center justify-between text-base font-bold">
                <span>Total:</span>
                <span className="text-rose-600">{formatPrice(total)}</span>
              </div>
              <Link href="/carrito" className="block">
                <Button variant="outline" className="w-full">
                  Ver Carrito Completo
                </Button>
              </Link>
              <a
                href={generateOrderWhatsAppLink(items)}
                target="_blank"
                rel="noopener noreferrer"
                className="block"
              >
                <Button className="w-full bg-green-500 text-white hover:bg-green-600">
                  💬 Pedir por WhatsApp
                </Button>
              </a>
            </div>
          </SheetFooter>
        )}
      </SheetContent>
    </Sheet>
  );
}
