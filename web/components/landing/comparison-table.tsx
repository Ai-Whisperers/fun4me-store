'use client'

import { Check, X, Minus, ArrowRight, Zap, Trophy } from 'lucide-react'

interface ComparisonRow {
  feature: string
  Vetic: string | boolean
  traditional: string | boolean
  diy: string | boolean
}

const comparisonData: ComparisonRow[] = [
  {
    feature: 'Costo inicial',
    Vetic: 'desde ₲0*',
    traditional: '₲5-10M',
    diy: '₲500K-2M',
  },
  {
    feature: 'Costo mensual',
    Vetic: 'desde ₲150K',
    traditional: '₲300-500K',
    diy: '₲100-200K',
  },
  {
    feature: 'Tiempo hasta estar online',
    Vetic: '3-7 dias',
    traditional: '2-4 meses',
    diy: '1-3 meses',
  },
  {
    feature: 'Diseño profesional',
    Vetic: true,
    traditional: true,
    diy: false,
  },
  {
    feature: 'Sistema de citas online',
    Vetic: true,
    traditional: 'Extra',
    diy: false,
  },
  {
    feature: 'Historial medico digital',
    Vetic: true,
    traditional: 'Extra',
    diy: false,
  },
  {
    feature: 'Portal para dueños',
    Vetic: true,
    traditional: 'Extra',
    diy: false,
  },
  {
    feature: 'Actualizaciones incluidas',
    Vetic: true,
    traditional: false,
    diy: false,
  },
  {
    feature: 'Soporte tecnico',
    Vetic: true,
    traditional: 'Extra',
    diy: false,
  },
  {
    feature: 'Optimizado para moviles',
    Vetic: true,
    traditional: 'Depende',
    diy: 'Depende',
  },
  {
    feature: 'SEO optimizado',
    Vetic: true,
    traditional: 'Depende',
    diy: false,
  },
  {
    feature: 'Seguridad y backups',
    Vetic: true,
    traditional: 'Extra',
    diy: 'Tu problema',
  },
]

function CellValue({ value, isVetic = false }: { value: string | boolean; isVetic?: boolean }) {
  if (value === true) {
    return (
      <div className="flex justify-center">
        <div
          className={`flex h-6 w-6 items-center justify-center rounded-full ${isVetic ? 'bg-[var(--primary)]/30' : 'bg-[var(--primary)]/20'}`}
        >
          <Check className="h-4 w-4 text-[var(--primary)]" />
        </div>
      </div>
    )
  }
  if (value === false) {
    return (
      <div className="flex justify-center">
        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-red-500/20">
          <X className="h-4 w-4 text-red-400" />
        </div>
      </div>
    )
  }
  if (value === '-' || value === 'Extra' || value === 'Depende' || value === 'Tu problema') {
    return (
      <span
        className={`text-xs md:text-sm ${
          value === 'Extra'
            ? 'text-yellow-400'
            : value === 'Depende'
              ? 'text-yellow-400'
              : value === 'Tu problema'
                ? 'text-red-400'
                : 'text-white/40'
        }`}
      >
        {value}
      </span>
    )
  }
  return (
    <span
      className={`text-xs font-medium md:text-sm ${isVetic ? 'text-[var(--primary)]' : 'text-white'}`}
    >
      {value}
    </span>
  )
}

export function ComparisonTable() {
  return (
    <section className="relative overflow-hidden bg-[var(--bg-dark)] py-16 md:py-24">
      {/* Background */}
      <div className="absolute inset-0">
        <div className="bg-[var(--primary)]/5 absolute left-1/2 top-1/2 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full blur-[150px]" />
      </div>

      <div className="container relative z-10 mx-auto px-4 md:px-6">
        {/* Section Header */}
        <div className="mb-10 text-center md:mb-12">
          <div className="bg-[var(--primary)]/10 border-[var(--primary)]/20 mb-4 inline-flex items-center gap-2 rounded-full border px-4 py-2">
            <Trophy className="h-4 w-4 text-[var(--primary)]" />
            <span className="text-sm font-bold text-[var(--primary)]">Comparacion</span>
          </div>
          <h2 className="mb-4 text-2xl font-black text-white sm:text-3xl md:mb-6 md:text-4xl lg:text-5xl">
            Vetic vs las alternativas
          </h2>
          <p className="mx-auto max-w-xl text-sm text-white/60 md:text-base lg:text-lg">
            Compara y descubri por que somos la mejor relacion costo-beneficio.
          </p>
        </div>

        {/* Mobile View - Cards */}
        <div className="mx-auto max-w-sm space-y-4 md:hidden">
          {/* Vetic Card */}
          <div className="from-[var(--primary)]/10 to-[var(--secondary)]/10 border-[var(--primary)]/30 rounded-2xl border bg-gradient-to-br p-5">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-[var(--primary)]" />
                <span className="font-bold text-white">Vetic</span>
              </div>
              <span className="rounded-full bg-[var(--primary)] px-2 py-1 text-[10px] font-bold text-[var(--bg-dark)]">
                RECOMENDADO
              </span>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-white/60">Costo inicial</span>
                <span className="text-sm font-bold text-[var(--primary)]">desde ₲0*</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-white/60">Mensualidad</span>
                <span className="text-sm font-bold text-[var(--primary)]">desde ₲150K</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-white/60">Tiempo online</span>
                <span className="text-sm font-bold text-white">3-7 dias</span>
              </div>
              <div className="space-y-2 border-t border-white/10 pt-2">
                {['Sistema de citas', 'Historial medico', 'Portal dueños', 'Soporte incluido'].map(
                  (item, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-[var(--primary)]" />
                      <span className="text-sm text-white/70">{item}</span>
                    </div>
                  )
                )}
              </div>
            </div>
          </div>

          {/* Traditional Card */}
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <span className="mb-4 block font-bold text-white">Desarrollo Tradicional</span>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-white/60">Costo inicial</span>
                <span className="text-sm font-bold text-red-400">₲5-10M</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-white/60">Mensualidad</span>
                <span className="text-sm font-bold text-red-400">₲300-500K</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-white/60">Tiempo online</span>
                <span className="text-sm font-bold text-white/70">2-4 meses</span>
              </div>
              <div className="space-y-2 border-t border-white/10 pt-2">
                {['Sistema de citas', 'Historial medico', 'Portal dueños', 'Soporte'].map(
                  (item, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <Minus className="h-4 w-4 text-yellow-400" />
                      <span className="text-sm text-white/50">{item} = Extra</span>
                    </div>
                  )
                )}
              </div>
            </div>
          </div>

          {/* DIY Card */}
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <span className="mb-4 block font-bold text-white">Hacerlo Vos Mismo</span>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-white/60">Costo inicial</span>
                <span className="text-sm font-bold text-white/70">₲500K-2M</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-white/60">Mensualidad</span>
                <span className="text-sm font-bold text-white/70">₲100-200K</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-white/60">Tiempo online</span>
                <span className="text-sm font-bold text-white/70">1-3 meses</span>
              </div>
              <div className="space-y-2 border-t border-white/10 pt-2">
                {['Sistema de citas', 'Historial medico', 'Portal dueños', 'Soporte'].map(
                  (item, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <X className="h-4 w-4 text-red-400" />
                      <span className="text-sm text-white/50">{item} = No incluido</span>
                    </div>
                  )
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Desktop View - Table */}
        <div className="mx-auto hidden max-w-4xl overflow-x-auto md:block">
          <table className="w-full">
            <thead>
              <tr>
                <th className="px-4 py-4 text-left text-sm font-medium text-white/50">
                  Caracteristica
                </th>
                <th className="px-4 py-4 text-center">
                  <div className="inline-flex flex-col items-center gap-1">
                    <div className="rounded-full bg-gradient-to-r from-[var(--primary)] to-[var(--accent)] px-3 py-1">
                      <span className="text-sm font-bold text-[var(--bg-dark)]">Vetic</span>
                    </div>
                    <span className="text-xs text-[var(--primary)]">Recomendado</span>
                  </div>
                </th>
                <th className="px-4 py-4 text-center">
                  <div className="inline-flex flex-col items-center gap-1">
                    <span className="text-sm font-bold text-white">Desarrollo Tradicional</span>
                    <span className="text-xs text-white/40">Agencia/Freelancer</span>
                  </div>
                </th>
                <th className="px-4 py-4 text-center">
                  <div className="inline-flex flex-col items-center gap-1">
                    <span className="text-sm font-bold text-white">Hacerlo Vos Mismo</span>
                    <span className="text-xs text-white/40">WordPress/Wix</span>
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {comparisonData.map((row, idx) => (
                <tr
                  key={idx}
                  className={`border-t border-white/5 ${idx % 2 === 0 ? 'bg-white/[0.02]' : ''}`}
                >
                  <td className="px-4 py-3 text-sm text-white/70">{row.feature}</td>
                  <td className="bg-[var(--primary)]/5 px-4 py-3 text-center">
                    <CellValue value={row.Vetic} isVetic />
                  </td>
                  <td className="px-4 py-3 text-center">
                    <CellValue value={row.traditional} />
                  </td>
                  <td className="px-4 py-3 text-center">
                    <CellValue value={row.diy} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <p className="mt-4 text-center text-xs text-white/30">
            *Configuracion diferida en Plan Semilla
          </p>
        </div>

        {/* Bottom Summary - Desktop only */}
        <div className="mx-auto mt-10 hidden max-w-4xl gap-6 md:grid md:grid-cols-3">
          {/* Vetic Summary */}
          <div className="from-[var(--primary)]/10 to-[var(--secondary)]/10 border-[var(--primary)]/30 rounded-2xl border bg-gradient-to-br p-5">
            <div className="mb-3 flex items-center gap-2">
              <Zap className="h-5 w-5 text-[var(--primary)]" />
              <h3 className="font-bold text-white">Vetic</h3>
            </div>
            <p className="mb-4 text-sm text-white/60">
              Resultados rapidos sin complicaciones tecnicas.
            </p>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2 text-[var(--primary)]">
                <Check className="h-4 w-4" />
                Listo en dias
              </li>
              <li className="flex items-center gap-2 text-[var(--primary)]">
                <Check className="h-4 w-4" />
                Todo incluido
              </li>
              <li className="flex items-center gap-2 text-[var(--primary)]">
                <Check className="h-4 w-4" />
                Sin dolores de cabeza
              </li>
            </ul>
          </div>

          {/* Traditional Summary */}
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <h3 className="mb-3 font-bold text-white">Desarrollo Tradicional</h3>
            <p className="mb-4 text-sm text-white/60">
              Requiere presupuesto grande y tiempo para esperar.
            </p>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2 text-yellow-400">
                <Minus className="h-4 w-4" />
                Costo alto inicial
              </li>
              <li className="flex items-center gap-2 text-yellow-400">
                <Minus className="h-4 w-4" />
                Meses de desarrollo
              </li>
              <li className="flex items-center gap-2 text-yellow-400">
                <Minus className="h-4 w-4" />
                Extras cuestan mas
              </li>
            </ul>
          </div>

          {/* DIY Summary */}
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <h3 className="mb-3 font-bold text-white">Hacerlo Vos Mismo</h3>
            <p className="mb-4 text-sm text-white/60">Necesitas tiempo y conocimientos tecnicos.</p>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2 text-red-400">
                <X className="h-4 w-4" />
                Requiere tu tiempo
              </li>
              <li className="flex items-center gap-2 text-red-400">
                <X className="h-4 w-4" />
                Resultado amateur
              </li>
              <li className="flex items-center gap-2 text-red-400">
                <X className="h-4 w-4" />
                Sin sistema de gestion
              </li>
            </ul>
          </div>
        </div>

        {/* CTA */}
        <div className="mt-10 text-center">
          <a
            href="#precios"
            className="hover:shadow-[var(--primary)]/20 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[var(--primary)] to-[var(--accent)] px-6 py-3 text-sm font-bold text-[var(--bg-dark)] transition-all hover:shadow-lg md:text-base"
          >
            Ver Precios de Vetic
            <ArrowRight className="h-4 w-4 md:h-5 md:w-5" />
          </a>
        </div>
      </div>
    </section>
  )
}
