import {
  Heart,
  MapPin,
  Lightbulb,
  Shield,
  Users,
  Zap,
  ArrowRight,
} from 'lucide-react'
import Link from 'next/link'
import {
  LandingNav,
  LandingFooter,
  FloatingWhatsApp,
  PageHeader,
} from '@/components/landing'
import { getWhatsAppUrl, landingMessages } from '@/lib/whatsapp'

// Values
const values = [
  {
    icon: Heart,
    title: 'Pasión por las mascotas',
    description:
      'Creemos que cada mascota merece la mejor atención. Por eso creamos herramientas que ayudan a los veterinarios a enfocarse en lo que más importa: el bienestar animal.',
  },
  {
    icon: MapPin,
    title: 'Paraguay primero',
    description:
      'Diseñamos Vetic específicamente para el mercado paraguayo. Desde la facturación SET hasta la optimización para redes móviles locales, todo está pensado para funcionar aquí.',
  },
  {
    icon: Lightbulb,
    title: 'Simplicidad radical',
    description:
      'La tecnología debe simplificar, no complicar. Cada función de Vetic está diseñada para ser intuitiva, sin manuales extensos ni capacitaciones interminables.',
  },
  {
    icon: Shield,
    title: 'Confianza y seguridad',
    description:
      'Los datos de tus pacientes y clientes son sagrados. Usamos encriptación de nivel bancario y backups automáticos para proteger tu información.',
  },
]

// Stats
const stats = [
  { value: '2024', label: 'Año de fundación' },
  { value: '90', label: 'Días de prueba gratis' },
  { value: '6+6', label: 'Garantía ROI (6 clientes o 6 meses gratis)' },
  { value: '100%', label: 'Hecho en Paraguay' },
]

export default function NosotrosPage() {
  return (
    <main className="min-h-screen bg-slate-50">
      <LandingNav />

      <PageHeader
        badge="Nuestra Historia"
        title="Tecnología veterinaria"
        highlight="hecha en Paraguay."
        description="Vetic nació de una simple pregunta: ¿por qué las veterinarias paraguayas tienen que usar sistemas diseñados para otros países?"
      />

      {/* Mission Section */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4 md:px-6">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="mb-6 text-2xl font-bold text-slate-900 md:text-3xl">
              Nuestra Misión
            </h2>
            <p className="text-xl leading-relaxed text-slate-600">
              Empoderar a las veterinarias paraguayas con tecnología accesible,
              simple y poderosa, para que puedan dedicar más tiempo a cuidar
              mascotas y menos tiempo a tareas administrativas.
            </p>
          </div>
        </div>
      </section>

      {/* Story Section */}
      <section className="bg-white py-16 md:py-24">
        <div className="container mx-auto px-4 md:px-6">
          <div className="mx-auto max-w-4xl">
            <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
              {/* Image placeholder */}
              <div className="relative aspect-square overflow-hidden rounded-2xl bg-gradient-to-br from-teal-100 to-teal-50">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-teal-500/10">
                      <Heart className="h-10 w-10 text-teal-600" />
                    </div>
                    <p className="text-teal-700 font-medium">Hecho con amor</p>
                    <p className="text-teal-600 text-sm">en Asunción, Paraguay</p>
                  </div>
                </div>
              </div>

              {/* Story text */}
              <div>
                <h2 className="mb-6 text-2xl font-bold text-slate-900 md:text-3xl">
                  Por qué creamos Vetic
                </h2>
                <div className="space-y-4 text-slate-600">
                  <p>
                    Todo empezó cuando vimos a veterinarios talentosos perdiendo
                    horas en agendas de papel, cuadernos y sistemas genéricos que
                    no entendían las necesidades locales.
                  </p>
                  <p>
                    Nos preguntamos: ¿por qué no existe un sistema diseñado
                    específicamente para Paraguay? Uno que funcione con nuestra
                    facturación SET, que cargue rápido con internet de Tigo o
                    Claro, y que hable español de verdad.
                  </p>
                  <p>
                    Así nació Vetic: una plataforma pensada desde cero para las
                    veterinarias paraguayas. Sin traducciones raras, sin funciones
                    innecesarias, sin complejidad artificial.
                  </p>
                  <p className="font-medium text-teal-600">
                    Solo las herramientas que necesitás, funcionando como esperás.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4 md:px-6">
          <div className="mb-12 text-center">
            <h2 className="mb-4 text-2xl font-bold text-slate-900 md:text-3xl">
              Nuestros Valores
            </h2>
            <p className="text-slate-600">
              Los principios que guían cada decisión que tomamos.
            </p>
          </div>

          <div className="mx-auto grid max-w-5xl gap-6 md:grid-cols-2">
            {values.map((value, index) => (
              <div
                key={index}
                className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
              >
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-teal-50">
                  <value.icon className="h-6 w-6 text-teal-600" />
                </div>
                <h3 className="mb-2 text-lg font-bold text-slate-900">
                  {value.title}
                </h3>
                <p className="text-slate-600">{value.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="bg-teal-600 py-16 md:py-24">
        <div className="container mx-auto px-4 md:px-6">
          <div className="mx-auto grid max-w-4xl gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="mb-2 text-4xl font-bold text-white">
                  {stat.value}
                </div>
                <div className="text-teal-200">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Paraguay First Section */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4 md:px-6">
          <div className="mx-auto max-w-4xl">
            <div className="rounded-2xl bg-gradient-to-br from-teal-50 to-blue-50 p-8 md:p-12">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-teal-100">
                  <MapPin className="h-6 w-6 text-teal-600" />
                </div>
                <div>
                  <h3 className="mb-4 text-xl font-bold text-slate-900 md:text-2xl">
                    Paraguay First: No es un slogan, es nuestra estrategia
                  </h3>
                  <div className="space-y-3 text-slate-600">
                    <p className="flex items-start gap-2">
                      <Zap className="mt-1 h-4 w-4 flex-shrink-0 text-teal-500" />
                      <span>
                        <strong>Facturación SET integrada:</strong> Genera facturas
                        electrónicas directamente, sin exportar ni importar.
                      </span>
                    </p>
                    <p className="flex items-start gap-2">
                      <Zap className="mt-1 h-4 w-4 flex-shrink-0 text-teal-500" />
                      <span>
                        <strong>Optimizado para redes móviles:</strong> Carga rápido
                        incluso con conexión lenta de Tigo, Claro o Personal.
                      </span>
                    </p>
                    <p className="flex items-start gap-2">
                      <Zap className="mt-1 h-4 w-4 flex-shrink-0 text-teal-500" />
                      <span>
                        <strong>Precios en Guaraníes:</strong> Sin conversiones, sin
                        sorpresas por tipo de cambio.
                      </span>
                    </p>
                    <p className="flex items-start gap-2">
                      <Zap className="mt-1 h-4 w-4 flex-shrink-0 text-teal-500" />
                      <span>
                        <strong>Soporte en tu idioma:</strong> Atención por WhatsApp
                        con personas reales, en español paraguayo.
                      </span>
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-white py-16 md:py-24">
        <div className="container mx-auto px-4 text-center md:px-6">
          <div className="mx-auto max-w-2xl">
            <div className="mb-6 flex justify-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-teal-50">
                <Users className="h-8 w-8 text-teal-600" />
              </div>
            </div>
            <h2 className="mb-4 text-2xl font-bold text-slate-900 md:text-3xl">
              ¿Querés conocernos mejor?
            </h2>
            <p className="mb-8 text-lg text-slate-600">
              Agenda una demo y contanos sobre tu clínica. Nos encanta escuchar
              las historias de veterinarios paraguayos.
            </p>
            <div className="flex flex-col justify-center gap-4 sm:flex-row">
              <Link
                href="/demo"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-teal-600 px-8 py-4 text-base font-bold text-white shadow-lg transition-all hover:-translate-y-1 hover:bg-teal-700 hover:shadow-xl"
              >
                Agendar Demo
                <ArrowRight className="h-5 w-5" />
              </Link>
              <a
                href={getWhatsAppUrl(landingMessages.learnMore())}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-full border-2 border-slate-200 bg-white px-8 py-4 text-base font-bold text-slate-700 transition-all hover:-translate-y-1 hover:border-slate-300 hover:shadow-md"
              >
                Escribinos por WhatsApp
              </a>
            </div>
          </div>
        </div>
      </section>

      <LandingFooter />
      <FloatingWhatsApp />
    </main>
  )
}
