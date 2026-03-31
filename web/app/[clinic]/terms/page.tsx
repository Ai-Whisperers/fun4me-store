import { getClinicData } from '@/lib/clinics'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  FileText,
  AlertTriangle,
  CreditCard,
  Calendar,
  ShieldCheck,
  Scale,
  Clock,
} from 'lucide-react'
import type { Metadata } from 'next'
import { getCanonicalUrl } from '@/lib/config'

interface Props {
  params: Promise<{ clinic: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { clinic } = await params
  const data = await getClinicData(clinic)
  if (!data) return { title: 'Página no encontrada' }

  const title = `Términos y Condiciones | ${data.config.name}`
  const description = `Lee los términos y condiciones de servicio de ${data.config.name}. Información sobre citas, pagos, emergencias y responsabilidades.`
  const canonicalUrl = getCanonicalUrl(clinic, '/terms')

  return {
    title,
    description,
    robots: 'index, follow',
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      type: 'website',
      locale: 'es_PY',
      url: canonicalUrl,
      title,
      description,
      siteName: data.config.name,
    },
  }
}

export default async function TermsPage({ params }: Props): Promise<React.ReactElement> {
  const { clinic } = await params
  const data = await getClinicData(clinic)

  if (!data) {
    notFound()
  }

  const { config } = data
  const currentYear = 2024

  const sections = [
    {
      icon: FileText,
      title: '1. Aceptación de los Términos',
      content: `Al utilizar los servicios de ${config.name}, ya sea a través de nuestra clínica física o plataforma digital, aceptas estos términos y condiciones en su totalidad. Si no estás de acuerdo con alguna parte de estos términos, te pedimos que no utilices nuestros servicios.`,
    },
    {
      icon: ShieldCheck,
      title: '2. Servicios Veterinarios',
      content: `Proporcionamos servicios veterinarios profesionales que incluyen consultas, vacunaciones, cirugías, diagnósticos y tratamientos. Todos nuestros servicios son realizados por profesionales veterinarios matriculados. Los resultados de tratamientos pueden variar según cada caso individual.`,
    },
    {
      icon: Calendar,
      title: '3. Citas y Cancelaciones',
      content: `Las citas deben ser programadas con anticipación a través de nuestra plataforma, teléfono o WhatsApp. Solicitamos un aviso de al menos 24 horas para cancelaciones. Las cancelaciones tardías o ausencias repetidas pueden resultar en restricciones para futuras reservas.`,
    },
    {
      icon: CreditCard,
      title: '4. Pagos y Facturación',
      content: `Los pagos por servicios deben realizarse al momento de la consulta o según el acuerdo establecido. Aceptamos efectivo, tarjetas de débito/crédito y transferencias bancarias. Los precios publicados pueden cambiar sin previo aviso. Las cirugías y procedimientos especiales pueden requerir un depósito previo.`,
    },
    {
      icon: AlertTriangle,
      title: '5. Emergencias',
      content: `Nuestro servicio de emergencias está disponible las 24 horas. En situaciones de emergencia, podemos requerir autorización verbal para proceder con tratamientos urgentes. Los servicios de emergencia tienen tarifas diferenciadas según el horario.`,
    },
    {
      icon: Scale,
      title: '6. Responsabilidades del Cliente',
      content: `Como cliente, te comprometes a: proporcionar información veraz sobre la salud de tu mascota, seguir las indicaciones médicas proporcionadas, informar sobre cualquier reacción adversa a tratamientos, mantener actualizada tu información de contacto, y tratar con respeto a nuestro personal.`,
    },
    {
      icon: Clock,
      title: '7. Historial Médico',
      content: `Mantenemos un registro digital del historial médico de tu mascota al que puedes acceder a través del Portal de Dueños. Este historial es confidencial y solo se comparte con tu autorización expresa o cuando la ley lo requiera. Conservamos los registros por un mínimo de 5 años.`,
    },
  ]

  return (
    <div className="min-h-screen bg-[var(--bg-subtle)]">
      {/* Hero Section */}
      <div className="bg-gradient-to-br from-[var(--primary)] to-[var(--primary-dark)] text-white">
        <div className="container mx-auto px-4 py-12 md:py-16">
          <Link
            href={`/${clinic}`}
            className="mb-6 inline-flex items-center gap-2 text-white/80 transition-colors hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver al inicio
          </Link>
          <div className="mb-4 flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/20">
              <FileText className="h-7 w-7" />
            </div>
            <h1 className="text-3xl font-black md:text-4xl">Términos y Condiciones</h1>
          </div>
          <p className="max-w-2xl text-white/80">
            Estos términos regulan el uso de nuestros servicios veterinarios y plataforma digital.
            Por favor, léelos cuidadosamente.
          </p>
          <p className="mt-4 text-sm text-white/60">Última actualización: {currentYear}</p>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-12">
        <div className="mx-auto max-w-3xl space-y-6">
          {/* Sections */}
          {sections.map((section, index) => {
            const Icon = section.icon
            return (
              <div key={index} className="overflow-hidden rounded-2xl bg-white shadow-sm">
                <div className="flex items-center gap-4 border-b border-gray-100 p-6">
                  <div className="bg-[var(--primary)]/10 flex h-12 w-12 items-center justify-center rounded-xl">
                    <Icon className="h-6 w-6 text-[var(--primary)]" />
                  </div>
                  <h2 className="text-xl font-bold text-[var(--text-primary)]">{section.title}</h2>
                </div>
                <div className="p-6">
                  <p className="leading-relaxed text-gray-600">{section.content}</p>
                </div>
              </div>
            )
          })}

          {/* Limitation of Liability */}
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6">
            <div className="flex items-start gap-4">
              <AlertTriangle className="mt-1 h-6 w-6 flex-shrink-0 text-amber-600" />
              <div>
                <h3 className="mb-2 font-bold text-amber-800">8. Limitación de Responsabilidad</h3>
                <p className="text-sm leading-relaxed text-amber-700">
                  Aunque nos esforzamos por proporcionar el mejor cuidado posible, la medicina
                  veterinaria tiene limitaciones inherentes. No garantizamos resultados específicos
                  de tratamientos. Nuestra responsabilidad se limita al valor de los servicios
                  prestados. No somos responsables por complicaciones derivadas del incumplimiento
                  de las indicaciones médicas por parte del propietario.
                </p>
              </div>
            </div>
          </div>

          {/* Modifications */}
          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <h3 className="mb-3 font-bold text-[var(--text-primary)]">
              9. Modificaciones a los Términos
            </h3>
            <p className="leading-relaxed text-gray-600">
              Nos reservamos el derecho de modificar estos términos en cualquier momento. Los
              cambios entrarán en vigencia inmediatamente después de su publicación en nuestra
              plataforma. El uso continuado de nuestros servicios después de cualquier modificación
              constituye la aceptación de los nuevos términos.
            </p>
          </div>

          {/* Contact */}
          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <h3 className="mb-3 font-bold text-[var(--text-primary)]">
              10. Contacto y Jurisdicción
            </h3>
            <p className="mb-4 leading-relaxed text-gray-600">
              Para consultas sobre estos términos, contáctanos a través de:
            </p>
            <div className="space-y-2 text-gray-600">
              <p>
                <strong>Email:</strong> {config.contact?.email}
              </p>
              <p>
                <strong>Teléfono:</strong> {config.contact?.phone_display}
              </p>
              <p>
                <strong>Dirección:</strong> {config.contact?.address}
              </p>
            </div>
            <p className="mt-4 text-sm text-gray-500">
              Estos términos se rigen por las leyes de la República del Paraguay. Cualquier disputa
              será resuelta en los tribunales competentes de la ciudad de Asunción.
            </p>
          </div>

          {/* Agreement */}
          <div className="from-[var(--primary)]/5 to-[var(--accent)]/5 rounded-2xl bg-gradient-to-br p-8 text-center">
            <ShieldCheck className="mx-auto mb-4 h-12 w-12 text-[var(--primary)]" />
            <p className="text-gray-600">
              Al utilizar nuestros servicios, confirmas que has leído, entendido y aceptado estos
              términos y condiciones.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
