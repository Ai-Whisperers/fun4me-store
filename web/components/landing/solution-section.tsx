'use client'

import { Check, Server, Users, Palette, ArrowRight, X, Sparkles } from 'lucide-react'

const benefits = [
  'Tu propio sitio web profesional en dias, no meses',
  'URL personalizada (tunombre.Vetic.com o tu dominio)',
  'Tu logo, colores y fotos - tu identidad completa',
  'Citas online 24/7 + historial medico digital',
  'Actualizaciones automaticas sin costo extra',
  'Soporte tecnico incluido en tu plan',
]

const traditionalPains = [
  'Contratar diseñador + programador',
  'Comprar hosting y dominio aparte',
  'Configurar seguridad y backups',
  'Pagar por cada actualizacion',
  'Esperar meses para tener algo',
]

const howItWorks = [
  {
    icon: Server,
    title: 'Una Plataforma Poderosa',
    description: 'Tecnologia de nivel empresarial que mantenemos y actualizamos constantemente.',
  },
  {
    icon: Palette,
    title: 'Tu Marca, Tu Identidad',
    description:
      'Cada clinica tiene su propio diseño unico. Nadie sabe que es la misma plataforma.',
  },
  {
    icon: Users,
    title: 'Costos Compartidos',
    description: 'Infraestructura compartida = costos accesibles para todos.',
  },
]

export function SolutionSection() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-[#0D1424] to-[#0F172A] py-16 md:py-24">
      {/* Gradient orbs */}
      <div className="bg-[#2DCEA3]/8 absolute left-0 top-1/2 h-[250px] w-[250px] -translate-x-1/2 -translate-y-1/2 rounded-full blur-[100px]" />
      <div className="bg-[#5C6BFF]/8 absolute right-0 top-1/2 h-[250px] w-[250px] -translate-y-1/2 translate-x-1/2 rounded-full blur-[100px]" />

      <div className="container relative z-10 mx-auto px-4 md:px-6">
        {/* Section Header */}
        <div className="mb-12 text-center md:mb-16">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#2DCEA3]/20 bg-[#2DCEA3]/10 px-4 py-2">
            <Sparkles className="h-4 w-4 text-[#2DCEA3]" />
            <span className="text-sm font-bold text-[#2DCEA3]">La Solucion</span>
          </div>
          <h2 className="mb-4 text-2xl font-black leading-tight text-white sm:text-3xl md:mb-6 md:text-4xl lg:text-5xl">
            Tecnologia profesional precio accesible
          </h2>
          <p className="mx-auto max-w-2xl text-sm text-white/60 md:text-base lg:text-lg">
            Vetic es una red de sitios veterinarios que comparten tecnologia. Vos obtenes un sitio
            profesional completo, nosotros manejamos todo lo tecnico.
          </p>
        </div>

        {/* How it works - 3 pillars */}
        <div className="mx-auto mb-12 grid max-w-4xl grid-cols-1 gap-4 sm:grid-cols-3 md:mb-16 md:gap-6">
          {howItWorks.map((item, idx) => (
            <div
              key={idx}
              className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-center transition-all hover:border-white/20 hover:bg-white/[0.05] md:p-6"
            >
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-[#2DCEA3]/20 to-[#5C6BFF]/20 md:mb-4 md:h-14 md:w-14">
                <item.icon className="h-6 w-6 text-[#2DCEA3] md:h-7 md:w-7" />
              </div>
              <h3 className="mb-2 text-base font-bold text-white md:text-lg">{item.title}</h3>
              <p className="text-xs leading-relaxed text-white/50 md:text-sm">{item.description}</p>
            </div>
          ))}
        </div>

        {/* Comparison: Vetic vs Traditional */}
        <div className="mx-auto mb-12 max-w-5xl md:mb-16">
          <h3 className="mb-6 text-center text-xl font-bold text-white md:mb-8 md:text-2xl">
            Compara los numeros
          </h3>

          <div className="grid gap-4 md:grid-cols-2 md:gap-6">
            {/* Traditional - Problems */}
            <div className="order-2 rounded-2xl border border-red-500/20 bg-red-500/5 p-5 md:order-1 md:p-6">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/10">
                  <X className="h-5 w-5 text-red-400" />
                </div>
                <div>
                  <h4 className="font-bold text-white">Desarrollo Tradicional</h4>
                  <p className="text-xs text-white/40">Contratar agencia o freelancer</p>
                </div>
              </div>

              {/* Cost breakdown */}
              <div className="mb-5 space-y-3">
                <div className="flex items-center justify-between border-b border-white/5 py-2">
                  <span className="text-sm text-white/60">Diseño + Desarrollo</span>
                  <span className="font-bold text-red-400">₲5-10M</span>
                </div>
                <div className="flex items-center justify-between border-b border-white/5 py-2">
                  <span className="text-sm text-white/60">Hosting anual</span>
                  <span className="font-bold text-red-400">₲600K-1.2M</span>
                </div>
                <div className="flex items-center justify-between border-b border-white/5 py-2">
                  <span className="text-sm text-white/60">Mantenimiento/mes</span>
                  <span className="font-bold text-red-400">₲300-500K</span>
                </div>
                <div className="flex items-center justify-between py-2">
                  <span className="text-sm text-white/60">Tiempo estimado</span>
                  <span className="font-bold text-white/70">2-4 meses</span>
                </div>
              </div>

              {/* Pain points */}
              <div className="space-y-2">
                {traditionalPains.map((pain, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <X className="h-3.5 w-3.5 flex-shrink-0 text-red-400" />
                    <span className="text-xs text-white/50">{pain}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Vetic - Solution */}
            <div className="relative order-1 rounded-2xl border border-[#2DCEA3]/30 bg-gradient-to-br from-[#2DCEA3]/10 to-[#5C6BFF]/10 p-5 md:order-2 md:p-6">
              <div className="absolute -top-3 right-4">
                <span className="rounded-full bg-[#2DCEA3] px-3 py-1 text-xs font-bold text-[#0F172A]">
                  RECOMENDADO
                </span>
              </div>

              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#2DCEA3]/20">
                  <Check className="h-5 w-5 text-[#2DCEA3]" />
                </div>
                <div>
                  <h4 className="font-bold text-white">Vetic</h4>
                  <p className="text-xs text-white/40">Todo incluido, sin sorpresas</p>
                </div>
              </div>

              {/* Cost breakdown */}
              <div className="mb-5 space-y-3">
                <div className="flex items-center justify-between border-b border-white/10 py-2">
                  <span className="text-sm text-white/70">Configuracion inicial</span>
                  <div className="text-right">
                    <span className="font-bold text-[#2DCEA3]">desde ₲0*</span>
                    <p className="text-[10px] text-white/30">*Plan Semilla, diferido</p>
                  </div>
                </div>
                <div className="flex items-center justify-between border-b border-white/10 py-2">
                  <span className="text-sm text-white/70">Mensualidad</span>
                  <div className="text-right">
                    <span className="font-bold text-[#2DCEA3]">desde ₲150K</span>
                    <p className="text-[10px] text-white/30">Segun tamaño de clinica</p>
                  </div>
                </div>
                <div className="flex items-center justify-between border-b border-white/10 py-2">
                  <span className="text-sm text-white/70">Hosting + Backups + SSL</span>
                  <span className="font-bold text-[#2DCEA3]">INCLUIDO</span>
                </div>
                <div className="flex items-center justify-between py-2">
                  <span className="text-sm text-white/70">Tiempo para estar online</span>
                  <span className="font-bold text-white">3-7 dias</span>
                </div>
              </div>

              {/* Benefits */}
              <div className="space-y-2">
                {benefits.slice(0, 5).map((benefit, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <Check className="h-3.5 w-3.5 flex-shrink-0 text-[#2DCEA3]" />
                    <span className="text-xs text-white/70">{benefit}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Savings callout */}
          <div className="mt-6 rounded-xl border border-[#2DCEA3]/20 bg-[#2DCEA3]/10 p-4 text-center">
            <p className="text-sm text-white/80 md:text-base">
              <span className="font-bold text-[#2DCEA3]">Ahorra ₲5M+ el primer año</span> comparado
              con desarrollo tradicional. Y esta listo en dias, no meses.
            </p>
          </div>
        </div>

        {/* CTA to pricing */}
        <div className="text-center">
          <a
            href="#precios"
            className="group inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-6 py-3 font-medium text-white transition-all hover:border-white/30 hover:bg-white/10"
          >
            Ver planes y precios
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </a>
        </div>
      </div>
    </section>
  )
}
