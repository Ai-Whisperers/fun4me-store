import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { RefreshCw, ShoppingBag, ArrowLeft, Package } from 'lucide-react'
import { SubscriptionsClient } from './client'

interface SubscriptionsPageProps {
  params: Promise<{ clinic: string }>
}

export default async function SubscriptionsPage({ params }: SubscriptionsPageProps) {
  const supabase = await createClient()
  const { clinic } = await params

  // Auth Check
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    redirect(`/${clinic}/portal/login?returnTo=/${clinic}/portal/subscriptions`)
  }

  // Get user's profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('tenant_id')
    .eq('id', user.id)
    .single()

  if (!profile) {
    redirect(`/${clinic}/portal/login`)
  }

  // Fetch subscriptions using the helper function
  const { data: subscriptions, error } = await supabase.rpc('get_customer_subscriptions', {
    p_customer_id: user.id,
    p_tenant_id: profile.tenant_id,
  })

  // Transform data for client
  const subscriptionsList = (subscriptions || []).map(
    (sub: {
      id: string
      product_id: string
      product_name: string
      product_image: string | null
      variant_id: string | null
      variant_name: string | null
      quantity: number
      frequency_days: number
      next_order_date: string
      status: string
      subscribed_price: number
      current_price: number
      price_changed: boolean
    }) => ({
      id: sub.id,
      productId: sub.product_id,
      productName: sub.product_name,
      productImage: sub.product_image,
      variantId: sub.variant_id,
      variantName: sub.variant_name,
      quantity: sub.quantity,
      frequencyDays: sub.frequency_days,
      nextOrderDate: sub.next_order_date,
      status: sub.status,
      subscribedPrice: sub.subscribed_price,
      currentPrice: sub.current_price,
      priceChanged: sub.price_changed,
    })
  )

  return (
    <div className="container mx-auto max-w-6xl px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <Link
          href={`/${clinic}/store`}
          className="mb-4 inline-flex items-center gap-2 text-[var(--text-secondary)] transition hover:text-[var(--primary)]"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver a la tienda
        </Link>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-purple-100">
              <RefreshCw className="h-6 w-6 text-purple-500" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-[var(--text-primary)]">Suscripciones a Productos</h1>
              <p className="text-[var(--text-muted)]">
                {subscriptionsList.length}{' '}
                {subscriptionsList.length === 1 ? 'suscripción activa' : 'suscripciones'}
              </p>
            </div>
          </div>
          <Link
            href={`/${clinic}/portal/service-subscriptions`}
            className="inline-flex items-center gap-2 rounded-xl border border-[var(--primary)] px-4 py-2 font-medium text-[var(--primary)] transition hover:bg-[var(--primary)]/10"
          >
            <RefreshCw className="h-4 w-4" />
            Ver Suscripciones a Servicios
          </Link>
        </div>
      </div>

      {/* Content */}
      {subscriptionsList.length === 0 ? (
        <div className="py-16 text-center">
          <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-gray-100">
            <ShoppingBag className="h-12 w-12 text-gray-400" />
          </div>
          <h2 className="mb-2 text-xl font-bold text-[var(--text-primary)]">
            No tienes suscripciones activas
          </h2>
          <p className="mx-auto mb-6 max-w-md text-[var(--text-muted)]">
            Suscríbete a tus productos favoritos para recibirlos automáticamente cada cierto tiempo.
          </p>
          <Link
            href={`/${clinic}/store`}
            className="inline-flex items-center gap-2 rounded-xl bg-[var(--primary)] px-6 py-3 font-bold text-white transition hover:brightness-110"
          >
            <Package className="h-5 w-5" />
            Explorar Tienda
          </Link>
        </div>
      ) : (
        <SubscriptionsClient clinic={clinic} initialSubscriptions={subscriptionsList} />
      )}
    </div>
  )
}
