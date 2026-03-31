import { Calendar, Shield, BarChart3 } from 'lucide-react'
import Image from 'next/image'

const benefits = [
  {
    icon: Calendar,
    title: 'Agenda Centralizada',
    description:
      'Olvídate de cruzar horarios. Una sola agenda accesible desde tu celular.',
  },
  {
    icon: Shield,
    title: 'Historiales Seguros',
    description:
      'Si se pierde el cuaderno, se pierde la historia. Aquí todo queda guardado.',
  },
  {
    icon: BarChart3,
    title: 'Finanzas Claras',
    description:
      'Reportes automáticos de ingresos. Deja de adivinar cuánto ganaste.',
  },
]

export function ProblemSection() {
  return (
    <section className="relative overflow-hidden bg-white py-16 md:py-24">
      {/* Background Image */}
      <div className="absolute inset-0 opacity-5 pointer-events-none">
         <Image
            src="/vetic-patients.png"
            alt="Pacientes felices"
            fill
            className="object-cover"
         />
      </div>
      <div className="container mx-auto px-4 md:px-6">
        {/* Section Header */}
        <div className="mb-12 text-center md:mb-16">
          <h2 className="mb-4 text-3xl font-black leading-tight text-[var(--landing-text-primary)] md:text-4xl lg:text-5xl">
            Tu día a día, <span className="text-3xl md:text-4xl lg:text-5xl text-[var(--landing-primary)]">ordenado.</span>
          </h2>
          <p className="mx-auto max-w-2xl text-lg text-slate-600">
            Menos administrador, más veterinario. Elimina el caos de las agendas en papel.
          </p>
        </div>

        {/* Benefits Grid */}
        <div className="mx-auto grid max-w-5xl grid-cols-1 gap-8 md:grid-cols-3">
          {benefits.map((benefit, idx) => (
            <div
              key={idx}
              className="group rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-teal-200 hover:shadow-lg"
            >
              <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-xl bg-teal-50 text-teal-600 transition-colors group-hover:bg-teal-100">
                <benefit.icon className="h-7 w-7" />
              </div>

              <h3 className="mb-3 text-xl font-bold text-slate-900">{benefit.title}</h3>
              <p className="leading-relaxed text-slate-600">{benefit.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
