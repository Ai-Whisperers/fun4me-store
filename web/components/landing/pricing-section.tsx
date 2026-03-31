'use client'

import React, { useState } from 'react'
import { Check, X, MessageCircle, Sparkles, Gift, Shield, Phone, ChevronDown, ChevronUp } from 'lucide-react'
import {
  pricingTiers,
  discounts,
  trialConfig,
  annualPlans,
  roiGuarantee,
  onboardingConfig,
  type PricingTier,
} from '@/lib/pricing/tiers'
import { tierCtaMessages } from '@/lib/pricing/tier-ui'
import { getWhatsAppUrl } from '@/lib/whatsapp'

// Extended billing period type with 3 options
type UIBillingPeriod = 'monthly' | 'yearly' | 'biennial'

// Billing period configuration
const billingPeriodConfig: Record<UIBillingPeriod, {
  label: string
  months: number
  discountPercent: number
  onboardingCalls: number
}> = {
  monthly: {
    label: 'Mensual',
    months: 1,
    discountPercent: 0,
    onboardingCalls: 1,
  },
  yearly: {
    label: 'Anual',
    months: 12,
    discountPercent: discounts.annual,
    onboardingCalls: 3,
  },
  biennial: {
    label: '2 Años',
    months: 24,
    discountPercent: 0.32,
    onboardingCalls: 6,
  },
}

// Simplified top features for cards (3-4 per tier)
const cardFeatures: Record<string, string[]> = {
  gratis: [
    'Pacientes ilimitados',
    'Historial clínico básico',
    'Agenda de citas',
    'Soporte por WhatsApp',
  ],
  profesional: [
    'Todo de Gratis +',
    'Tienda online con pagos',
    'Facturación electrónica SET',
    'Recordatorios automáticos',
  ],
}

// Full feature comparison for table
const featureComparison = [
  { category: 'Gestión de Pacientes', features: [
    { name: 'Pacientes ilimitados', gratis: true, profesional: true },
    { name: 'Historial clínico completo', gratis: true, profesional: true },
    { name: 'Vacunas y recordatorios', gratis: 'Básico', profesional: true },
    { name: 'Carnet digital QR', gratis: false, profesional: true },
    { name: 'Prescripciones PDF', gratis: false, profesional: true },
  ]},
  { category: 'Agenda y Citas', features: [
    { name: 'Agenda de citas', gratis: true, profesional: true },
    { name: 'Reservas online 24/7', gratis: false, profesional: true },
    { name: 'Recordatorios WhatsApp', gratis: false, profesional: true },
    { name: 'Múltiples veterinarios', gratis: false, profesional: true },
  ]},
  { category: 'Ventas y Facturación', features: [
    { name: 'Tienda online', gratis: false, profesional: true },
    { name: 'Facturación SET', gratis: false, profesional: true },
    { name: 'Pagos con Bancard/Zimple', gratis: false, profesional: true },
    { name: 'Reportes de ventas', gratis: false, profesional: true },
  ]},
  { category: 'Marketing y Presencia', features: [
    { name: 'Sitio web propio', gratis: 'Básico', profesional: 'Personalizado' },
    { name: 'Dominio personalizado', gratis: false, profesional: true },
    { name: 'SEO optimizado', gratis: false, profesional: true },
    { name: 'Google Maps integrado', gratis: true, profesional: true },
  ]},
  { category: 'Soporte', features: [
    { name: 'Soporte WhatsApp', gratis: true, profesional: 'Prioritario' },
    { name: 'Onboarding personalizado', gratis: false, profesional: true },
    { name: 'Capacitación incluida', gratis: false, profesional: true },
  ]},
]

/**
 * Calculate pricing for a tier with billing period
 */
function calculatePricing(tier: PricingTier, billingPeriod: UIBillingPeriod) {
  if (tier.enterprise || tier.monthlyPrice === 0) {
    return {
      monthlyEquivalent: 0,
      total: 0,
      savings: 0,
      monthlySavings: 0,
      onboardingCalls: 0,
    }
  }

  const config = billingPeriodConfig[billingPeriod]
  const { onboardingCalls } = config

  if (billingPeriod === 'biennial') {
    const biennialPlan = annualPlans.find(p => p.id === 'biennial')
    if (biennialPlan) {
      const fullPrice = tier.monthlyPrice * 24
      return {
        monthlyEquivalent: biennialPlan.monthlyEquivalent,
        total: biennialPlan.totalPrice,
        savings: fullPrice - biennialPlan.totalPrice,
        monthlySavings: tier.monthlyPrice - biennialPlan.monthlyEquivalent,
        onboardingCalls,
      }
    }
  }

  if (billingPeriod === 'yearly') {
    const annualPlan = annualPlans.find(p => p.id === 'annual')
    if (annualPlan) {
      const fullPrice = tier.monthlyPrice * 12
      return {
        monthlyEquivalent: annualPlan.monthlyEquivalent,
        total: annualPlan.totalPrice,
        savings: fullPrice - annualPlan.totalPrice,
        monthlySavings: tier.monthlyPrice - annualPlan.monthlyEquivalent,
        onboardingCalls,
      }
    }
  }

  return {
    monthlyEquivalent: tier.monthlyPrice,
    total: tier.monthlyPrice,
    savings: 0,
    monthlySavings: 0,
    onboardingCalls,
  }
}

function formatPrice(amount: number): string {
  return `Gs ${amount.toLocaleString('es-PY')}`
}

interface PricingCardProps {
  tier: PricingTier
  features: string[]
  cta: { cta: string; message: string }
  billingPeriod: UIBillingPeriod
}

function PricingCard({ tier, features, cta, billingPeriod }: PricingCardProps): React.ReactElement {
  const isFree = tier.monthlyPrice === 0
  const pricing = calculatePricing(tier, billingPeriod)
  const showSavings = billingPeriod !== 'monthly' && !isFree

  return (
    <div
      className={`relative flex flex-col rounded-2xl border-2 bg-[var(--landing-bg-white)] p-8 transition-all hover:shadow-lg ${
        tier.popular
          ? 'border-[var(--landing-primary)] ring-2 ring-[var(--landing-primary)] ring-offset-2'
          : 'border-[var(--landing-border)]'
      }`}
    >
      {/* Popular badge */}
      {tier.popular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="inline-flex items-center gap-1 rounded-full bg-[var(--landing-primary)] px-4 py-1.5 text-sm font-bold text-white">
            <Sparkles className="h-4 w-4" />
            Recomendado
          </span>
        </div>
      )}

      {/* Header */}
      <div className="mb-6">
        <h3 className="mb-2 text-2xl font-bold text-[var(--landing-text-primary)]">{tier.name}</h3>
        <p className="text-base text-slate-600">{tier.description}</p>
      </div>

      {/* Price - Simplified */}
      <div className="mb-6">
        <div className="flex items-baseline gap-2">
          <span className="text-5xl font-black text-[var(--landing-text-primary)]">
            {isFree ? 'Gratis' : formatPrice(pricing.monthlyEquivalent)}
          </span>
          {!isFree && <span className="text-lg text-slate-500">/mes</span>}
        </div>

        {/* Subtle billing info */}
        {showSavings && (
          <p className="mt-2 text-base text-slate-500">
            Facturado {billingPeriod === 'yearly' ? 'anualmente' : 'cada 2 años'}
            <span className="ml-2 inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-sm font-bold text-amber-700">
              Ahorrás {Math.round(billingPeriodConfig[billingPeriod].discountPercent * 100)}%
            </span>
          </p>
        )}

        {isFree && (
          <p className="mt-2 text-base text-slate-500">Para siempre, sin tarjeta</p>
        )}
      </div>

      {/* Top Features - Larger text */}
      <ul className="mb-8 flex-1 space-y-4">
        {features.map((feature, idx) => (
          <li key={idx} className="flex items-start gap-3 text-base">
            <Check className="h-5 w-5 shrink-0 text-[var(--landing-primary)] mt-0.5" />
            <span className="text-slate-700">{feature}</span>
          </li>
        ))}
      </ul>

      {/* CTA - Solid buttons for both */}
      <a
        href={getWhatsAppUrl(cta.message)}
        target="_blank"
        rel="noopener noreferrer"
        className={`flex w-full items-center justify-center gap-2 rounded-xl px-6 py-4 text-base font-bold transition-all ${
          tier.popular
            ? 'bg-[var(--landing-primary)] text-white shadow-lg hover:-translate-y-0.5 hover:bg-[var(--landing-primary-hover)]'
            : 'bg-slate-800 text-white hover:-translate-y-0.5 hover:bg-slate-900'
        }`}
      >
        <MessageCircle className="h-5 w-5" />
        {cta.cta}
      </a>

      {/* Payment methods text - Pro card only */}
      {tier.popular && (
        <p className="mt-3 text-center text-sm text-slate-500">
          Pagá con tarjeta, transferencia o efectivo
        </p>
      )}
    </div>
  )
}

function FeatureComparisonTable(): React.ReactElement {
  const [isExpanded, setIsExpanded] = useState(false)

  return (
    <div className="mx-auto max-w-4xl">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="mx-auto flex items-center gap-2 rounded-full bg-white px-6 py-3 text-base font-bold text-slate-700 shadow-sm ring-1 ring-slate-200 transition-all hover:bg-slate-50 hover:ring-slate-300"
      >
        {isExpanded ? (
          <>
            Ocultar comparación
            <ChevronUp className="h-5 w-5" />
          </>
        ) : (
          <>
            Comparar planes en detalle
            <ChevronDown className="h-5 w-5" />
          </>
        )}
      </button>

      {isExpanded && (
        <div className="mt-8 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="px-6 py-4 text-left text-base font-bold text-slate-900">Funcionalidad</th>
                <th className="px-6 py-4 text-center text-base font-bold text-slate-900">Gratis</th>
                <th className="px-6 py-4 text-center text-base font-bold text-[var(--landing-primary)]">Profesional</th>
              </tr>
            </thead>
            <tbody>
              {featureComparison.map((category) => (
                <React.Fragment key={category.category}>
                  <tr className="border-b border-slate-100 bg-slate-50/50">
                    <td colSpan={3} className="px-6 py-3 text-sm font-bold uppercase tracking-wide text-slate-500">
                      {category.category}
                    </td>
                  </tr>
                  {category.features.map((feature) => (
                    <tr key={feature.name} className="border-b border-slate-100 last:border-0">
                      <td className="px-6 py-4 text-base text-slate-700">{feature.name}</td>
                      <td className="px-6 py-4 text-center">
                        {feature.gratis === true ? (
                          <Check className="mx-auto h-5 w-5 text-green-500" />
                        ) : feature.gratis === false ? (
                          <X className="mx-auto h-5 w-5 text-slate-300" />
                        ) : (
                          <span className="text-sm text-slate-500">{feature.gratis}</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center">
                        {feature.profesional === true ? (
                          <Check className="mx-auto h-5 w-5 text-green-500" />
                        ) : feature.profesional === false ? (
                          <X className="mx-auto h-5 w-5 text-slate-300" />
                        ) : (
                          <span className="text-sm font-medium text-[var(--landing-primary)]">{feature.profesional}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export function PricingSection(): React.ReactElement {
  const [billingPeriod, setBillingPeriod] = useState<UIBillingPeriod>('yearly')

  const profesionalTier = pricingTiers.find((t) => t.monthlyPrice > 0)
  const yearlySavings = profesionalTier ? calculatePricing(profesionalTier, 'yearly').savings : 0
  const biennialSavings = profesionalTier ? calculatePricing(profesionalTier, 'biennial').savings : 0

  return (
    <section id="precios" className="relative overflow-hidden">
      {/* Pricing Cards Section */}
      <div className="bg-[var(--landing-bg)] py-16 md:py-24">
        <div className="container mx-auto px-4 md:px-6">
          {/* Billing Period Toggle */}
          <div className="mb-12 flex flex-col items-center gap-4 text-center">
            <div className="inline-flex items-center rounded-full bg-white p-1.5 shadow-sm ring-1 ring-slate-200">
              <button
                onClick={() => setBillingPeriod('monthly')}
                className={`rounded-full px-5 py-2.5 text-base font-bold transition-all ${
                  billingPeriod === 'monthly'
                    ? 'bg-[var(--landing-primary)] text-white shadow-md'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Mensual
              </button>
              <button
                onClick={() => setBillingPeriod('yearly')}
                className={`rounded-full px-5 py-2.5 text-base font-bold transition-all ${
                  billingPeriod === 'yearly'
                    ? 'bg-[var(--landing-primary)] text-white shadow-md'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Anual
                <span className="ml-2 rounded-full bg-amber-400 px-2 py-0.5 text-xs font-bold text-amber-900">
                  -{Math.round(discounts.annual * 100)}%
                </span>
              </button>
              <button
                onClick={() => setBillingPeriod('biennial')}
                className={`rounded-full px-5 py-2.5 text-base font-bold transition-all ${
                  billingPeriod === 'biennial'
                    ? 'bg-[var(--landing-primary)] text-white shadow-md'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                2 Años
                <span className="ml-2 rounded-full bg-amber-400 px-2 py-0.5 text-xs font-bold text-amber-900">
                  -32%
                </span>
              </button>
            </div>

            {/* Savings callout with amber accent */}
            {billingPeriod === 'yearly' && yearlySavings > 0 && (
              <p className="text-base font-medium text-amber-700">
                Ahorrás {formatPrice(yearlySavings)} al año
              </p>
            )}
            {billingPeriod === 'biennial' && biennialSavings > 0 && (
              <p className="text-base font-medium text-amber-700">
                Ahorrás {formatPrice(biennialSavings)} en 2 años
              </p>
            )}
          </div>

          {/* Pricing Cards - Equal height */}
          <div className="mx-auto grid max-w-4xl gap-8 md:grid-cols-2">
            {pricingTiers.map((tier) => (
              <PricingCard
                key={tier.id}
                tier={tier}
                features={cardFeatures[tier.id] || []}
                cta={tierCtaMessages[tier.id] || { cta: 'Contactar', message: 'Hola!' }}
                billingPeriod={billingPeriod}
              />
            ))}
          </div>

          {/* Promotion Badge */}
          <div className="mt-10 flex justify-center">
            <div className="inline-flex items-center gap-3 rounded-full bg-gradient-to-r from-[var(--landing-primary)] to-teal-500 px-6 py-3 text-base font-bold text-white shadow-lg">
              <Gift className="h-5 w-5" />
              <span>
                Promoción {trialConfig.promotionYear}: {trialConfig.freeMonths} meses GRATIS
              </span>
            </div>
          </div>

          {/* Compare Plans */}
          <div className="mt-12">
            <FeatureComparisonTable />
          </div>
        </div>
      </div>

      {/* Value Props Section - Extracted from cards */}
      <div className="bg-slate-50 py-16 md:py-20">
        <div className="container mx-auto px-4 md:px-6">
          <div className="mx-auto grid max-w-5xl gap-8 md:grid-cols-2">
            {/* ROI Guarantee */}
            {roiGuarantee.enabled && (
              <div className="rounded-2xl border border-green-200 bg-white p-8 shadow-sm">
                <div className="flex items-start gap-4">
                  <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-xl bg-green-100">
                    <Shield className="h-7 w-7 text-green-600" />
                  </div>
                  <div>
                    <h3 className="mb-2 text-xl font-bold text-slate-900">
                      Garantía de Retorno
                    </h3>
                    <p className="text-base text-slate-600">
                      Si no conseguís <strong className="text-green-700">6 clientes nuevos</strong> en 6 meses,
                      te damos los <strong className="text-green-700">siguientes 6 meses GRATIS</strong>.
                      Sin letra chica.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Onboarding */}
            <div className="rounded-2xl border border-blue-200 bg-white p-8 shadow-sm">
              <div className="flex items-start gap-4">
                <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-xl bg-blue-100">
                  <Phone className="h-7 w-7 text-blue-600" />
                </div>
                <div>
                  <h3 className="mb-2 text-xl font-bold text-slate-900">
                    Onboarding Personalizado
                  </h3>
                  <p className="text-base text-slate-600">
                    <strong className="text-blue-700">{onboardingConfig.initialSetupMinutes} min de setup</strong> +
                    <strong className="text-blue-700"> {onboardingConfig.weeklyCheckInCount} check-ins semanales</strong>.
                    No estás solo, te acompañamos hasta que tu clínica despegue.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Extra info badges */}
          <div className="mt-10 flex flex-wrap justify-center gap-4">
            <div className="rounded-full bg-white px-5 py-2.5 text-base text-slate-600 shadow-sm ring-1 ring-slate-200">
              <span className="font-bold text-[var(--landing-primary)]">{Math.round(discounts.referral * 100)}%</span> descuento por referidos
            </div>
            <div className="rounded-full bg-white px-5 py-2.5 text-base text-slate-600 shadow-sm ring-1 ring-slate-200">
              Solo <span className="font-bold text-[var(--landing-primary)]">3%</span> comisión en ventas online
            </div>
            <div className="rounded-full bg-white px-5 py-2.5 text-base text-slate-600 shadow-sm ring-1 ring-slate-200">
              Pagos: <span className="font-bold">Bancard, Zimple, Transferencia</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
