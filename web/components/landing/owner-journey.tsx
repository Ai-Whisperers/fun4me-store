'use client'
import {
  Search,
  UserPlus,
  Smartphone,
  Calendar,
  PawPrint,
  Bell,
  QrCode,
  FileText,
  Star,
  ArrowRight,
  CheckCircle2,
  Sparkles,
} from 'lucide-react'
import { getWhatsAppUrl, landingMessages } from '@/lib/whatsapp'

const steps = [
  {
    number: '01',
    icon: Search,
    title: 'Encontra una Clinica',
    description:
      'Busca en nuestro mapa la veterinaria Vetic mas cercana a vos. Todas tienen el mismo nivel de tecnologia.',
    color: '#2DCEA3',
  },
  {
    number: '02',
    icon: UserPlus,
    title: 'Registrate Gratis',
    description:
      'Crea tu cuenta en la clinica que elegiste. Solo necesitas tu email y un password. Tarda menos de 1 minuto.',
    color: '#00C9FF',
  },
  {
    number: '03',
    icon: PawPrint,
    title: 'Agrega tus Mascotas',
    description:
      'Registra a tus mascotas con sus datos basicos. La clinica completara el historial medico en cada visita.',
    color: '#5C6BFF',
  },
  {
    number: '04',
    icon: Sparkles,
    title: 'Disfruta los Beneficios',
    description:
      'Agenda citas online, recibe recordatorios, accede al historial digital y mucho mas. Todo desde tu celular.',
    color: '#2DCEA3',
  },
]

const benefits = [
  {
    icon: Smartphone,
    title: 'Todo en tu Celular',
    description:
      'Accede al historial medico, vacunas y recetas de tus mascotas desde cualquier lugar, 24/7.',
  },
  {
    icon: Calendar,
    title: 'Citas Online',
    description:
      'Agenda turnos sin llamar. Elige fecha, hora y veterinario desde la comodidad de tu casa.',
  },
  {
    icon: Bell,
    title: 'Recordatorios',
    description:
      'Te avisamos cuando toca vacunar, desparasitar o hacer el control anual. Nunca mas te olvidas.',
  },
  {
    icon: QrCode,
    title: 'Tag QR Gratis',
    description:
      'Tu mascota recibe un codigo QR unico. Si se pierde, quien la encuentre puede contactarte al instante.',
  },
  {
    icon: FileText,
    title: 'Documentos Digitales',
    description:
      'Recetas, facturas y certificados siempre disponibles. Descargalos o compartelos cuando los necesites.',
  },
  {
    icon: Star,
    title: 'Puntos de Lealtad',
    description:
      'Acumula puntos en cada visita y compra. Canjealos por descuentos en servicios y productos.',
  },
]

const faqs = [
  {
    question: '¿Cuanto cuesta para mi como dueno?',
    answer:
      'Nada. El servicio es 100% gratuito para los duenos de mascotas. Solo la clinica paga por usar Vetic.',
  },
  {
    question: '¿Puedo tener mascotas en varias clinicas?',
    answer:
      'Si. Puedes registrar diferentes mascotas en diferentes clinicas Vetic. Cada una tendra su propio historial.',
  },
  {
    question: '¿Que pasa si mi veterinaria no usa Vetic?',
    answer:
      'Puedes recomendarle a tu veterinaria que se una a la red. Contactanos y les explicamos los beneficios.',
  },
]

export function OwnerJourney() {
  return (
    <section id="para-duenos" className="relative overflow-hidden bg-[#0F172A] py-20 md:py-28">
      {/* Background decoration */}
      <div className="absolute right-0 top-0 h-[500px] w-[500px] rounded-full bg-[#5C6BFF]/10 blur-[150px]" />
      <div className="absolute bottom-0 left-0 h-[500px] w-[500px] rounded-full bg-[#2DCEA3]/10 blur-[150px]" />

      <div className="container relative z-10 mx-auto px-4 md:px-6">
        {/* Section Header */}
        <div className="mb-16 text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#5C6BFF]/20 bg-[#5C6BFF]/10 px-4 py-2">
            <PawPrint className="h-4 w-4 text-[#5C6BFF]" />
            <span className="text-sm font-medium text-[#5C6BFF]">Para Duenos de Mascotas</span>
          </div>
          <h2 className="mb-6 text-3xl font-black text-white md:text-4xl lg:text-5xl">
            Tu mascota merece lo mejor
          </h2>
          <p className="mx-auto max-w-2xl text-lg text-white/60">
            Como dueno, tenes acceso gratuito a herramientas digitales que hacen mas facil cuidar la
            salud de tu mascota. Asi funciona:
          </p>
        </div>

        {/* Journey Steps */}
        <div className="mx-auto mb-20 max-w-5xl">
          <div className="grid gap-6 md:grid-cols-4">
            {steps.map((step, idx) => (
              <div key={idx} className="group relative">
                {/* Connector line */}
                {idx < steps.length - 1 && (
                  <div className="absolute left-[calc(50%+40px)] top-10 hidden h-0.5 w-[calc(100%-40px)] md:block">
                    <div className="h-full w-full bg-gradient-to-r from-white/20 to-transparent" />
                    <ArrowRight className="absolute right-0 top-1/2 h-4 w-4 -translate-y-1/2 text-white/20" />
                  </div>
                )}

                <div className="text-center">
                  {/* Icon */}
                  <div
                    className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-2xl transition-transform group-hover:scale-110"
                    style={{ backgroundColor: `${step.color}20` }}
                  >
                    <step.icon className="h-10 w-10" style={{ color: step.color }} />
                  </div>

                  {/* Step number */}
                  <span
                    className="mb-3 inline-block rounded-full px-3 py-1 text-xs font-bold"
                    style={{ backgroundColor: step.color, color: '#0F172A' }}
                  >
                    Paso {step.number}
                  </span>

                  {/* Content */}
                  <h3 className="mb-2 text-lg font-bold text-white">{step.title}</h3>
                  <p className="text-sm leading-relaxed text-white/50">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Benefits Grid */}
        <div className="mb-20">
          <h3 className="mb-8 text-center text-2xl font-bold text-white">
            Todo esto es gratis para vos
          </h3>
          <div className="mx-auto grid max-w-5xl gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {benefits.map((benefit, idx) => (
              <div
                key={idx}
                className="group rounded-xl border border-white/10 bg-white/5 p-5 transition-all hover:border-[#5C6BFF]/30"
              >
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-[#5C6BFF]/10 transition-colors group-hover:bg-[#5C6BFF]/20">
                  <benefit.icon className="h-5 w-5 text-[#5C6BFF]" />
                </div>
                <h4 className="mb-1 font-bold text-white">{benefit.title}</h4>
                <p className="text-sm text-white/50">{benefit.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Mobile App Preview */}
        <div className="mx-auto mb-20 max-w-4xl">
          <div className="grid items-center gap-8 md:grid-cols-2">
            <div>
              <h3 className="mb-4 text-2xl font-bold text-white">Siempre a mano, en tu celular</h3>
              <p className="mb-6 text-white/60">
                El portal de Vetic funciona perfecto desde el navegador de tu celular. No necesitas
                descargar ninguna app. Guarda el link en tu pantalla de inicio y accede con un solo
                toque.
              </p>
              <ul className="space-y-3">
                {[
                  'Ve el historial medico completo',
                  'Descarga el carnet de vacunas en PDF',
                  'Recibe notificaciones de recordatorios',
                  'Chatea directamente con la clinica',
                ].map((item, idx) => (
                  <li key={idx} className="flex items-center gap-3 text-white/70">
                    <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-[#2DCEA3]" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="relative">
              {/* Phone mockup */}
              <div className="relative mx-auto h-[480px] w-[240px] overflow-hidden rounded-[3rem] border-4 border-white/10 bg-[#1a2744] shadow-2xl">
                {/* Screen content */}
                <div className="absolute inset-4 overflow-hidden rounded-[2rem] bg-gradient-to-b from-[#2DCEA3]/20 to-[#5C6BFF]/20">
                  {/* Status bar */}
                  <div className="flex h-8 items-center justify-center bg-black/20">
                    <div className="h-4 w-20 rounded-full bg-black/30" />
                  </div>

                  {/* Content preview */}
                  <div className="space-y-3 p-4">
                    {/* Header */}
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#2DCEA3]/30">
                        <PawPrint className="h-6 w-6 text-[#2DCEA3]" />
                      </div>
                      <div>
                        <div className="h-3 w-20 rounded bg-white/30" />
                        <div className="mt-1 h-2 w-14 rounded bg-white/20" />
                      </div>
                    </div>

                    {/* Cards */}
                    <div className="space-y-2">
                      <div className="rounded-lg bg-white/10 p-3">
                        <div className="mb-2 flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-[#5C6BFF]" />
                          <div className="h-2 w-16 rounded bg-white/30" />
                        </div>
                        <div className="h-2 w-full rounded bg-white/20" />
                      </div>
                      <div className="rounded-lg bg-white/10 p-3">
                        <div className="mb-2 flex items-center gap-2">
                          <Bell className="h-4 w-4 text-[#2DCEA3]" />
                          <div className="h-2 w-20 rounded bg-white/30" />
                        </div>
                        <div className="h-2 w-3/4 rounded bg-white/20" />
                      </div>
                      <div className="rounded-lg bg-white/10 p-3">
                        <div className="mb-2 flex items-center gap-2">
                          <FileText className="h-4 w-4 text-[#00C9FF]" />
                          <div className="h-2 w-14 rounded bg-white/30" />
                        </div>
                        <div className="h-2 w-2/3 rounded bg-white/20" />
                      </div>
                    </div>

                    {/* Bottom nav */}
                    <div className="absolute bottom-4 left-4 right-4">
                      <div className="flex justify-around rounded-full bg-black/20 p-2">
                        <div className="h-8 w-8 rounded-full bg-white/10" />
                        <div className="h-8 w-8 rounded-full bg-[#2DCEA3]/30" />
                        <div className="h-8 w-8 rounded-full bg-white/10" />
                        <div className="h-8 w-8 rounded-full bg-white/10" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Decorative elements */}
              <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-[#5C6BFF]/20 blur-2xl" />
              <div className="absolute -bottom-4 -left-4 h-32 w-32 rounded-full bg-[#2DCEA3]/20 blur-2xl" />
            </div>
          </div>
        </div>

        {/* Mini FAQ */}
        <div className="mx-auto mb-12 max-w-3xl">
          <h3 className="mb-6 text-center text-xl font-bold text-white">
            Preguntas frecuentes de duenos
          </h3>
          <div className="space-y-4">
            {faqs.map((faq, idx) => (
              <div key={idx} className="rounded-xl border border-white/10 bg-white/5 p-4">
                <h4 className="mb-2 font-bold text-white">{faq.question}</h4>
                <p className="text-sm text-white/50">{faq.answer}</p>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="text-center">
          <p className="mb-4 text-white/50">¿Listo para empezar?</p>
          <div className="flex flex-col justify-center gap-4 sm:flex-row">
            <a
              href="#mapa"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#5C6BFF] to-[#00C9FF] px-6 py-3 font-bold text-white transition-all hover:shadow-lg hover:shadow-[#5C6BFF]/20"
            >
              <Search className="h-5 w-5" />
              Buscar Clinica Cercana
            </a>
            <a
              href={getWhatsAppUrl(landingMessages.quickPetOwner())}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-full border border-white/20 bg-white/5 px-6 py-3 font-medium text-white transition-all hover:bg-white/10"
            >
              Tengo una Pregunta
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}
