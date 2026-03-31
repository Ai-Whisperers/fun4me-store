'use client'

import { MessageCircle, Settings, Rocket, ArrowRight, Clock, Check } from 'lucide-react'
import { getWhatsAppUrl, landingMessages } from '@/lib/whatsapp'

const steps = [
  {
    number: '01',
    icon: MessageCircle,
    title: 'Contactanos',
    description:
      'Escribinos por WhatsApp. Conversamos sobre tu clínica, servicios y lo que necesitas.',
    duration: '15 min',
    details: ['Charla sin compromiso', 'Evaluamos tus necesidades', 'Respondemos todas tus dudas'],
    color: '#0d9488',
  },
  {
    number: '02',
    icon: Settings,
    title: 'Configuramos',
    description: 'Armamos tu sitio web con tu logo, colores y toda la información de tu clínica.',
    duration: '3-7 días',
    details: ['Envianos tu contenido', 'Diseñamos tu sitio', 'Revisas y aprobas'],
    color: '#0284c7',
  },
  {
    number: '03',
    icon: Rocket,
    title: '¡Listo!',
    description: 'Tu clínica está online. Vos atendes pacientes, nosotros manejamos la tecnología.',
    duration: 'Para siempre',
    details: ['Soporte continuo', 'Actualizaciones gratis', 'Sin preocupaciones'],
    color: '#4f46e5',
  },
]

export function HowItWorks() {
  return (
    <section id="como-funciona" className="relative overflow-hidden bg-slate-50 py-16 md:py-24">
      <div className="container relative z-10 mx-auto px-4 md:px-6">
        {/* Section Header */}
        <div className="mb-12 text-center md:mb-16">
          <span className="mb-3 inline-block text-xs font-bold uppercase tracking-widest text-teal-600 md:text-sm">
            Proceso Simple
          </span>
          <h2 className="mb-4 text-2xl font-black text-slate-900 sm:text-3xl md:mb-6 md:text-4xl lg:text-5xl">
            ¿Cómo funciona?
          </h2>
          <p className="mx-auto max-w-xl text-sm text-slate-600 md:text-base lg:text-lg">
            En 3 simples pasos, tu clínica veterinaria tiene presencia digital profesional.
          </p>
        </div>

        {/* Steps */}
        <div className="mx-auto max-w-5xl">
          {/* Desktop Layout */}
          <div className="relative hidden gap-6 md:grid md:grid-cols-3">
            {/* Connector line */}
            <div className="absolute left-[calc(16.67%+40px)] right-[calc(16.67%+40px)] top-[72px] h-0.5 bg-slate-200" />

            {steps.map((step) => (
              <div key={step.number} className="group relative">
                <div className="relative rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm transition-all duration-300 hover:border-teal-200 hover:shadow-md lg:p-8">
                  {/* Step badge */}
                  <div
                    className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full px-3 py-1 text-xs font-bold bg-slate-900 text-white"
                  >
                    Paso {step.number}
                  </div>

                  {/* Icon */}
                  <div
                    className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl transition-transform group-hover:scale-105 lg:mb-5 lg:h-20 lg:w-20"
                    style={{ backgroundColor: `${step.color}15` }}
                  >
                    <step.icon className="h-8 w-8 lg:h-10 lg:w-10" style={{ color: step.color }} />
                  </div>

                  {/* Duration badge */}
                  <div className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1">
                    <Clock className="h-3 w-3 text-slate-500" />
                    <span className="text-xs text-slate-600 font-medium">{step.duration}</span>
                  </div>

                  {/* Content */}
                  <h3 className="mb-2 text-lg font-bold text-slate-900 lg:text-xl">{step.title}</h3>
                  <p className="mb-4 text-sm leading-relaxed text-slate-500">{step.description}</p>

                  {/* Detail points */}
                  <div className="space-y-1.5">
                    {step.details.map((detail) => (
                      <div key={detail} className="flex items-center justify-center gap-2">
                        <Check className="h-3 w-3 flex-shrink-0 text-slate-400" />
                        <span className="text-xs text-slate-500">{detail}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Mobile Layout - Vertical Timeline */}
          <div className="space-y-4 md:hidden">
            {steps.map((step, idx) => (
              <div key={step.number} className="relative flex gap-4">
                {/* Timeline line */}
                <div className="flex flex-col items-center">
                  <div
                    className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl"
                    style={{ backgroundColor: `${step.color}20` }}
                  >
                    <step.icon className="h-5 w-5" style={{ color: step.color }} />
                  </div>
                  {idx < steps.length - 1 && (
                    <div className="mt-2 min-h-[60px] w-0.5 flex-1 bg-slate-200" />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 pb-6">
                  <div className="mb-2 flex items-center gap-2">
                    <span
                      className="rounded-full bg-slate-900 px-2 py-0.5 text-[10px] font-bold text-white"
                    >
                      Paso {step.number}
                    </span>
                    <span className="flex items-center gap-1 text-xs text-slate-500">
                      <Clock className="h-3 w-3" />
                      {step.duration}
                    </span>
                  </div>
                  <h3 className="mb-1 text-base font-bold text-slate-900">{step.title}</h3>
                  <p className="mb-3 text-sm leading-relaxed text-slate-600">{step.description}</p>

                  {/* Condensed details on mobile */}
                  <div className="flex flex-wrap gap-2">
                    {step.details.map((detail) => (
                      <span
                        key={detail}
                        className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 text-[10px] text-slate-600"
                      >
                        <Check className="h-2.5 w-2.5 text-slate-400" />
                        {detail}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="mt-10 text-center md:mt-14">
          <a
            href={getWhatsAppUrl(landingMessages.learnMore())}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-full bg-teal-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-teal-500/20 transition-all hover:-translate-y-0.5 hover:shadow-xl md:px-8 md:py-4 md:text-base"
          >
            <MessageCircle className="h-4 w-4 md:h-5 md:w-5" />
            Empezar ahora
            <ArrowRight className="h-4 w-4 md:h-5 md:w-5" />
          </a>
          <p className="mt-3 text-xs text-slate-400">Sin compromiso • Respuesta rápida</p>
        </div>
      </div>
    </section>
  )
}
