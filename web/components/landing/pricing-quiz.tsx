'use client'

import { useState } from 'react'
import {
  HelpCircle,
  ArrowRight,
  Check,
  Sparkles,
  MessageCircle,
  Gift,
  Stethoscope,
} from 'lucide-react'
import {
  pricingTiers,
  trialConfig,
  formatTierPrice,
  type TierId,
} from '@/lib/pricing/tiers'
import {
  tierIconsLarge,
  tierQuizReasons,
  tierQuizCtaMessages,
  tierTaglines,
} from '@/lib/pricing/tier-ui'
import { getWhatsAppUrl } from '@/lib/whatsapp'

interface RecommendedPlan {
  id: TierId
  name: string
  icon: React.ReactNode
  color: string
  monthlyPrice: number
  priceDisplay: string
  tagline: string
  reasons: string[]
  ctaMessage: string
  showAds?: boolean
  freeMonths?: number
}

// Build plans from centralized config
const plans: Record<TierId, RecommendedPlan> = {} as Record<TierId, RecommendedPlan>
pricingTiers.forEach((tier) => {
  plans[tier.id] = {
    id: tier.id,
    name: tier.name,
    icon: tierIconsLarge[tier.id],
    color: tier.color,
    monthlyPrice: tier.monthlyPrice,
    priceDisplay: formatTierPrice(tier),
    tagline: tierTaglines[tier.id],
    reasons: tierQuizReasons[tier.id],
    ctaMessage: tierQuizCtaMessages[tier.id],
    showAds: !tier.features.adFree,
    freeMonths: tier.id === 'profesional' ? trialConfig.freeMonths : undefined,
  }
})

/**
 * Simplified 2-tier pricing selector
 * With only 2 tiers, a full quiz isn't necessary
 */
export function PricingQuiz(): React.ReactElement {
  const [selectedTier, setSelectedTier] = useState<TierId | null>(null)

  // Non-null assertions safe: 'gratis' and 'profesional' are guaranteed core tier IDs
  /* eslint-disable @typescript-eslint/no-non-null-assertion */
  const gratisTier = pricingTiers.find((t) => t.id === 'gratis')!
  const profesionalTier = pricingTiers.find((t) => t.id === 'profesional')!
  /* eslint-enable @typescript-eslint/no-non-null-assertion */

  if (selectedTier) {
    const plan = plans[selectedTier]

    return (
      <section id="quiz" className="relative overflow-hidden bg-[#0F172A] py-20 md:py-28">
        <div
          className="absolute left-1/2 top-1/2 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full blur-[150px]"
          style={{ backgroundColor: `${plan.color}10` }}
        />

        <div className="container relative z-10 mx-auto px-4 md:px-6">
          <div className="mx-auto max-w-2xl">
            {/* Result Card */}
            <div
              className="rounded-3xl border-2 bg-gradient-to-br from-white/10 to-white/5 p-8 md:p-10"
              style={{ borderColor: `${plan.color}50` }}
            >
              {/* Header */}
              <div className="mb-8 text-center">
                <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2">
                  <Sparkles className="h-4 w-4 text-[#2DCEA3]" />
                  <span className="text-sm text-white/70">Tu plan elegido</span>
                </div>

                <div
                  className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-2xl"
                  style={{
                    backgroundColor: `${plan.color}20`,
                    color: plan.color,
                  }}
                >
                  {plan.icon}
                </div>

                <h2 className="mb-2 text-3xl font-black text-white md:text-4xl">
                  Plan {plan.name}
                </h2>
                <p className="text-white/60">{plan.tagline}</p>

                {/* Price */}
                <div className="mt-6">
                  <div className="text-4xl font-black" style={{ color: plan.color }}>
                    {plan.priceDisplay}
                    {plan.monthlyPrice > 0 && (
                      <span className="text-lg font-medium text-white/50">/mes</span>
                    )}
                  </div>

                  {/* Free months badge */}
                  {plan.freeMonths && (
                    <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-green-500/20 px-3 py-1.5">
                      <Gift className="h-4 w-4 text-green-400" />
                      <span className="text-sm font-bold text-green-400">
                        {plan.freeMonths} meses GRATIS
                      </span>
                    </div>
                  )}

                  {/* Ads notice for free tier */}
                  {plan.showAds && (
                    <p className="mt-3 text-sm text-amber-400/80">
                      Este plan muestra anuncios
                    </p>
                  )}
                </div>
              </div>

              {/* Reasons */}
              <div className="mb-8 space-y-3">
                {plan.reasons.map((reason, idx) => (
                  <div key={idx} className="flex items-start gap-3">
                    <div
                      className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full"
                      style={{ backgroundColor: `${plan.color}30` }}
                    >
                      <Check className="h-3 w-3" style={{ color: plan.color }} />
                    </div>
                    <span className="text-white/80">{reason}</span>
                  </div>
                ))}
              </div>

              {/* CTA */}
              <div className="space-y-4">
                <a
                  href={getWhatsAppUrl(plan.ctaMessage)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex w-full items-center justify-center gap-2 rounded-xl py-4 text-lg font-bold text-white transition-all hover:-translate-y-0.5"
                  style={{
                    backgroundColor: plan.color,
                    boxShadow: `0 10px 40px ${plan.color}30`,
                  }}
                >
                  <MessageCircle className="h-5 w-5" />
                  Elegir {plan.name}
                </a>

                <button
                  onClick={() => setSelectedTier(null)}
                  className="w-full py-2 text-sm text-white/50 hover:text-white/80"
                >
                  Ver otras opciones
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section id="quiz" className="relative overflow-hidden bg-[#0F172A] py-20 md:py-28">
      <div className="absolute left-1/2 top-1/2 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#2DCEA3]/5 blur-[150px]" />

      <div className="container relative z-10 mx-auto px-4 md:px-6">
        <div className="mx-auto max-w-4xl">
          {/* Header */}
          <div className="mb-12 text-center">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2">
              <HelpCircle className="h-4 w-4 text-[#2DCEA3]" />
              <span className="text-sm text-white/70">Elige tu plan</span>
            </div>
            <h2 className="mb-4 text-3xl font-black text-white md:text-4xl lg:text-5xl">
              ¿Cual es el plan ideal para tu clinica?
            </h2>
            <p className="mx-auto max-w-xl text-lg text-white/60">
              Solo tenemos 2 planes. Elige el que mejor se adapte a tus necesidades.
            </p>
          </div>

          {/* Plan Cards */}
          <div className="grid gap-6 md:grid-cols-2">
            {/* Free Plan */}
            <button
              onClick={() => setSelectedTier('gratis')}
              className="group rounded-2xl border-2 border-white/10 bg-white/5 p-6 text-left transition-all hover:border-white/30 hover:bg-white/10"
            >
              <div className="mb-4 flex items-center gap-3">
                <div
                  className="flex h-12 w-12 items-center justify-center rounded-xl"
                  style={{ backgroundColor: `${gratisTier.color}20`, color: gratisTier.color }}
                >
                  <Gift className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">{gratisTier.name}</h3>
                  <p className="text-sm text-white/50">{gratisTier.description}</p>
                </div>
              </div>

              <div className="mb-4">
                <span className="text-3xl font-black text-white">Gratis</span>
              </div>

              <ul className="mb-6 space-y-2">
                <li className="flex items-center gap-2 text-sm text-white/70">
                  <Check className="h-4 w-4 text-[#2DCEA3]" />
                  Sitio web profesional
                </li>
                <li className="flex items-center gap-2 text-sm text-white/70">
                  <Check className="h-4 w-4 text-[#2DCEA3]" />
                  Reservas por WhatsApp
                </li>
                <li className="flex items-center gap-2 text-sm text-white/70">
                  <Check className="h-4 w-4 text-[#2DCEA3]" />
                  Sin costo mensual
                </li>
              </ul>

              <div className="flex items-center justify-between">
                <span className="text-sm text-white/50">Ideal para empezar</span>
                <ArrowRight className="h-5 w-5 text-white/30 transition-transform group-hover:translate-x-1 group-hover:text-white/70" />
              </div>
            </button>

            {/* Professional Plan */}
            <button
              onClick={() => setSelectedTier('profesional')}
              className="group relative rounded-2xl border-2 bg-white/5 p-6 text-left transition-all hover:bg-white/10"
              style={{ borderColor: `${profesionalTier.color}50` }}
            >
              {/* Recommended badge */}
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="inline-flex items-center gap-1 rounded-full bg-[#2DCEA3] px-3 py-1 text-xs font-bold text-white">
                  <Sparkles className="h-3 w-3" />
                  Recomendado
                </span>
              </div>

              <div className="mb-4 flex items-center gap-3">
                <div
                  className="flex h-12 w-12 items-center justify-center rounded-xl"
                  style={{ backgroundColor: `${profesionalTier.color}20`, color: profesionalTier.color }}
                >
                  <Stethoscope className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">{profesionalTier.name}</h3>
                  <p className="text-sm text-white/50">{profesionalTier.description}</p>
                </div>
              </div>

              <div className="mb-4">
                <span className="text-3xl font-black" style={{ color: profesionalTier.color }}>
                  Gs {profesionalTier.monthlyPrice.toLocaleString('es-PY')}
                </span>
                <span className="text-lg text-white/50">/mes</span>
                <div className="mt-1 inline-flex items-center gap-1 rounded-full bg-green-500/20 px-2 py-0.5 text-xs font-bold text-green-400">
                  <Gift className="h-3 w-3" />
                  {trialConfig.freeMonths} meses GRATIS
                </div>
              </div>

              <ul className="mb-6 space-y-2">
                <li className="flex items-center gap-2 text-sm text-white/70">
                  <Check className="h-4 w-4 text-[#2DCEA3]" />
                  Todo incluido
                </li>
                <li className="flex items-center gap-2 text-sm text-white/70">
                  <Check className="h-4 w-4 text-[#2DCEA3]" />
                  Sin anuncios
                </li>
                <li className="flex items-center gap-2 text-sm text-white/70">
                  <Check className="h-4 w-4 text-[#2DCEA3]" />
                  Usuarios ilimitados
                </li>
                <li className="flex items-center gap-2 text-sm text-white/70">
                  <Check className="h-4 w-4 text-[#2DCEA3]" />
                  Soporte prioritario 24/7
                </li>
              </ul>

              <div className="flex items-center justify-between">
                <span className="text-sm text-white/50">Para clinicas profesionales</span>
                <ArrowRight className="h-5 w-5 text-white/30 transition-transform group-hover:translate-x-1 group-hover:text-white/70" />
              </div>
            </button>
          </div>

          {/* Bottom note */}
          <p className="mt-8 text-center text-sm text-white/40">
            Comision del 3% solo en ventas de la tienda online (Plan Profesional)
          </p>
        </div>
      </div>
    </section>
  )
}

export default PricingQuiz
