'use client'

import {
  Calendar,
  Clock,
  CheckCircle,
  ArrowRight,
  ExternalLink,
  HelpCircle,
} from 'lucide-react'
import Link from 'next/link'
import {
  LandingNav,
  LandingFooter,
  FloatingWhatsApp,
  PageHeader,
} from '@/components/landing'
import { getWhatsAppUrl, landingMessages } from '@/lib/whatsapp'

// What to expect items
const expectations = [
  {
    icon: Clock,
    title: '30 minutos',
    description: 'Una demo rápida y personalizada a tu tipo de clínica.',
  },
  {
    icon: CheckCircle,
    title: 'Sin compromiso',
    description: 'Solo queremos mostrarte cómo Vetic puede ayudarte.',
  },
  {
    icon: Calendar,
    title: 'Tu horario',
    description: 'Elegí el día y hora que mejor te convenga.',
  },
]

function FeatureShowcase() {
  const features = [
    { title: 'Gestión de citas', desc: 'Calendario inteligente y recordatorios automáticos' },
    { title: 'Historiales clínicos', desc: 'Toda la información de tus pacientes en un lugar' },
    { title: 'Facturación', desc: 'Control de ingresos y gastos simplificado' },
    { title: 'Inventario', desc: 'Stock de productos y medicamentos al día' },
  ]

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-teal-900 to-slate-900 p-8 md:p-12">
      {/* Grid pattern overlay */}
      <div
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
      />

      <div className="relative z-10">
        <h3 className="mb-2 text-lg font-medium text-teal-200">Lo que verás en la demo</h3>
        <h2 className="mb-8 text-2xl font-bold text-white md:text-3xl">
          Todo lo que necesita tu clínica
        </h2>

        <div className="grid gap-4 md:grid-cols-2">
          {features.map((feature, index) => (
            <div key={index} className="flex items-start gap-3 rounded-xl bg-white/5 p-4 backdrop-blur-sm">
              <CheckCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-teal-400" />
              <div>
                <h4 className="font-bold text-white">{feature.title}</h4>
                <p className="text-sm text-teal-100">{feature.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function DemoPage() {
  return (
    <main className="min-h-screen bg-slate-50">
      <LandingNav />

      <PageHeader
        badge="Demo Gratuita"
        title="Mira Vetic"
        highlight="en acción."
        description="Agenda una demo personalizada de 30 minutos y descubre cómo Vetic puede transformar la gestión de tu clínica."
      />

      {/* Video Section */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4 md:px-6">
          <div className="mx-auto max-w-4xl">
            <FeatureShowcase />

            {/* Live Demo Link */}
            <div className="mt-8 rounded-xl border border-teal-200 bg-teal-50 p-6 text-center">
              <h3 className="mb-2 font-bold text-teal-900">
                ¿Querés explorar por tu cuenta?
              </h3>
              <p className="mb-4 text-teal-700">
                Accede a nuestra demo en vivo y navegá todas las funcionalidades.
              </p>
              <Link
                href="/terrapet"
                className="inline-flex items-center gap-2 rounded-full bg-teal-600 px-6 py-3 font-bold text-white transition-all hover:bg-teal-700"
              >
                Ir a Demo en Vivo
                <ExternalLink className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Book a Call Section */}
      <section className="bg-white py-16 md:py-24">
        <div className="container mx-auto px-4 md:px-6">
          <div className="mx-auto max-w-4xl">
            <div className="grid gap-12 lg:grid-cols-2 lg:items-start">
              {/* Left: Info */}
              <div>
                <h2 className="mb-6 text-2xl font-bold text-slate-900 md:text-3xl">
                  Agenda tu demo personalizada
                </h2>
                <p className="mb-8 text-lg text-slate-600">
                  Te mostramos cómo Vetic se adapta a las necesidades específicas
                  de tu clínica, sin jerga técnica ni presión de venta.
                </p>

                {/* What to expect */}
                <div className="space-y-4">
                  {expectations.map((item, index) => (
                    <div key={index} className="flex items-start gap-4">
                      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-teal-50">
                        <item.icon className="h-5 w-5 text-teal-600" />
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900">{item.title}</h4>
                        <p className="text-sm text-slate-600">{item.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right: WhatsApp Scheduling */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-8">
                <div className="mb-6 text-center">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-teal-100">
                    <Calendar className="h-8 w-8 text-teal-600" />
                  </div>
                  <h3 className="mb-2 text-lg font-bold text-slate-900">
                    Elegí tu horario
                  </h3>
                  <p className="text-sm text-slate-600">
                    Lunes a Viernes, 9:00 - 18:00
                  </p>
                </div>

                {/* Quick scheduling options */}
                <div className="mb-6 space-y-3">
                  <div className="rounded-xl bg-white p-4 text-center shadow-sm">
                    <p className="text-sm font-medium text-slate-700">
                      Respuesta en menos de 2 horas
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-lg bg-white p-3 text-center shadow-sm">
                      <p className="text-xs text-slate-500">Mañana</p>
                      <p className="font-bold text-slate-700">9-12 hs</p>
                    </div>
                    <div className="rounded-lg bg-white p-3 text-center shadow-sm">
                      <p className="text-xs text-slate-500">Tarde</p>
                      <p className="font-bold text-slate-700">14-18 hs</p>
                    </div>
                  </div>
                </div>

                {/* WhatsApp CTA - more prominent */}
                <a
                  href={getWhatsAppUrl(landingMessages.scheduleDemo())}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-teal-600 py-4 font-bold text-white shadow-lg transition-all hover:bg-teal-700 hover:-translate-y-0.5"
                >
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                  </svg>
                  Agendar Demo por WhatsApp
                  <ArrowRight className="h-5 w-5" />
                </a>
                <p className="mt-3 text-center text-xs text-slate-500">
                  Atención personalizada • Sin compromiso
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Link to FAQ */}
      <section className="py-12">
        <div className="container mx-auto px-4 md:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <div className="inline-flex items-center gap-3 rounded-xl bg-white px-6 py-4 shadow-sm">
              <HelpCircle className="h-5 w-5 text-teal-600" />
              <span className="text-slate-600">¿Tenés preguntas sobre la demo?</span>
              <Link
                href="/faq"
                className="font-bold text-teal-600 hover:underline"
              >
                Ver FAQ
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-teal-600 py-16 md:py-24">
        <div className="container mx-auto px-4 text-center md:px-6">
          <h2 className="mb-6 text-3xl font-bold text-white md:text-4xl">
            ¿Listo para ver Vetic?
          </h2>
          <p className="mx-auto mb-8 max-w-2xl text-lg text-teal-100">
            30 minutos que pueden cambiar la forma en que gestionás tu clínica.
          </p>
          <a
            href={getWhatsAppUrl(landingMessages.scheduleDemo())}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-8 py-4 text-base font-bold text-teal-600 shadow-lg transition-all hover:-translate-y-1 hover:shadow-xl"
          >
            Agendar Demo Gratis
            <ArrowRight className="h-5 w-5" />
          </a>
        </div>
      </section>

      <LandingFooter />
      <FloatingWhatsApp />
    </main>
  )
}
