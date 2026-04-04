'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { formatPrice } from '@/lib/utils/format';
import { generateWhatsAppLink } from '@/lib/utils/whatsapp';
import {
  CheckCircle,
  Package,
  MessageCircle,
  Copy,
  ShoppingCart,
  ArrowRight,
  Truck,
  Clock,
} from 'lucide-react';

interface OrderItem {
  name: string;
  quantity: number;
  price: number;
  total: number;
}

interface OrderData {
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  shippingZone: string;
  shippingCost: number;
  paymentMethod: 'transfer' | 'cod';
  items: OrderItem[];
  subtotal: number;
  total: number;
  createdAt: string;
}

export default function ConfirmacionPage() {
  const [order, setOrder] = useState<OrderData | null>(null);
  const [copied, setCopied] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      const data = sessionStorage.getItem('fun4me-last-order');
      if (data) {
        setOrder(JSON.parse(data));
      }
    } catch {
      // silently fail
    }
  }, []);

  function copyOrderNumber() {
    if (!order) return;
    navigator.clipboard.writeText(order.orderNumber).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function getWhatsAppFollowUpLink(): string {
    if (!order) return '#';
    const message = `Hola! Acabo de hacer un pedido en Fun4Me Store.\n\n*Nro. Pedido:* ${order.orderNumber}\n*Nombre:* ${order.customerName}\n*Teléfono:* ${order.customerPhone}\n*Total:* ${formatPrice(order.total)}\n*Método de pago:* ${order.paymentMethod === 'transfer' ? 'Transferencia bancaria' : 'Pago contra entrega'}\n\nQuiero confirmar mi pedido. ¡Gracias!`;
    return generateWhatsAppLink(message);
  }

  if (!mounted) {
    return (
      <div className="container mx-auto flex min-h-[60vh] items-center justify-center px-4">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-rose-500 border-t-transparent" />
      </div>
    );
  }

  // No order data - redirect to store
  if (!order) {
    return (
      <div className="container mx-auto px-4 py-20 text-center">
        <ShoppingCart className="mx-auto mb-6 h-24 w-24 text-muted-foreground/20" />
        <h1 className="text-2xl font-bold">No hay pedido reciente</h1>
        <p className="mt-2 text-muted-foreground">
          Parece que no tenés un pedido pendiente.
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
      {/* Success Header */}
      <div className="mb-10 text-center">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-r from-green-400 to-emerald-500 shadow-lg">
          <CheckCircle className="h-10 w-10 text-white" />
        </div>
        <h1 className="text-3xl font-bold">¡Pedido Confirmado!</h1>
        <p className="mt-2 text-muted-foreground">
          Gracias por tu compra, {order.customerName.split(' ')[0]}. Tu pedido
          fue registrado exitosamente.
        </p>
      </div>

      <div className="mx-auto max-w-2xl space-y-6">
        {/* Order Number Card */}
        <div className="rounded-xl border-2 border-rose-200 bg-gradient-to-r from-rose-50 to-purple-50 p-6 text-center">
          <p className="text-sm text-muted-foreground">Número de Pedido</p>
          <div className="mt-2 flex items-center justify-center gap-3">
            <span className="text-2xl font-bold tracking-wider text-rose-600">
              {order.orderNumber}
            </span>
            <button
              onClick={copyOrderNumber}
              className="flex h-8 w-8 items-center justify-center rounded-lg border hover:bg-white"
              title="Copiar número de pedido"
            >
              {copied ? (
                <CheckCircle className="h-4 w-4 text-green-500" />
              ) : (
                <Copy className="h-4 w-4 text-muted-foreground" />
              )}
            </button>
          </div>
          {copied && (
            <p className="mt-1 text-xs text-green-600">
              ¡Copiado al portapapeles!
            </p>
          )}
        </div>

        {/* WhatsApp Follow-up */}
        <div className="rounded-xl border border-green-200 bg-green-50 p-6 text-center">
          <MessageCircle className="mx-auto mb-3 h-8 w-8 text-green-600" />
          <h2 className="text-lg font-bold text-green-900">
            Confirmá tu pedido por WhatsApp
          </h2>
          <p className="mt-1 text-sm text-green-700">
            Para agilizar tu entrega, envianos un mensaje con tu número de
            pedido.
          </p>
          <a
            href={getWhatsAppFollowUpLink()}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-block"
          >
            <Button className="h-11 bg-green-500 px-8 text-white hover:bg-green-600" size="lg">
              <MessageCircle className="mr-2 h-5 w-5" />
              Enviar por WhatsApp
            </Button>
          </a>
        </div>

        {/* Order Details */}
        <div className="rounded-xl border p-6">
          <h2 className="mb-4 text-lg font-bold">Detalle del Pedido</h2>

          {/* Items */}
          <div className="space-y-3">
            {order.items.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-rose-400 to-purple-500">
                    <Package className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{item.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.quantity} x {formatPrice(item.price)}
                    </p>
                  </div>
                </div>
                <span className="text-sm font-bold">
                  {formatPrice(item.total)}
                </span>
              </div>
            ))}
          </div>

          <Separator className="my-4" />

          {/* Totals */}
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span>{formatPrice(order.subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Envío ({order.shippingZone})</span>
              <span>
                {order.shippingCost === 0
                  ? '¡Gratis!'
                  : formatPrice(order.shippingCost)}
              </span>
            </div>
            <Separator className="my-2" />
            <div className="flex justify-between text-lg font-bold">
              <span>Total</span>
              <span className="bg-gradient-to-r from-rose-500 to-purple-600 bg-clip-text text-transparent">
                {formatPrice(order.total)}
              </span>
            </div>
          </div>
        </div>

        {/* Shipping & Payment Info */}
        <div className="grid gap-4 sm:grid-cols-2">
          {/* Shipping Info */}
          <div className="rounded-xl border p-5">
            <div className="mb-3 flex items-center gap-2">
              <Truck className="h-5 w-5 text-rose-500" />
              <h3 className="font-bold">Datos de Envío</h3>
            </div>
            <div className="space-y-1 text-sm text-muted-foreground">
              <p className="font-medium text-foreground">
                {order.customerName}
              </p>
              <p>{order.customerPhone}</p>
              <p>{order.customerAddress}</p>
              <p>Zona: {order.shippingZone}</p>
            </div>
          </div>

          {/* Payment Info */}
          <div className="rounded-xl border p-5">
            <div className="mb-3 flex items-center gap-2">
              <Clock className="h-5 w-5 text-purple-500" />
              <h3 className="font-bold">Estado del Pedido</h3>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-amber-400" />
                <span className="text-muted-foreground">
                  Pendiente de confirmación
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Método de pago:{' '}
                <strong className="text-foreground">
                  {order.paymentMethod === 'transfer'
                    ? 'Transferencia bancaria'
                    : 'Pago contra entrega'}
                </strong>
              </p>
              {order.paymentMethod === 'transfer' && (
                <p className="text-xs text-amber-600">
                  Recordá enviar tu comprobante por WhatsApp si aún no lo
                  hiciste.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Next Steps */}
        <div className="rounded-xl border bg-muted/30 p-6">
          <h3 className="mb-3 font-bold">¿Qué sigue?</h3>
          <div className="space-y-3 text-sm text-muted-foreground">
            <div className="flex items-start gap-3">
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gradient-to-r from-rose-500 to-purple-600 text-xs font-bold text-white">
                1
              </div>
              <p>
                {order.paymentMethod === 'transfer'
                  ? 'Realizá la transferencia bancaria y enviá el comprobante por WhatsApp.'
                  : 'Te contactaremos por WhatsApp para confirmar tu pedido.'}
              </p>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gradient-to-r from-rose-500 to-purple-600 text-xs font-bold text-white">
                2
              </div>
              <p>Preparamos tu pedido con envío discreto y sin marcas.</p>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gradient-to-r from-rose-500 to-purple-600 text-xs font-bold text-white">
                3
              </div>
              <p>
                Recibís tu pedido en 24-72 horas.{' '}
                {order.paymentMethod === 'cod' &&
                  'Pagás al recibir tu paquete.'}
              </p>
            </div>
          </div>
        </div>

        {/* Back to Store */}
        <div className="text-center">
          <Link href="/">
            <Button
              variant="outline"
              className="h-11 px-8"
              size="lg"
            >
              Seguir Comprando
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
