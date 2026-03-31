'use client'
import { useParams } from 'next/navigation'
import { useCart } from '@/context/cart-context'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import Image from 'next/image'
import {
  ShoppingBag,
  X,
  ArrowRight,
  Trash2,
  ArrowLeft,
  ShieldCheck,
  Plus,
  Minus,
  AlertCircle,
  Package,
  PawPrint,
} from 'lucide-react'
import { DynamicIcon } from '@/lib/icons'
import { createClient } from '@/lib/supabase/client'
import { useEffect, useState, useMemo, useCallback } from 'react'
import { ClinicConfig } from '@/lib/clinics'
import type { User as SupabaseUser } from '@supabase/supabase-js'
import { AuthGate } from '@/components/auth/auth-gate'
import { ServiceGroup } from '@/components/cart/service-group'
import { organizeCart } from '@/lib/utils/cart-utils'
import { LIMITS } from '@/lib/constants'

interface CartPageClientProps {
  readonly config: ClinicConfig
}

export default function CartPageClient({ config }: CartPageClientProps) {
  const { clinic } = useParams() as { clinic: string }
  const { items, clearCart, total, removeItem, updateQuantity, discount } = useCart()
  const t = useTranslations()
  const [_user, setUser] = useState<SupabaseUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [quantityWarning, setQuantityWarning] = useState<string | null>(null)

  // Memoize supabase client
  const supabase = useMemo(() => createClient(), [])

  useEffect(() => {
    const checkUser = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      setUser(session?.user ?? null)
      setLoading(false)
    }

    checkUser()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [supabase])

  const finalTotal = Math.max(0, total - discount)
  const labels = config.ui_labels?.cart || {}
  const currency = config.settings?.currency || 'PYG'
  const whatsappNumber = config.contact?.whatsapp_number

  // Organize cart items into service groups and products
  const organizedCart = useMemo(() => organizeCart(items), [items])

  // Safe quantity update with validation
  const handleQuantityUpdate = useCallback(
    (itemId: string, delta: number) => {
      const item = items.find((i) => i.id === itemId)
      if (!item) return

      const newQuantity = item.quantity + delta

      // Validate against maximum
      if (newQuantity > LIMITS.MAX_QUANTITY_PER_ITEM) {
        setQuantityWarning(`Máximo ${LIMITS.MAX_QUANTITY_PER_ITEM} unidades por producto`)
        setTimeout(() => setQuantityWarning(null), 3000)
        return
      }

      // Validate against stock if available
      if (item.stock !== undefined && newQuantity > item.stock) {
        setQuantityWarning(`Solo hay ${item.stock} unidades disponibles`)
        setTimeout(() => setQuantityWarning(null), 3000)
        return
      }

      updateQuantity(itemId, delta)
    },
    [items, updateQuantity]
  )

  if (loading)
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="flex animate-pulse flex-col items-center">
          <div className="mb-4 h-12 w-12 rounded-full bg-gray-200"></div>
          <div className="h-4 w-32 rounded bg-gray-200"></div>
        </div>
      </div>
    )

  // Cart preview for unauthenticated users
  const cartPreview =
    items.length > 0 ? (
      <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
        <div className="space-y-3">
          {items.slice(0, 3).map((item) => (
            <div key={item.id} className="flex items-center gap-3 text-sm">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100">
                {item.image_url ? (
                  <>
                    { }
                    <Image 
                      src={item.image_url} 
                      alt={item.name} 
                      width={32}
                      height={32}
                      className="object-contain" 
                    />
                  </>
                ) : item.type === 'service' ? (
                  <DynamicIcon name={item.service_icon} className="h-5 w-5 text-[var(--primary)]" />
                ) : (
                  <Package className="h-4 w-4 text-gray-400" />
                )}
              </div>
              <span className="flex-1 truncate text-gray-700">{item.name}</span>
              <span className="text-gray-500">x{item.quantity}</span>
            </div>
          ))}
          {items.length > 3 && (
            <p className="text-center text-xs text-gray-400">+{items.length - 3} productos más</p>
          )}
          <div className="flex justify-between border-t border-gray-100 pt-3 font-bold">
            <span>Total:</span>
            <span className="text-[var(--primary)]">
              {new Intl.NumberFormat('es-PY', { style: 'currency', currency: currency }).format(
                total
              )}
            </span>
          </div>
        </div>
      </div>
    ) : null

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="sticky top-0 z-10 mb-8 border-b border-gray-100 bg-white shadow-sm">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link
            href={`/${clinic}/store`}
            className="flex items-center gap-2 font-bold text-gray-400 transition-all hover:text-[var(--primary)]"
          >
            <ArrowLeft className="h-5 w-5" />
            <span className="hidden sm:inline">Tienda</span>
          </Link>
          <h1 className="text-xl font-bold text-gray-900">{labels.title || 'Tu Carrito'}</h1>
          <div className="w-20"></div>
        </div>
      </div>

      <AuthGate
        clinic={clinic}
        redirect={`/${clinic}/cart`}
        whatsappNumber={whatsappNumber}
        title="Inicia sesión para tu carrito"
        description="Necesitas una cuenta para completar tu compra."
        icon="cart"
        preview={cartPreview}
      >
        <div className="container mx-auto px-4">
          {items.length === 0 ? (
            <div className="mx-auto max-w-2xl rounded-[2rem] border border-gray-100 bg-white px-6 py-24 text-center shadow-sm">
              <div className="mx-auto mb-8 flex h-24 w-24 items-center justify-center rounded-full bg-gray-50">
                <ShoppingBag className="h-10 w-10 text-gray-300" />
              </div>
              <h2 className="mb-3 text-3xl font-black text-gray-900">
                {labels.empty || 'Tu carrito está vacío'}
              </h2>
              <p className="mx-auto mb-10 max-w-md text-lg leading-relaxed text-gray-500">
                Parece que aún no has agregado productos. Explora nuestra tienda para encontrar lo
                mejor para tu mascota.
              </p>
              <Link
                href={`/${clinic}/store`}
                className="inline-flex items-center gap-3 rounded-2xl bg-gray-900 px-10 py-4 font-bold text-white shadow-xl transition-all hover:-translate-y-1 hover:bg-[var(--primary)] hover:shadow-2xl active:scale-95"
              >
                Ir a la Tienda <ArrowRight className="h-5 w-5" />
              </Link>
            </div>
          ) : (
            <div className="mx-auto grid max-w-7xl items-start gap-10 lg:grid-cols-[1fr_380px]">
              {/* Left Column: Items */}
              <div className="space-y-4">
                <div className="mb-4 flex items-center justify-between px-4">
                  <span className="text-xs font-bold uppercase tracking-wider text-gray-400">
                    {items.reduce((acc, i) => acc + i.quantity, 0)} items
                  </span>
                  <button
                    onClick={clearCart}
                    className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-red-400 transition-colors hover:text-red-500"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> {labels.clear_btn || 'Vaciar todo'}
                  </button>
                </div>

                {/* Quantity warning toast */}
                {quantityWarning && (
                  <div className="animate-in slide-in-from-top mx-4 mb-4 flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm font-medium text-amber-700">
                    <AlertCircle className="h-4 w-4 flex-shrink-0" />
                    {quantityWarning}
                  </div>
                )}

                {/* Service Groups - Service-centric view */}
                {organizedCart.serviceGroups.length > 0 && (
                  <div className="mb-6 space-y-4">
                    <div className="flex items-center gap-2 px-2 text-sm font-bold uppercase tracking-wider text-gray-500">
                      <PawPrint className="h-4 w-4" />
                      <span>Servicios</span>
                    </div>
                    {organizedCart.serviceGroups.map((group) => (
                      <ServiceGroup key={`${group.service_id}-${group.variant_name}`} {...group} />
                    ))}
                  </div>
                )}

                {/* Products Section */}
                {organizedCart.unassignedProducts.length > 0 && (
                  <div className="space-y-3">
                    {organizedCart.serviceGroups.length > 0 && (
                      <div className="mt-8 flex items-center gap-2 px-2 text-sm font-bold uppercase tracking-wider text-gray-500">
                        <Package className="h-4 w-4" />
                        <span>Productos</span>
                      </div>
                    )}
                    {organizedCart.unassignedProducts.map((item) => (
                      <div
                        key={`product-${item.id}`}
                        className="group flex items-center gap-4 rounded-3xl border border-gray-50 bg-white p-4 shadow-sm transition-all hover:border-gray-100 hover:shadow-md sm:gap-6 sm:p-5"
                      >
                        {/* Image Container */}
                        <div className="relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-gray-100/50 bg-gray-50 sm:h-24 sm:w-24">
                          {item.image_url ? (
                            <>
                              { }
                              <img
                                src={item.image_url}
                                alt={item.name}
                                className="h-full w-full object-contain p-3 transition-transform group-hover:scale-110"
                              />
                            </>
                          ) : (
                            <Package className="h-8 w-8 text-gray-300" />
                          )}
                        </div>

                        {/* Details */}
                        <div className="min-w-0 flex-1">
                          <div className="mb-2 flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
                            <h3 className="truncate pr-4 font-bold leading-tight text-gray-900 sm:text-lg">
                              {item.name}
                            </h3>
                            <span className="shrink-0 font-black text-gray-900 sm:text-lg">
                              {new Intl.NumberFormat('es-PY', {
                                style: 'currency',
                                currency: currency,
                              }).format(item.price * item.quantity)}
                            </span>
                          </div>

                          <div className="flex items-center justify-between gap-4">
                            <div className="flex flex-col gap-1">
                              <span className="bg-[var(--primary)]/5 inline-block rounded-md px-2 py-0.5 text-[10px] font-black uppercase tracking-widest text-[var(--primary)]">
                                {labels.item_product || 'Producto'}
                              </span>
                              {item.quantity > 1 && (
                                <span className="text-[10px] font-medium text-gray-400">
                                  {new Intl.NumberFormat('es-PY', {
                                    style: 'currency',
                                    currency: currency,
                                  }).format(item.price)}{' '}
                                  c/u
                                </span>
                              )}
                            </div>

                            {/* Quantity Control */}
                            <div className="flex items-center gap-3 rounded-xl border border-gray-100 bg-gray-50 p-1.5">
                              <button
                                onClick={() => handleQuantityUpdate(item.id, -1)}
                                className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-gray-500 shadow-sm transition-all hover:text-red-500 active:scale-90 disabled:opacity-50"
                                disabled={item.quantity <= 1}
                                aria-label="Reducir cantidad"
                              >
                                <Minus className="h-4 w-4" />
                              </button>
                              <span className="w-6 text-center text-sm font-bold text-gray-700">
                                {item.quantity}
                              </span>
                              <button
                                onClick={() => handleQuantityUpdate(item.id, 1)}
                                className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-gray-500 shadow-sm transition-all hover:text-[var(--primary)] active:scale-90 disabled:opacity-50"
                                disabled={
                                  item.quantity >= LIMITS.MAX_QUANTITY_PER_ITEM ||
                                  (item.stock !== undefined && item.quantity >= item.stock)
                                }
                                aria-label="Aumentar cantidad"
                              >
                                <Plus className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Remove button */}
                        <button
                          onClick={() => removeItem(item.id)}
                          className="rounded-full p-2 text-gray-200 transition-all hover:bg-red-50 hover:text-red-400 group-hover:text-gray-300"
                          aria-label={t('common.delete')}
                        >
                          <X className="h-5 w-5 text-current" strokeWidth={3} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Right Column: Summary Card */}
              <div className="mt-6 lg:sticky lg:top-24 lg:mt-0">
                <div className="relative overflow-hidden rounded-[2.5rem] border border-gray-50 bg-white p-8 shadow-2xl shadow-gray-200/50">
                  <div className="bg-[var(--primary)]/5 absolute right-0 top-0 -mr-16 -mt-16 h-32 w-32 rounded-full blur-3xl"></div>

                  <h3 className="mb-8 flex items-center gap-3 text-2xl font-bold text-gray-900">
                    <ShoppingBag className="h-6 w-6 text-[var(--primary)]" /> Resumen
                  </h3>

                  <div className="mb-8 space-y-4">
                    <div className="flex justify-between font-medium text-gray-500">
                      <span>Subtotal</span>
                      <span className="text-gray-900">
                        {new Intl.NumberFormat('es-PY', {
                          style: 'currency',
                          currency: currency,
                        }).format(total)}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm text-gray-400">
                      <span>Envío/Gestión</span>
                      <span className="text-xs font-bold uppercase tracking-tighter text-[var(--primary)]">
                        Por WhatsApp
                      </span>
                    </div>
                    <div className="my-4 h-px bg-gray-100"></div>
                    <div className="flex items-end justify-between">
                      <div>
                        <p className="mb-1 text-xs font-black uppercase tracking-widest text-gray-400">
                          {labels.total_label || 'Total Estimado'}
                        </p>
                        <span className="text-3xl font-black leading-none text-gray-900">
                          {new Intl.NumberFormat('es-PY', {
                            style: 'currency',
                            currency: currency,
                          }).format(finalTotal)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <Link
                    href={`/${clinic}/cart/checkout`}
                    className="flex w-full items-center justify-center gap-3 rounded-2xl bg-gray-900 px-8 py-5 font-bold text-white shadow-xl transition-all duration-200 hover:-translate-y-1 hover:bg-[var(--primary)] hover:shadow-2xl active:scale-95"
                  >
                    {labels.checkout_btn || 'Continuar compra'} <ArrowRight className="h-5 w-5" />
                  </Link>

                  <div className="mt-8 space-y-3">
                    <div className="flex items-center gap-3 rounded-xl border border-gray-100 bg-gray-50 p-3 text-xs text-gray-500">
                      <ShieldCheck className="h-5 w-5 shrink-0 text-green-500" />
                      <p>
                        Tu pedido será procesado de forma segura vía **WhatsApp** directamente con
                        la clínica.
                      </p>
                    </div>
                    <p className="text-center text-[10px] uppercase tracking-tighter text-gray-300">
                      Precios sujetos a disponibilidad local
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </AuthGate>
    </div>
  )
}
