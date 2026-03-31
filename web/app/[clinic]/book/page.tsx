import { getClinicData } from '@/lib/clinics'
import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { Metadata } from 'next'
import BookingWizard from '@/components/booking/booking-wizard'
import { BreadcrumbSchema } from '@/components/seo/structured-data'
import { getCanonicalUrl, getSiteUrl } from '@/lib/config'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ clinic: string }>
}): Promise<Metadata> {
  const { clinic } = await params
  const data = await getClinicData(clinic)
  if (!data) return { title: 'Página no encontrada' }

  const title = `Reservar Cita Online | ${data.config.name}`
  const description = `Agenda tu cita veterinaria en ${data.config.name}. Reserva online 24/7, elige horario, servicio y recibe confirmación al instante. ${data.config.contact?.address || ''}`
  const canonicalUrl = getCanonicalUrl(clinic, '/book')
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
          alt: `Reservar cita en ${data.config.name}`,
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

export default async function BookingPage({
  params,
  searchParams,
}: {
  params: Promise<{ clinic: string }>
  searchParams: Promise<{ service?: string; services?: string; pet?: string }>
}) {
  const { clinic } = await params
  const { service, services, pet } = await searchParams

  // Support both ?service=X (single) and ?services=X,Y,Z (multiple) URL formats
  // Backwards compatible: existing links with ?service=X continue to work
  const initialServiceIds = services
    ? services.split(',').filter(Boolean)
    : service
      ? [service]
      : []

  const data = await getClinicData(clinic)
  if (!data) notFound()

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Require authentication for booking
  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
        <div className="max-w-md rounded-3xl bg-white p-8 text-center shadow-xl">
          <h2 className="mb-4 text-2xl font-black text-gray-900">Autenticación Requerida</h2>
          <p className="mb-6 text-gray-600">Por favor inicia sesión para reservar una cita.</p>
          <div className="flex flex-col gap-4">
            <a
              href={`/${clinic}/portal/login?redirect=/${clinic}/book`}
              className="inline-block rounded-2xl bg-[var(--primary)] px-8 py-4 font-bold text-white shadow-xl transition-all hover:-translate-y-1 hover:shadow-2xl"
            >
              Iniciar Sesión
            </a>
            <div className="flex items-center gap-3 text-gray-400">
              <div className="h-px flex-1 bg-gray-200" />
              <span className="text-sm">o</span>
              <div className="h-px flex-1 bg-gray-200" />
            </div>
            <a
              href={`/${clinic}/portal/signup?redirect=/${clinic}/book`}
              className="inline-block rounded-2xl border-2 border-[var(--primary)] bg-white px-8 py-4 font-bold text-[var(--primary)] transition-all hover:-translate-y-1 hover:bg-[var(--primary)] hover:text-white"
            >
              Crear Cuenta
            </a>
            <p className="mt-2 text-sm text-gray-500">
              Es gratis y solo toma un minuto
            </p>
          </div>
        </div>
      </div>
    )
  }

  // Fetch user's pets if logged in to speed up booking
  const { data: pets } = await supabase
    .from('pets')
    .select('id, name, species, breed')
    .eq('owner_id', user.id)

  const userPets = pets || []

  // Breadcrumb items for structured data
  const breadcrumbItems = [
    { name: 'Inicio', url: `/${clinic}` },
    { name: 'Reservar Cita', url: `/${clinic}/book` },
  ]

  return (
    <>
      <BreadcrumbSchema items={breadcrumbItems} />
      <div className="min-h-screen bg-gray-50">
        <BookingWizard clinic={data} user={user} userPets={userPets} initialServiceIds={initialServiceIds} initialPetId={pet} />
      </div>
    </>
  )
}
