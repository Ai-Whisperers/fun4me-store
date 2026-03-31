import { getClinicData } from '@/lib/clinics'
import { notFound } from 'next/navigation'
import { Metadata } from 'next'
import { MessageCircle } from 'lucide-react'
import { ServicesGrid } from '@/components/services/services-grid'
import { getCanonicalUrl, getSiteUrl } from '@/lib/config'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ clinic: string }>
}): Promise<Metadata> {
  const { clinic } = await params
  const data = await getClinicData(clinic)
  if (!data) return {}

  const title = `${data.services.meta?.title || 'Servicios'} | ${data.config.name}`
  const description =
    data.services.meta?.subtitle || `Servicios veterinarios de ${data.config.name}`
  const canonicalUrl = getCanonicalUrl(clinic, '/services')
  const ogImage = data.config.branding?.og_image_url || '/branding/default-og.jpg'

  return {
    title,
    description,
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
      images: [
        {
          url: ogImage.startsWith('/') ? getSiteUrl(ogImage) : ogImage,
          width: 1200,
          height: 630,
          alt: `Servicios de ${data.config.name}`,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
  }
}

export default async function ServicesPage({ params }: { params: Promise<{ clinic: string }> }) {
  const { clinic } = await params
  const data = await getClinicData(clinic)

  if (!data) notFound()

  const { services, config } = data

  return (
    <div className="min-h-screen bg-[var(--bg-default)] pb-24">
      {/* HEADER */}
      <div className="relative overflow-hidden pb-24 pt-20 text-center sm:pb-32 sm:pt-28 md:pb-40 md:pt-32">
        <div className="absolute inset-0 z-0" style={{ background: 'var(--gradient-primary)' }} />
        <div
          className="absolute inset-0 z-0 opacity-10 mix-blend-overlay"
          style={{
            backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)',
            backgroundSize: '32px 32px',
          }}
        />

        <div className="container relative z-10 px-4">
          <h1 className="font-heading mb-6 text-4xl font-black text-white drop-shadow-md md:text-6xl">
            {services.meta?.title || 'Nuestros Servicios'}
          </h1>
          <p className="mx-auto max-w-2xl text-lg font-medium text-white/90 md:text-xl">
            {services.meta?.subtitle}
          </p>
        </div>
      </div>

      <div className="container relative z-20 mx-auto -mt-10 max-w-5xl px-4 md:px-6">
        <ServicesGrid services={services.services} config={config} />
      </div>

      {/* Floating CTA */}
      <div className="animate-bounce-in fixed bottom-8 right-4 z-50 pb-[env(safe-area-inset-bottom)] sm:bottom-10 sm:right-6 md:bottom-12 md:right-8">
        <a
          href={`https://wa.me/${config.contact.whatsapp_number}`}
          target="_blank"
          className="flex min-h-[48px] items-center gap-2 rounded-full bg-[var(--status-success)] px-5 py-3 text-sm font-bold text-white shadow-[var(--shadow-lg)] ring-4 ring-white/30 backdrop-blur-sm transition-all hover:-translate-y-1 hover:shadow-xl hover:brightness-110 sm:gap-3 sm:px-8 sm:py-4 sm:text-base"
          style={{ backgroundColor: '#25D366' }} rel="noreferrer" // WhatsApp Brand Color Override
        >
          <MessageCircle className="h-5 w-5 sm:h-6 sm:w-6" />
          <span className="hidden sm:inline">
            {config.ui_labels?.services?.book_floating_btn || 'Agendar Turno'}
          </span>
          <span className="sm:hidden">WhatsApp</span>
        </a>
      </div>
    </div>
  )
}
