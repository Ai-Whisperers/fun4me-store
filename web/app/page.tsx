import { Metadata } from 'next'
import {
  LandingNav,
  LandingFooter,
  Hero,
  TrustBadges,
  PricingTeaser,
  CTASection,
  FloatingWhatsApp,
} from '@/components/landing'

export const metadata: Metadata = {
  title: 'Vetic - Gestiona tu veterinaria sin complicaciones',
  description:
    'Software de gestión veterinaria diseñado para Paraguay. Agenda, historial clínico y recordatorios automáticos por WhatsApp. Simple, rápido y eficiente.',
  keywords: [
    'software veterinario',
    'gestión veterinaria',
    'historial clínico digital',
    'agenda veterinaria',
    'veterinaria paraguay',
    'sistema veterinario',
    'Vetic',
  ],
  authors: [{ name: 'Vetic' }],
  openGraph: {
    title: 'Vetic - Gestiona tu veterinaria sin complicaciones',
    description:
      'Software de gestión veterinaria diseñado para Paraguay. Agenda, historial clínico y recordatorios automáticos por WhatsApp.',
    type: 'website',
    locale: 'es_PY',
    siteName: 'Vetic',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Vetic - Gestiona tu veterinaria sin complicaciones',
    description: 'Software de gestión veterinaria diseñado para Paraguay.',
  },
  robots: {
    index: true,
    follow: true,
  },
}

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-slate-50">
      {/* Navigation - Sticky */}
      <LandingNav />

      {/* Hero Section - The Promise */}
      <Hero />

      {/* Trust Bar - Social Proof */}
      <TrustBadges />

      {/* Pricing Teaser - Simple 3-plan preview */}
      <PricingTeaser />

      {/* Final CTA */}
      <CTASection />

      {/* Footer */}
      <LandingFooter />

      {/* Floating WhatsApp Button */}
      <FloatingWhatsApp />
    </main>
  )
}
