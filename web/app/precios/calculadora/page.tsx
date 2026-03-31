import type { Metadata } from 'next'
import {
  LandingNav,
  LandingFooter,
  FloatingWhatsApp,
  ROICalculatorDetailed,
} from '@/components/landing'

export const metadata: Metadata = {
  title: 'Calculadora de Costos | Vetic',
  description:
    'Calculadora interactiva para estimar costos y beneficios de Vetic para tu veterinaria.',
  robots: {
    index: false, // Hidden page - don't index
    follow: false,
  },
}

export default function CalculadoraPage(): React.ReactElement {
  return (
    <main className="min-h-screen bg-[var(--landing-bg)]">
      <LandingNav />

      {/* Header */}
      <section className="bg-gradient-to-b from-[var(--landing-bg)] to-[var(--landing-bg-muted)] pt-24 pb-8">
        <div className="container mx-auto px-4 md:px-6 text-center">
          <h1 className="mb-4 text-3xl font-black text-[var(--landing-text-primary)] md:text-4xl">
            Calculadora de Costos
          </h1>
          <p className="mx-auto max-w-2xl text-lg text-[var(--landing-text-secondary)]">
            Estima tus costos y beneficios potenciales con Vetic.
          </p>
        </div>
      </section>

      {/* ROI Calculator - Detailed Version */}
      <ROICalculatorDetailed />

      <LandingFooter />
      <FloatingWhatsApp />
    </main>
  )
}
