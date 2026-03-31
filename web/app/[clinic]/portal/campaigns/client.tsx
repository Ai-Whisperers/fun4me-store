'use client'
import { useState, useEffect, useCallback } from 'react'
import { Tag, Calendar, Loader2, Percent, DollarSign } from 'lucide-react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

/**
 * Campaign item with product details
 */
interface CampaignItem {
  id: string
  discount_type: 'percentage' | 'fixed'
  discount_value: number
  store_products: {
    name: string
    base_price: number
  } | null
}

/**
 * Campaign with nested items
 */
interface Campaign {
  id: string
  name: string
  start_date: string
  end_date: string
  store_campaign_items: CampaignItem[] | null
}

/**
 * Pet Owner Campaigns View - READ ONLY
 * Shows active and upcoming promotions for pet owners.
 * Campaign management is done in the staff dashboard.
 */
export default function CampaignsClient() {
  const { clinic } = useParams() as { clinic: string }
  const supabase = createClient()

  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    setLoading(true)
    const { data: camps } = await supabase
      .from('store_campaigns')
      .select('*, store_campaign_items(*, store_products(name, base_price))')
      .eq('tenant_id', clinic)
      .gte('end_date', new Date().toISOString()) // Only active or upcoming
      .order('start_date', { ascending: true })

    setCampaigns((camps as Campaign[]) || [])
    setLoading(false)
  }, [clinic, supabase])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  if (loading)
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--primary)]" />
      </div>
    )

  return (
    <div className="space-y-8 pb-20">
      <div className="rounded-3xl border border-gray-100 bg-white p-8 shadow-sm">
        <h1 className="mb-2 text-3xl font-black text-gray-900">Promociones</h1>
        <p className="text-gray-500">
          Descubre las ofertas y descuentos especiales disponibles para ti.
        </p>
      </div>

      {/* Empty State */}
      {campaigns.length === 0 && (
        <div className="flex min-h-[300px] flex-col items-center justify-center rounded-3xl border border-gray-100 bg-white p-12 text-center shadow-sm">
          <Tag className="mb-4 h-16 w-16 text-gray-200" />
          <h3 className="mb-2 text-xl font-bold text-gray-700">No hay promociones activas</h3>
          <p className="text-gray-500">
            Vuelve pronto para ver ofertas especiales y descuentos exclusivos.
          </p>
        </div>
      )}

      {/* Active Campaigns Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {campaigns.map((camp) => {
          const now = new Date()
          const isActive = new Date(camp.start_date) <= now && new Date(camp.end_date) >= now
          const isUpcoming = new Date(camp.start_date) > now

          return (
            <div
              key={camp.id}
              className="group relative overflow-hidden rounded-3xl border border-gray-100 bg-white p-6 shadow-sm transition hover:shadow-md"
            >
              <div
                className={`absolute right-0 top-0 rounded-bl-2xl px-4 py-1 text-[10px] font-black uppercase tracking-widest ${
                  isActive
                    ? 'bg-green-500 text-white'
                    : isUpcoming
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 text-gray-400'
                }`}
              >
                {isActive ? 'Activa' : 'Próximamente'}
              </div>

              <h3 className="mb-4 text-xl font-bold text-gray-900">{camp.name}</h3>

              <div className="mb-6 space-y-3">
                <div className="flex items-center gap-3 text-sm text-gray-500">
                  <Calendar className="h-4 w-4 shrink-0" />
                  <span>
                    {new Date(camp.start_date).toLocaleDateString('es-PY')} -{' '}
                    {new Date(camp.end_date).toLocaleDateString('es-PY')}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-sm text-gray-500">
                  <Tag className="h-4 w-4 shrink-0" />
                  <span>{camp.store_campaign_items?.length || 0} productos en descuento</span>
                </div>
              </div>

              {/* Products in Campaign */}
              {camp.store_campaign_items && camp.store_campaign_items.length > 0 && (
                <div className="space-y-2 border-t border-gray-50 pt-4">
                  <p className="text-xs font-black uppercase tracking-widest text-gray-400">
                    Productos incluidos
                  </p>
                  <div className="max-h-32 space-y-2 overflow-y-auto">
                    {camp.store_campaign_items.slice(0, 5).map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between rounded-lg bg-gray-50 p-2 text-sm"
                      >
                        <span className="font-medium text-gray-700 truncate">
                          {item.store_products?.name}
                        </span>
                        <span
                          className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold ${
                            item.discount_type === 'percentage'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-blue-100 text-blue-700'
                          }`}
                        >
                          {item.discount_type === 'percentage' ? (
                            <>
                              <Percent className="h-3 w-3" />
                              {item.discount_value}%
                            </>
                          ) : (
                            <>
                              <DollarSign className="h-3 w-3" />
                              {item.discount_value.toLocaleString()} OFF
                            </>
                          )}
                        </span>
                      </div>
                    ))}
                    {camp.store_campaign_items.length > 5 && (
                      <p className="text-center text-xs text-gray-400">
                        +{camp.store_campaign_items.length - 5} productos más
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
