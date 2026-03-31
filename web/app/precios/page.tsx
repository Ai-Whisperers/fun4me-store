import {
  CreditCard,
  Smartphone,
  Building2,
  ArrowRight,
  HelpCircle,
} from 'lucide-react'
import Link from 'next/link'
import {
  LandingNav,
  LandingFooter,
  FloatingWhatsApp,
  PageHeader,
  PricingSection,
} from '@/components/landing'
import { discounts } from '@/lib/pricing/tiers'
import { getWhatsAppUrl, pricingMessages } from '@/lib/whatsapp'

export default function PreciosPage(): React.ReactElement {
  return (
    <main className="min-h-screen bg-[var(--landing-bg)]">
      <LandingNav />

      <PageHeader
        badge="Precios Simples"
        title="Solo 2 planes."
        highlight="Sin complicaciones."
        description="Gratis para empezar, Profesional para crecer. Sin costos ocultos, sin contratos."
      />

      {/* Pricing Cards - Uses shared component with centralized pricing config */}
      <PricingSection />

      {/* Payment Methods */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4 md:px-6">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="mb-4 text-2xl font-bold text-[var(--landing-text-primary)] md:text-3xl">
              Métodos de Pago
            </h2>
            <p className="mb-8 text-[var(--landing-text-secondary)]">
              Aceptamos múltiples formas de pago para tu comodidad.
            </p>
            <div className="flex flex-wrap justify-center gap-6">
              <div className="flex items-center gap-2 rounded-lg bg-[var(--landing-bg-white)] px-6 py-3 shadow-sm ring-1 ring-[var(--landing-border-light)]">
                <CreditCard className="h-5 w-5 text-[var(--landing-text-secondary)]" />
                <span className="font-medium text-[var(--landing-text-secondary)]">Bancard</span>
              </div>
              <div className="flex items-center gap-2 rounded-lg bg-[var(--landing-bg-white)] px-6 py-3 shadow-sm ring-1 ring-[var(--landing-border-light)]">
                <Smartphone className="h-5 w-5 text-[var(--landing-text-secondary)]" />
                <span className="font-medium text-[var(--landing-text-secondary)]">Zimple</span>
              </div>
              <div className="flex items-center gap-2 rounded-lg bg-[var(--landing-bg-white)] px-6 py-3 shadow-sm ring-1 ring-[var(--landing-border-light)]">
                <Building2 className="h-5 w-5 text-[var(--landing-text-secondary)]" />
                <span className="font-medium text-[var(--landing-text-secondary)]">Transferencia</span>
              </div>
            </div>
            <p className="mt-6 text-sm text-[var(--landing-primary)] font-medium">
              {Math.round(discounts.annual * 100)}% de descuento en planes anuales
            </p>
          </div>
        </div>
      </section>

      {/* Link to FAQ */}
      <section className="bg-[var(--landing-bg-white)] py-12">
        <div className="container mx-auto px-4 md:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <div className="inline-flex items-center gap-3 rounded-xl bg-[var(--landing-bg-muted)] px-6 py-4">
              <HelpCircle className="h-5 w-5 text-[var(--landing-primary)]" />
              <span className="text-[var(--landing-text-secondary)]">¿Tenés preguntas sobre precios?</span>
              <Link
                href="/faq"
                className="font-bold text-[var(--landing-primary)] hover:underline"
              >
                Ver FAQ
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-[var(--landing-primary)] py-16 md:py-24">
        <div className="container mx-auto px-4 text-center md:px-6">
          <h2 className="mb-6 text-3xl font-bold text-white md:text-4xl">
            ¿Tenés dudas sobre qué plan elegir?
          </h2>
          <p className="mx-auto mb-8 max-w-2xl text-lg text-white/80">
            Hablemos por WhatsApp y te ayudamos a elegir el plan perfecto para tu clínica.
          </p>
          <a
            href={getWhatsAppUrl(pricingMessages.doubts())}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 rounded-full bg-[var(--landing-bg-white)] px-8 py-4 text-base font-bold text-[var(--landing-primary)] shadow-lg transition-all hover:-translate-y-1 hover:shadow-xl"
          >
            Consultar por WhatsApp
            <ArrowRight className="h-5 w-5" />
          </a>
        </div>
      </section>

      <LandingFooter />
      <FloatingWhatsApp />
    </main>
  )
}
