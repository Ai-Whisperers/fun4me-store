'use client'

import { useState } from 'react'
import {
  Gift,
  Check,
  Shield,
  CreditCard,
  MessageCircle,
  Sparkles,
  ChevronDown,
  FileCheck,
  Rocket,
  Stethoscope,
} from 'lucide-react'
import { getWhatsAppUrl } from '@/lib/whatsapp'
import { trialConfig } from '@/lib/pricing/tiers'

interface TimelineStep {
  month: string
  title: string
  description: string
  icon: React.ReactNode
  highlight?: boolean
  payment?: string
}

const timelineSteps: TimelineStep[] = [
  {
    month: `Mes 1-${trialConfig.freeMonths}`,
    title: 'Periodo de Prueba',
    description: 'Tu sitio funcionando al 100%. Sin costos. Evalualo tranquilo.',
    icon: <Gift className="h-5 w-5" />,
    highlight: true,
    payment: 'Gs 0',
  },
  {
    month: `Mes ${trialConfig.freeMonths + 1}`,
    title: 'Decides',
    description: 'Si te gusta, continuas. Si no, te vas sin pagar nada.',
    icon: <FileCheck className="h-5 w-5" />,
    payment: 'Decision',
  },
  {
    month: `Mes ${trialConfig.freeMonths + 1}+`,
    title: 'Solo Mensualidad',
    description: 'Pagas la mensualidad del Plan Profesional. Sin sorpresas.',
    icon: <Rocket className="h-5 w-5" />,
    payment: 'Gs 250.000/mes',
  },
]

const guarantees = [
  {
    icon: <Shield className="h-6 w-6" />,
    title: 'Sin riesgo',
    description: 'Si no te convence, te vas sin pagar un guarani',
  },
  {
    icon: <Sparkles className="h-6 w-6" />,
    title: 'Acceso completo',
    description: 'Todas las funcionalidades, sin limitaciones',
  },
  {
    icon: <Gift className="h-6 w-6" />,
    title: 'Setup incluido',
    description: 'Configuramos todo durante la prueba gratuita',
  },
  {
    icon: <CreditCard className="h-6 w-6" />,
    title: 'Precio fijo',
    description: 'Gs 250.000/mes despues de la prueba. Sin cargos ocultos.',
  },
]

interface FAQItem {
  question: string
  answer: string
}

const trialFAQs: FAQItem[] = [
  {
    question: `¿Realmente no pago nada durante los ${trialConfig.freeMonths} meses?`,
    answer:
      `Correcto. Durante los ${trialConfig.freeMonths} meses de prueba no pagas nada. Nosotros invertimos en construir tu sitio y vos lo probas. Si decides no continuar, te vas sin pagar. Es nuestro riesgo, no el tuyo.`,
  },
  {
    question: '¿Que pasa despues de la prueba?',
    answer:
      'Si decides continuar, empezas a pagar Gs 250.000 por mes por el Plan Profesional. Sin cargos adicionales de setup. Si usas la tienda online, se cobra una comision del 3% sobre las ventas.',
  },
  {
    question: '¿Puedo cancelar cuando quiera?',
    answer:
      'Si. No hay contratos de permanencia. Podes cancelar en cualquier momento. Tu informacion te pertenece y podes exportarla.',
  },
  {
    question: '¿Que funcionalidades tengo durante la prueba?',
    answer:
      'Todas. No hay versiones limitadas. Tu sitio funciona exactamente igual durante la prueba que despues. Es la unica forma de que puedas evaluarlo de verdad.',
  },
  {
    question: '¿Que incluye el Plan Profesional?',
    answer:
      'Sitio web profesional, sistema de citas, portal para duenos, historiales medicos, recordatorios WhatsApp, tienda online, hospitalizacion, laboratorio, usuarios ilimitados, y soporte prioritario.',
  },
]

function formatPrice(price: number): string {
  return new Intl.NumberFormat('es-PY').format(price)
}

export function TrialOffer() {
  const [expandedFAQ, setExpandedFAQ] = useState<number | null>(0)

  const monthlyPrice = 250000

  return (
    <section
      id="prueba-gratis"
      className="relative overflow-hidden bg-gradient-to-b from-[#0F172A] via-[#0D1424] to-[#0F172A] py-20 md:py-28"
    >
      {/* Background decorations */}
      <div className="absolute left-1/2 top-0 h-[400px] w-[800px] -translate-x-1/2 rounded-full bg-[#2DCEA3]/5 blur-[150px]" />
      <div className="absolute bottom-0 right-0 h-[400px] w-[400px] rounded-full bg-[#5C6BFF]/5 blur-[120px]" />

      <div className="container relative z-10 mx-auto px-4 md:px-6">
        {/* Section Header */}
        <div className="mb-16 text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#2DCEA3]/20 bg-[#2DCEA3]/10 px-4 py-2">
            <Gift className="h-5 w-5 text-[#2DCEA3]" />
            <span className="font-bold text-[#2DCEA3]">Prueba Sin Riesgo</span>
          </div>
          <h2 className="mb-6 text-3xl font-black text-white md:text-4xl lg:text-5xl">
            {trialConfig.freeMonths} meses gratis para que lo pruebes
          </h2>
          <p className="mx-auto max-w-3xl text-lg text-white/60">
            Nosotros construimos tu sitio, vos lo probas. Si no te convence, te vas sin pagar.
            Despues, solo <span className="text-[#2DCEA3]">Gs {formatPrice(monthlyPrice)}/mes</span>.
          </p>
        </div>

        {/* Main Content Grid */}
        <div className="mx-auto max-w-6xl">
          {/* Timeline */}
          <div className="mb-16">
            <h3 className="mb-8 text-center text-xl font-bold text-white">Como funciona</h3>
            <div className="grid gap-4 md:grid-cols-3">
              {timelineSteps.map((step, idx) => (
                <div
                  key={idx}
                  className={`relative rounded-2xl border p-6 ${
                    step.highlight
                      ? 'border-[#2DCEA3]/30 bg-[#2DCEA3]/10'
                      : 'border-white/10 bg-white/5'
                  }`}
                >
                  {idx < timelineSteps.length - 1 && (
                    <div className="absolute -right-2 top-1/2 hidden h-0.5 w-4 bg-white/20 md:block" />
                  )}
                  <div
                    className={`mb-4 flex h-10 w-10 items-center justify-center rounded-xl ${
                      step.highlight
                        ? 'bg-[#2DCEA3]/20 text-[#2DCEA3]'
                        : 'bg-white/10 text-white/70'
                    }`}
                  >
                    {step.icon}
                  </div>
                  <div className="mb-2 text-xs font-bold text-[#2DCEA3]">{step.month}</div>
                  <h4 className="mb-2 font-bold text-white">{step.title}</h4>
                  <p className="mb-3 text-sm text-white/50">{step.description}</p>
                  {step.payment && (
                    <div className="inline-block rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white/70">
                      {step.payment}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Plan Info + Guarantees */}
          <div className="mb-16 grid gap-8 lg:grid-cols-2">
            {/* Plan Profesional Card */}
            <div className="rounded-3xl border border-[#2DCEA3]/30 bg-gradient-to-br from-[#2DCEA3]/10 to-transparent p-8">
              <div className="mb-6 flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#2DCEA3]/20 text-[#2DCEA3]">
                  <Stethoscope className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">Plan Profesional</h3>
                  <p className="text-sm text-white/60">Todo incluido para tu clinica</p>
                </div>
              </div>

              {/* Pricing */}
              <div className="mb-6 rounded-xl bg-white/5 p-4">
                <div className="mb-4 flex items-end gap-2">
                  <span className="text-4xl font-black text-[#2DCEA3]">Gs {formatPrice(monthlyPrice)}</span>
                  <span className="mb-1 text-white/60">/mes</span>
                </div>
                <div className="flex items-center gap-2 rounded-lg bg-green-500/20 px-3 py-2">
                  <Gift className="h-4 w-4 text-green-400" />
                  <span className="text-sm font-bold text-green-400">
                    {trialConfig.freeMonths} meses GRATIS para empezar
                  </span>
                </div>
              </div>

              {/* Features */}
              <div className="mb-6 space-y-3">
                {[
                  'Sitio web profesional',
                  'Sistema de citas con agenda',
                  'Portal para duenos de mascotas',
                  'Historiales medicos digitales',
                  'Recordatorios WhatsApp automaticos',
                  'Tienda online (3% comision)',
                  'Modulo de hospitalizacion',
                  'Laboratorio integrado',
                  'Usuarios ilimitados',
                  'Soporte prioritario 24/7',
                ].map((feature, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-sm text-white/80">
                    <Check className="h-4 w-4 flex-shrink-0 text-[#2DCEA3]" />
                    <span>{feature}</span>
                  </div>
                ))}
              </div>

              {/* CTA */}
              <a
                href={getWhatsAppUrl(`Hola! Me interesa la prueba de ${trialConfig.freeMonths} meses gratis del Plan Profesional de Vetic para mi clinica`)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#2DCEA3] px-6 py-4 font-bold text-[#0F172A] transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-[#2DCEA3]/20"
              >
                <MessageCircle className="h-5 w-5" />
                Empezar prueba gratis
              </a>
            </div>

            {/* Guarantees */}
            <div className="rounded-3xl border border-white/10 bg-white/5 p-8">
              <h3 className="mb-6 flex items-center gap-2 text-xl font-bold text-white">
                <Shield className="h-5 w-5 text-[#2DCEA3]" />
                Nuestras garantias
              </h3>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {guarantees.map((guarantee, idx) => (
                  <div key={idx} className="rounded-xl bg-white/5 p-4">
                    <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-[#2DCEA3]/10 text-[#2DCEA3]">
                      {guarantee.icon}
                    </div>
                    <h4 className="mb-1 font-bold text-white">{guarantee.title}</h4>
                    <p className="text-sm text-white/50">{guarantee.description}</p>
                  </div>
                ))}
              </div>

              <p className="mt-6 text-center text-xs text-white/40">
                Sin tarjeta de credito • Sin compromiso • Cancela cuando quieras
              </p>
            </div>
          </div>

          {/* Trial FAQ */}
          <div className="mx-auto max-w-3xl">
            <h3 className="mb-6 text-center text-xl font-bold text-white">
              Preguntas sobre la prueba gratis
            </h3>

            <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/5">
              {trialFAQs.map((faq, idx) => (
                <div key={idx} className="border-b border-white/10 last:border-b-0">
                  <button
                    onClick={() => setExpandedFAQ(expandedFAQ === idx ? null : idx)}
                    className="group flex w-full items-center justify-between gap-4 p-5 text-left transition-colors hover:bg-white/5"
                  >
                    <span className="font-medium text-white transition-colors group-hover:text-[#2DCEA3]">
                      {faq.question}
                    </span>
                    <ChevronDown
                      className={`h-5 w-5 flex-shrink-0 text-white/50 transition-transform duration-300 ${
                        expandedFAQ === idx ? 'rotate-180 text-[#2DCEA3]' : ''
                      }`}
                    />
                  </button>
                  <div
                    className={`overflow-hidden transition-all duration-300 ${
                      expandedFAQ === idx ? 'max-h-[300px]' : 'max-h-0'
                    }`}
                  >
                    <p className="px-5 pb-5 leading-relaxed text-white/60">{faq.answer}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
