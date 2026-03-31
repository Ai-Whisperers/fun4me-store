import { getClinicData } from '@/lib/clinics'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Shield, Lock, Eye, Database, Bell, UserCheck, Mail } from 'lucide-react'
import type { Metadata } from 'next'
import { getCanonicalUrl } from '@/lib/config'

interface Props {
  params: Promise<{ clinic: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { clinic } = await params
  const data = await getClinicData(clinic)
  if (!data) return { title: 'Página no encontrada' }

  const title = `Política de Privacidad | ${data.config.name}`
  const description = `Lee nuestra política de privacidad y protección de datos. ${data.config.name} protege tu información personal y la de tu mascota.`
  const canonicalUrl = getCanonicalUrl(clinic, '/privacy')

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

export default async function PrivacyPage({ params }: Props): Promise<React.ReactElement> {
  const { clinic } = await params
  const data = await getClinicData(clinic)

  if (!data) {
    notFound()
  }

  const { config } = data
  const currentYear = 2024

  const sections = [
    {
      icon: Database,
      title: 'Información que Recopilamos',
      content: [
        'Datos de identificación personal (nombre, email, teléfono)',
        'Información de tus mascotas (nombre, especie, raza, historial médico)',
        'Datos de facturación y pagos',
        'Historial de citas y servicios utilizados',
        'Comunicaciones con nuestro equipo',
      ],
    },
    {
      icon: Eye,
      title: 'Cómo Utilizamos tu Información',
      content: [
        'Proporcionar y mejorar nuestros servicios veterinarios',
        'Gestionar citas y enviar recordatorios',
        'Procesar pagos y facturación',
        'Enviar comunicaciones sobre la salud de tu mascota',
        'Cumplir con obligaciones legales y sanitarias',
      ],
    },
    {
      icon: Lock,
      title: 'Protección de Datos',
      content: [
        'Utilizamos encriptación SSL/TLS para todas las comunicaciones',
        'Acceso restringido solo al personal autorizado',
        'Servidores seguros con respaldo regular de datos',
        'Políticas internas de seguridad de la información',
        'Cumplimiento con regulaciones de protección de datos',
      ],
    },
    {
      icon: UserCheck,
      title: 'Tus Derechos',
      content: [
        'Acceder a tus datos personales en cualquier momento',
        'Solicitar corrección de información incorrecta',
        'Solicitar eliminación de tus datos (derecho al olvido)',
        'Oponerte al procesamiento de tus datos para marketing',
        'Exportar tus datos en formato portable',
      ],
    },
    {
      icon: Bell,
      title: 'Comunicaciones',
      content: [
        'Recibirás recordatorios de vacunas y citas programadas',
        'Notificaciones sobre el estado de salud de tu mascota',
        'Puedes optar por no recibir comunicaciones promocionales',
        'Las comunicaciones médicas importantes no pueden desactivarse',
      ],
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
              <Shield className="h-7 w-7" />
            </div>
            <h1 className="text-3xl font-black md:text-4xl">Política de Privacidad</h1>
          </div>
          <p className="max-w-2xl text-white/80">
            Tu privacidad es importante para nosotros. Esta política describe cómo recopilamos,
            usamos y protegemos tu información personal.
          </p>
          <p className="mt-4 text-sm text-white/60">Última actualización: {currentYear}</p>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-12">
        <div className="mx-auto max-w-3xl space-y-8">
          {/* Introduction */}
          <div className="rounded-2xl bg-white p-8 shadow-sm">
            <p className="leading-relaxed text-gray-600">
              En <strong className="text-[var(--text-primary)]">{config.name}</strong>, nos
              comprometemos a proteger la privacidad de nuestros clientes y sus mascotas. Esta
              Política de Privacidad explica cómo recopilamos, utilizamos, divulgamos y protegemos
              tu información cuando utilizas nuestros servicios veterinarios y nuestra plataforma
              digital.
            </p>
          </div>

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
                  <ul className="space-y-3">
                    {section.content.map((item, idx) => (
                      <li key={idx} className="flex items-start gap-3 text-gray-600">
                        <span className="mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[var(--primary)]" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )
          })}

          {/* Cookies */}
          <div className="rounded-2xl bg-white p-8 shadow-sm">
            <h2 className="mb-4 text-xl font-bold text-[var(--text-primary)]">Uso de Cookies</h2>
            <p className="mb-4 leading-relaxed text-gray-600">
              Utilizamos cookies y tecnologías similares para mejorar tu experiencia en nuestra
              plataforma. Las cookies nos ayudan a:
            </p>
            <ul className="space-y-2 text-gray-600">
              <li className="flex items-start gap-3">
                <span className="mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[var(--primary)]" />
                Recordar tus preferencias y sesión iniciada
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[var(--primary)]" />
                Analizar el uso de la plataforma para mejorarla
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[var(--primary)]" />
                Garantizar la seguridad de tu cuenta
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div className="from-[var(--primary)]/5 to-[var(--accent)]/5 rounded-2xl bg-gradient-to-br p-8 text-center">
            <Mail className="mx-auto mb-4 h-12 w-12 text-[var(--primary)]" />
            <h2 className="mb-2 text-xl font-bold text-[var(--text-primary)]">
              ¿Tienes preguntas?
            </h2>
            <p className="mb-6 text-gray-600">
              Si tienes dudas sobre nuestra política de privacidad o quieres ejercer alguno de tus
              derechos, contáctanos.
            </p>
            <a
              href={`mailto:${config.contact?.email || 'privacidad@veterinaria.com'}`}
              className="inline-flex items-center gap-2 rounded-xl bg-[var(--primary)] px-6 py-3 font-bold text-white transition-opacity hover:opacity-90"
            >
              <Mail className="h-5 w-5" />
              {config.contact?.email || 'Contactar'}
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
