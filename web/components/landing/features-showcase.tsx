import { Upload, Package, WifiOff } from 'lucide-react'
import Image from 'next/image'

const features = [
  {
    icon: Upload,
    title: 'Migración Gratuita',
    description:
      'Envíanos tus Excel o fotos de las fichas. Nosotros cargamos tus datos por vos.',
  },
  {
    icon: Package,
    title: 'Control de Stock',
    description:
      'Gestiona alimentos y medicamentos. Descuento automático al facturar.',
  },
  {
    icon: WifiOff,
    title: 'Modo "Baja Señal"',
    description:
      '¿Internet inestable? Vetic guarda cambios y sincroniza cuando vuelve la conexión.',
  },
]

export function FeaturesShowcase() {
  return (
    <section id="caracteristicas" className="relative overflow-hidden bg-slate-50 py-16 md:py-24">
      <div className="container mx-auto px-4 md:px-6">
        {/* Section Header */}
        <div className="mb-12 text-center md:mb-16">
          <h2 className="mb-4 text-3xl font-black text-[var(--landing-text-primary)] md:text-4xl lg:text-5xl">
            Funcionalidades pensadas para{' '}
            <span className="text-3xl md:text-4xl lg:text-5xl text-[var(--landing-primary)]">Paraguay.</span>
          </h2>
          <p className="mx-auto max-w-2xl text-lg text-slate-600 mb-8">
            Entendemos los desafíos locales y los resolvemos.
          </p>
          
          <div className="mx-auto relative h-48 w-full max-w-2xl">
            <Image
              src="/vetic-features.png"
              alt="Funcionalidades Vetic"
              fill
              className="object-contain"
            />
          </div>
        </div>

        {/* Features Grid */}
        <div className="mx-auto grid max-w-5xl grid-cols-1 gap-8 md:grid-cols-3">
          {features.map((feature, idx) => (
            <div
              key={idx}
              className="group rounded-2xl border border-slate-200 bg-white p-8 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-teal-200 hover:shadow-lg"
            >
              <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-xl bg-teal-50 text-teal-600 transition-colors group-hover:bg-teal-100">
                <feature.icon className="h-7 w-7" />
              </div>

              <h3 className="mb-3 text-xl font-bold text-slate-900">{feature.title}</h3>
              <p className="leading-relaxed text-slate-600">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
