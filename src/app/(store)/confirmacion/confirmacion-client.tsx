'use client';

import { useState } from 'react';
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
  ArrowRight,
  Truck,
  Clock,
} from 'lucide-react';

interface OrderItem {
  product_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

interface OrderData {
  id: string;
  customer_name: string;
  customer_phone: string;
  customer_email: string | null;
  shipping_address: {
    address: string;
    city: string;
    neighborhood: string;
  } | null;
  shipping_zone: string | null;
  shipping_cost: number;
  payment_method: string;
  subtotal: number;
  total: number;
  status: string;
  notes: string | null;
  created_at: string;
  items: OrderItem[];
}

function OrderNumberCard({ orderId }: { orderId: string }) {
  const [copied, setCopied] = useState(false);
  const orderDisplay = orderId.slice(0, 8).toUpperCase();

  function copyOrderNumber() {
    navigator.clipboard.writeText(orderId).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="rounded-xl border-2 border-rose-200 bg-gradient-to-r from-rose-50 to-purple-50 p-6 text-center">
      <p className="text-sm text-muted-foreground">Número de Pedido</p>
      <div className="mt-2 flex items-center justify-center gap-3">
        <span className="text-2xl font-bold tracking-wider text-rose-600">
          #{orderDisplay}
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
  );
}

function WhatsAppFollowUp({ order }: { order: OrderData }) {
  const orderDisplay = order.id.slice(0, 8).toUpperCase();
  const message = `Hola! Acabo de hacer un pedido en Fun4Me Store.\n\n*Nro. Pedido:* #${orderDisplay}\n*Nombre:* ${order.customer_name}\n*Teléfono:* ${order.customer_phone}\n*Total:* ${formatPrice(order.total)}\n*Método de pago:* ${order.payment_method === 'transfer' ? 'Transferencia bancaria' : 'Pago contra entrega'}\n\nQuiero confirmar mi pedido. ¡Gracias!`;
  const link = generateWhatsAppLink(message);

  return (
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
        href={link}
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
  );
}

export default function ConfirmacionClient({ order }: { order: OrderData }) {
  const shippingAddress = order.shipping_address;
  const addressText = shippingAddress
    ? `${shippingAddress.address}, ${shippingAddress.neighborhood}, ${shippingAddress.city}`
    : '';

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Success Header */}
      <div className="mb-10 text-center">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-r from-green-400 to-emerald-500 shadow-lg">
          <CheckCircle className="h-10 w-10 text-white" />
        </div>
        <h1 className="text-3xl font-bold">¡Pedido Confirmado!</h1>
        <p className="mt-2 text-muted-foreground">
          Gracias por tu compra, {order.customer_name.split(' ')[0]}. Tu pedido
          fue registrado exitosamente.
        </p>
      </div>

      <div className="mx-auto max-w-2xl space-y-6">
        {/* Order Number Card */}
        <OrderNumberCard orderId={order.id} />

        {/* WhatsApp Follow-up */}
        <WhatsAppFollowUp order={order} />

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
                    <p className="text-sm font-medium">{item.product_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.quantity} x {formatPrice(item.unit_price)}
                    </p>
                  </div>
                </div>
                <span className="text-sm font-bold">
                  {formatPrice(item.total_price)}
                </span>
              </div>
            ))}
          </div>

          <Separator className="my-4" />

          {/* Totals */}
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span>{formatPrice(order.subtotal || order.total - (order.shipping_cost || 0))}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">
                Envío{order.shipping_zone ? ` (${order.shipping_zone})` : ''}
              </span>
              <span>
                {(order.shipping_cost || 0) === 0
                  ? '¡Gratis!'
                  : formatPrice(order.shipping_cost || 0)}
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
                {order.customer_name}
              </p>
              <p>{order.customer_phone}</p>
              {addressText && <p>{addressText}</p>}
              {order.shipping_zone && <p>Zona: {order.shipping_zone}</p>}
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
                  {order.payment_method === 'transfer'
                    ? 'Transferencia bancaria'
                    : 'Pago contra entrega'}
                </strong>
              </p>
              {order.payment_method === 'transfer' && (
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
                {order.payment_method === 'transfer'
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
                {order.payment_method === 'cod' &&
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
