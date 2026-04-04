'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { useCartStore } from '@/lib/store/cart';
import { formatPrice } from '@/lib/utils/format';
import {
  ArrowLeft,
  Truck,
  CreditCard,
  Banknote,
  Upload,
  MapPin,
  Phone,
  User,
  ShoppingCart,
  CheckCircle,
  Package,
  Shield,
} from 'lucide-react';

/* ── Shipping zones ─────────────────────────────────────────── */
const SHIPPING_ZONES = [
  { id: 'asuncion', label: 'Asunción', cost: 15_000 },
  { id: 'gran-asuncion', label: 'Gran Asunción', cost: 25_000 },
  { id: 'interior', label: 'Interior', cost: 40_000 },
] as const;

type ShippingZoneId = (typeof SHIPPING_ZONES)[number]['id'];

const FREE_SHIPPING_THRESHOLD = 300_000;

/* ── City → zone mapping ────────────────────────────────────── */
const CITY_ZONE_MAP: Record<string, ShippingZoneId> = {
  asuncion: 'asuncion',
  asunción: 'asuncion',
  'fernando de la mora': 'gran-asuncion',
  lambare: 'gran-asuncion',
  lambaré: 'gran-asuncion',
  'san lorenzo': 'gran-asuncion',
  luque: 'gran-asuncion',
  capiata: 'gran-asuncion',
  capiatá: 'gran-asuncion',
  limpio: 'gran-asuncion',
  'mariano roque alonso': 'gran-asuncion',
  nemby: 'gran-asuncion',
  ñemby: 'gran-asuncion',
  'villa elisa': 'gran-asuncion',
  'san antonio': 'gran-asuncion',
  ita: 'gran-asuncion',
  itá: 'gran-asuncion',
  ypacarai: 'gran-asuncion',
  ypacaraí: 'gran-asuncion',
  aregua: 'gran-asuncion',
  areguá: 'gran-asuncion',
};

type PaymentMethod = 'transfer' | 'cod' | null;

/* ── Bank account details ────────────────────────────────────── */
const BANK_DETAILS = {
  bank: 'Banco Itaú',
  accountName: 'Fun4Me Store SRL',
  accountNumber: '0123456789',
  ruc: '80123456-7',
  ci: '4.567.890',
};

export default function CheckoutPage() {
  const router = useRouter();
  const items = useCartStore((s) => s.items);
  const totalPrice = useCartStore((s) => s.totalPrice);
  const clearCart = useCartStore((s) => s.clearCart);

  const subtotal = totalPrice();

  /* ── Form state ──────────────────────────────────────────── */
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [notes, setNotes] = useState('');
  const [shippingZone, setShippingZone] = useState<ShippingZoneId | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(null);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  /* ── Auto-detect shipping zone from city ─────────────────── */
  useEffect(() => {
    const normalized = city.trim().toLowerCase();
    if (CITY_ZONE_MAP[normalized]) {
      setShippingZone(CITY_ZONE_MAP[normalized]);
    } else if (normalized.length > 2 && !CITY_ZONE_MAP[normalized]) {
      setShippingZone('interior');
    }
  }, [city]);

  /* ── Computed values ─────────────────────────────────────── */
  const selectedZone = useMemo(
    () => SHIPPING_ZONES.find((z) => z.id === shippingZone) ?? null,
    [shippingZone],
  );

  const isFreeShipping = subtotal >= FREE_SHIPPING_THRESHOLD;
  const shippingCost = isFreeShipping ? 0 : (selectedZone?.cost ?? 0);
  const total = subtotal + shippingCost;

  /* ── Validation ──────────────────────────────────────────── */
  function validate(): boolean {
    const newErrors: Record<string, string> = {};
    if (!name.trim()) newErrors.name = 'Ingresá tu nombre completo';
    if (!phone.trim()) newErrors.phone = 'Ingresá tu número de teléfono';
    else if (!/^0\d{8,10}$/.test(phone.replace(/\s/g, '')))
      newErrors.phone = 'Formato: 0981123456';
    if (!address.trim()) newErrors.address = 'Ingresá tu dirección';
    if (!city.trim()) newErrors.city = 'Ingresá tu ciudad';
    if (!neighborhood.trim()) newErrors.neighborhood = 'Ingresá tu barrio';
    if (!shippingZone) newErrors.shippingZone = 'Seleccioná tu zona de envío';
    if (!paymentMethod) newErrors.paymentMethod = 'Elegí un método de pago';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  /* ── Submit order ────────────────────────────────────────── */
  async function handleSubmit() {
    if (!validate()) return;
    setIsSubmitting(true);

    try {
      // Generate order number (timestamp-based for now)
      const orderNumber = `F4M-${Date.now().toString(36).toUpperCase()}`;

      // Store order info in sessionStorage for the confirmation page
      const orderData = {
        orderNumber,
        customerName: name,
        customerPhone: phone,
        customerAddress: `${address}, ${neighborhood}, ${city}`,
        shippingZone: selectedZone?.label,
        shippingCost,
        paymentMethod,
        items: items.map((item) => ({
          name: item.name,
          quantity: item.quantity,
          price: item.price,
          total: item.price * item.quantity,
        })),
        subtotal,
        total,
        createdAt: new Date().toISOString(),
      };

      sessionStorage.setItem('fun4me-last-order', JSON.stringify(orderData));

      // Clear cart and redirect
      clearCart();
      router.push('/confirmacion');
    } catch {
      setErrors({ submit: 'Ocurrió un error. Por favor intentá de nuevo.' });
    } finally {
      setIsSubmitting(false);
    }
  }

  /* ── Render ──────────────────────────────────────────────── */

  // Empty cart guard
  if (mounted && items.length === 0) {
    return (
      <div className="container mx-auto px-4 py-20 text-center">
        <ShoppingCart className="mx-auto mb-6 h-24 w-24 text-muted-foreground/20" />
        <h1 className="text-2xl font-bold">Tu carrito está vacío</h1>
        <p className="mt-2 text-muted-foreground">
          Agregá productos antes de ir al checkout.
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
        <Link href="/" className="hover:text-foreground">
          Inicio
        </Link>
        <span>/</span>
        <Link href="/carrito" className="hover:text-foreground">
          Carrito
        </Link>
        <span>/</span>
        <span className="text-foreground">Checkout</span>
      </nav>

      <div className="mb-8 flex items-center gap-3">
        <Link href="/carrito">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <h1 className="text-3xl font-bold">Finalizar Compra</h1>
      </div>

      {errors.submit && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {errors.submit}
        </div>
      )}

      <div className="grid gap-8 lg:grid-cols-3">
        {/* ─── Left column: Forms ─────────────────────────── */}
        <div className="space-y-8 lg:col-span-2">
          {/* ── 1. Shipping Address ────────────────────────── */}
          <section className="rounded-xl border p-6">
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-r from-rose-500 to-purple-600 text-sm font-bold text-white">
                1
              </div>
              <h2 className="text-lg font-bold">Datos de Envío</h2>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {/* Name */}
              <div className="sm:col-span-2">
                <Label htmlFor="name" className="mb-1.5">
                  <User className="h-4 w-4 text-muted-foreground" />
                  Nombre completo *
                </Label>
                <Input
                  id="name"
                  placeholder="Ej: María González"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  aria-invalid={!!errors.name}
                  className="h-10"
                />
                {errors.name && (
                  <p className="mt-1 text-xs text-red-500">{errors.name}</p>
                )}
              </div>

              {/* Phone */}
              <div className="sm:col-span-2">
                <Label htmlFor="phone" className="mb-1.5">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  Teléfono / WhatsApp *
                </Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="0981 123 456"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  aria-invalid={!!errors.phone}
                  className="h-10"
                />
                {errors.phone && (
                  <p className="mt-1 text-xs text-red-500">{errors.phone}</p>
                )}
              </div>

              {/* City */}
              <div>
                <Label htmlFor="city" className="mb-1.5">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  Ciudad *
                </Label>
                <Input
                  id="city"
                  placeholder="Ej: Asunción"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  aria-invalid={!!errors.city}
                  className="h-10"
                />
                {errors.city && (
                  <p className="mt-1 text-xs text-red-500">{errors.city}</p>
                )}
              </div>

              {/* Neighborhood */}
              <div>
                <Label htmlFor="neighborhood" className="mb-1.5">
                  Barrio *
                </Label>
                <Input
                  id="neighborhood"
                  placeholder="Ej: Villa Morra"
                  value={neighborhood}
                  onChange={(e) => setNeighborhood(e.target.value)}
                  aria-invalid={!!errors.neighborhood}
                  className="h-10"
                />
                {errors.neighborhood && (
                  <p className="mt-1 text-xs text-red-500">
                    {errors.neighborhood}
                  </p>
                )}
              </div>

              {/* Address */}
              <div className="sm:col-span-2">
                <Label htmlFor="address" className="mb-1.5">
                  Dirección completa *
                </Label>
                <Textarea
                  id="address"
                  placeholder="Calle, número, referencias..."
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  aria-invalid={!!errors.address}
                  rows={2}
                />
                {errors.address && (
                  <p className="mt-1 text-xs text-red-500">{errors.address}</p>
                )}
              </div>

              {/* Notes */}
              <div className="sm:col-span-2">
                <Label htmlFor="notes" className="mb-1.5">
                  Notas adicionales (opcional)
                </Label>
                <Textarea
                  id="notes"
                  placeholder="Instrucciones especiales de entrega, horarios preferidos..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                />
              </div>
            </div>
          </section>

          {/* ── 2. Shipping Zone ───────────────────────────── */}
          <section className="rounded-xl border p-6">
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-r from-rose-500 to-purple-600 text-sm font-bold text-white">
                2
              </div>
              <h2 className="text-lg font-bold">Zona de Envío</h2>
            </div>

            {isFreeShipping && (
              <div className="mb-4 flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700">
                <CheckCircle className="h-5 w-5 shrink-0" />
                <span>
                  &#127881; ¡Tenés envío gratis! Tu pedido supera{' '}
                  {formatPrice(FREE_SHIPPING_THRESHOLD)}
                </span>
              </div>
            )}

            <div className="grid gap-3 sm:grid-cols-3">
              {SHIPPING_ZONES.map((zone) => {
                const isSelected = shippingZone === zone.id;
                return (
                  <button
                    key={zone.id}
                    type="button"
                    onClick={() => setShippingZone(zone.id)}
                    className={`relative flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-all ${
                      isSelected
                        ? 'border-rose-500 bg-rose-50 shadow-md'
                        : 'border-muted hover:border-rose-300'
                    }`}
                  >
                    <Truck
                      className={`h-6 w-6 ${isSelected ? 'text-rose-500' : 'text-muted-foreground'}`}
                    />
                    <span className="font-medium">{zone.label}</span>
                    <span
                      className={`text-sm font-bold ${
                        isFreeShipping
                          ? 'text-green-600 line-through'
                          : isSelected
                            ? 'text-rose-600'
                            : 'text-muted-foreground'
                      }`}
                    >
                      {formatPrice(zone.cost)}
                    </span>
                    {isFreeShipping && (
                      <span className="text-xs font-bold text-green-600">
                        GRATIS
                      </span>
                    )}
                    {isSelected && (
                      <div className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-rose-500">
                        <CheckCircle className="h-3.5 w-3.5 text-white" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            {shippingZone && city && (
              <p className="mt-3 text-xs text-muted-foreground">
                Zona detectada automáticamente por tu ciudad:{' '}
                <strong>{selectedZone?.label}</strong>
              </p>
            )}
            {errors.shippingZone && (
              <p className="mt-2 text-xs text-red-500">{errors.shippingZone}</p>
            )}
          </section>

          {/* ── 3. Payment Method ──────────────────────────── */}
          <section className="rounded-xl border p-6">
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-r from-rose-500 to-purple-600 text-sm font-bold text-white">
                3
              </div>
              <h2 className="text-lg font-bold">Método de Pago</h2>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {/* Bank Transfer */}
              <button
                type="button"
                onClick={() => setPaymentMethod('transfer')}
                className={`flex flex-col items-center gap-3 rounded-xl border-2 p-5 transition-all ${
                  paymentMethod === 'transfer'
                    ? 'border-rose-500 bg-rose-50 shadow-md'
                    : 'border-muted hover:border-rose-300'
                }`}
              >
                <CreditCard
                  className={`h-8 w-8 ${paymentMethod === 'transfer' ? 'text-rose-500' : 'text-muted-foreground'}`}
                />
                <span className="font-medium">Transferencia Bancaria</span>
                <span className="text-xs text-muted-foreground">
                  Transferí y subí tu comprobante
                </span>
              </button>

              {/* Cash on Delivery */}
              <button
                type="button"
                onClick={() => setPaymentMethod('cod')}
                className={`flex flex-col items-center gap-3 rounded-xl border-2 p-5 transition-all ${
                  paymentMethod === 'cod'
                    ? 'border-rose-500 bg-rose-50 shadow-md'
                    : 'border-muted hover:border-rose-300'
                }`}
              >
                <Banknote
                  className={`h-8 w-8 ${paymentMethod === 'cod' ? 'text-rose-500' : 'text-muted-foreground'}`}
                />
                <span className="font-medium">Pago contra Entrega</span>
                <span className="text-xs text-muted-foreground">
                  Pagás cuando recibís tu pedido
                </span>
              </button>
            </div>

            {errors.paymentMethod && (
              <p className="mt-2 text-xs text-red-500">
                {errors.paymentMethod}
              </p>
            )}

            {/* Bank Transfer Details */}
            {paymentMethod === 'transfer' && (
              <div className="mt-6 space-y-4">
                <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
                  <h3 className="mb-3 font-bold text-blue-900">
                    Datos para Transferencia
                  </h3>
                  <div className="space-y-2 text-sm text-blue-800">
                    <div className="flex justify-between">
                      <span className="text-blue-600">Banco:</span>
                      <span className="font-medium">{BANK_DETAILS.bank}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-blue-600">Titular:</span>
                      <span className="font-medium">
                        {BANK_DETAILS.accountName}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-blue-600">Nro. Cuenta:</span>
                      <span className="font-medium">
                        {BANK_DETAILS.accountNumber}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-blue-600">RUC:</span>
                      <span className="font-medium">{BANK_DETAILS.ruc}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-blue-600">CI:</span>
                      <span className="font-medium">{BANK_DETAILS.ci}</span>
                    </div>
                  </div>
                  <Separator className="my-3" />
                  <p className="text-xs text-blue-600">
                    Monto a transferir:{' '}
                    <strong className="text-blue-900">
                      {formatPrice(total)}
                    </strong>
                  </p>
                </div>

                {/* Receipt upload */}
                <div>
                  <Label className="mb-2">
                    Comprobante de transferencia (opcional)
                  </Label>
                  <div className="relative">
                    <label
                      htmlFor="receipt-upload"
                      className={`flex cursor-pointer flex-col items-center gap-3 rounded-xl border-2 border-dashed p-6 transition-all ${
                        receiptFile
                          ? 'border-green-400 bg-green-50'
                          : 'border-muted hover:border-rose-300'
                      }`}
                    >
                      {receiptFile ? (
                        <>
                          <CheckCircle className="h-8 w-8 text-green-500" />
                          <span className="text-sm font-medium text-green-700">
                            {receiptFile.name}
                          </span>
                          <span className="text-xs text-green-600">
                            Tocá para cambiar
                          </span>
                        </>
                      ) : (
                        <>
                          <Upload className="h-8 w-8 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">
                            Tocá para subir tu comprobante
                          </span>
                          <span className="text-xs text-muted-foreground">
                            JPG, PNG o PDF
                          </span>
                        </>
                      )}
                    </label>
                    <input
                      id="receipt-upload"
                      type="file"
                      accept="image/*,.pdf"
                      className="sr-only"
                      onChange={(e) =>
                        setReceiptFile(e.target.files?.[0] ?? null)
                      }
                    />
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Podés subir el comprobante ahora o enviarlo después por
                    WhatsApp.
                  </p>
                </div>
              </div>
            )}

            {/* COD confirmation */}
            {paymentMethod === 'cod' && (
              <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4">
                <div className="flex items-start gap-3">
                  <Banknote className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
                  <div>
                    <p className="text-sm font-medium text-amber-900">
                      Pago contra Entrega
                    </p>
                    <p className="mt-1 text-xs text-amber-700">
                      Pagás el monto total de{' '}
                      <strong>{formatPrice(total)}</strong> en efectivo cuando
                      recibís tu pedido. Nuestro delivery te contactará para
                      coordinar la entrega.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* ── Submit Button (mobile) ─────────────────────── */}
          <div className="lg:hidden">
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="h-12 w-full bg-gradient-to-r from-rose-500 to-purple-600 text-base font-bold text-white"
              size="lg"
            >
              {isSubmitting ? 'Procesando...' : 'Confirmar Pedido'}
            </Button>
          </div>
        </div>

        {/* ─── Right column: Order Summary ────────────────── */}
        <div className="lg:col-span-1">
          <div className="sticky top-32 space-y-6">
            {/* Order Summary Card */}
            <div className="rounded-xl border p-6">
              <h2 className="mb-4 text-lg font-bold">Resumen del Pedido</h2>

              {/* Items */}
              <div className="max-h-64 space-y-3 overflow-y-auto">
                {items.map((item) => (
                  <div key={item.id} className="flex items-center gap-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-rose-400 to-purple-500">
                      <Package className="h-5 w-5 text-white" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {item.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Cant: {item.quantity}
                      </p>
                    </div>
                    <span className="shrink-0 text-sm font-bold">
                      {formatPrice(item.price * item.quantity)}
                    </span>
                  </div>
                ))}
              </div>

              <Separator className="my-4" />

              {/* Totals */}
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>{formatPrice(subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Envío</span>
                  <span>
                    {!shippingZone
                      ? 'Seleccioná zona'
                      : isFreeShipping
                        ? '¡Gratis!'
                        : formatPrice(shippingCost)}
                  </span>
                </div>
                {isFreeShipping && shippingZone && (
                  <div className="flex justify-between text-green-600">
                    <span className="text-xs">Descuento envío</span>
                    <span className="text-xs">
                      -{formatPrice(selectedZone?.cost ?? 0)}
                    </span>
                  </div>
                )}
                <Separator className="my-2" />
                <div className="flex justify-between text-lg font-bold">
                  <span>Total</span>
                  <span className="bg-gradient-to-r from-rose-500 to-purple-600 bg-clip-text text-transparent">
                    {formatPrice(total)}
                  </span>
                </div>
              </div>
            </div>

            {/* Submit Button (desktop) */}
            <div className="hidden lg:block">
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="h-12 w-full bg-gradient-to-r from-rose-500 to-purple-600 text-base font-bold text-white"
                size="lg"
              >
                {isSubmitting ? 'Procesando...' : 'Confirmar Pedido'}
              </Button>
            </div>

            {/* Trust badges */}
            <div className="space-y-2 rounded-xl border p-4">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Shield className="h-4 w-4 text-green-500" />
                <span>Compra 100% segura</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Package className="h-4 w-4 text-purple-500" />
                <span>Envío discreto y sin marcas</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Truck className="h-4 w-4 text-rose-500" />
                <span>Entrega en 24-72 horas</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
