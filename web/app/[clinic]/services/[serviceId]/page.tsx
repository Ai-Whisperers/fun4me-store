import { getClinicData, ClinicData } from '@/lib/clinics'
import { notFound } from 'next/navigation'
import { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { ServiceDetailClient } from '@/components/services/service-detail-client'
import { ServiceSchema, BreadcrumbSchema } from '@/components/seo/structured-data'
import type { Service } from '@/lib/types/services'
import { getCanonicalUrl, getSiteUrl } from '@/lib/config'

// Helper to find service by slug/id
async function getService(
  clinicSlug: string,
  serviceId: string
): Promise<{ service: Service; allServices: Service[]; data: ClinicData } | null> {
  const data = await getClinicData(clinicSlug)
  if (!data) return null

  const services = data.services?.services as Service[] | undefined
  const service = services?.find((s) => s.id === serviceId)
  if (!service) return null

  return { service, allServices: services || [], data }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ clinic: string; serviceId: string }>
}): Promise<Metadata> {
  const { clinic, serviceId } = await params
  const result = await getService(clinic, serviceId)

  if (!result || !result.service) return {}

  const { service, data } = result
  const canonicalUrl = getCanonicalUrl(clinic, `/services/${serviceId}`)
  const ogImage = data.config.branding?.og_image_url || '/branding/default-og.jpg'

  return {
    title: `${service.title} | ${data.config.name}`,
    description: service.summary || service.description?.substring(0, 160),
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      type: 'website',
      locale: 'es_PY',
      url: canonicalUrl,
      title: service.title,
      description: service.summary || service.description?.substring(0, 160),
      siteName: data.config.name,
      images: [
        {
          url: ogImage.startsWith('/') ? getSiteUrl(ogImage) : ogImage,
          width: 1200,
          height: 630,
          alt: service.title,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: service.title,
      description: service.summary || service.description?.substring(0, 160),
    },
  }
}

// Note: generateStaticParams removed to allow dynamic rendering

export default async function ServiceDetailPage({
  params,
}: {
  params: Promise<{ clinic: string; serviceId: string }>
}) {
  const { clinic, serviceId } = await params
  const result = await getService(clinic, serviceId)

  if (!result || !result.service) notFound()

  const { service, allServices, data } = result
  const { config } = data

  // Check if user is logged in
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const isLoggedIn = !!user

  // Breadcrumb items for structured data
  const breadcrumbItems = [
    { name: 'Inicio', url: `/${clinic}` },
    { name: 'Servicios', url: `/${clinic}/services` },
    { name: service.title, url: `/${clinic}/services/${serviceId}` },
  ]

  return (
    <>
      {/* Structured Data for SEO */}
      <ServiceSchema
        clinic={clinic}
        clinicName={config.name}
        service={{
          id: service.id,
          title: service.title,
          summary: service.summary,
          description: service.description,
          base_price: service.base_price,
          duration_minutes: service.duration_minutes,
          category: service.category,
          image_url: service.image_url,
        }}
      />
      <BreadcrumbSchema items={breadcrumbItems} />

      <ServiceDetailClient
        service={service}
        allServices={allServices}
        config={{
          name: config.name,
          contact: {
            whatsapp_number: config.contact?.whatsapp_number,
          },
          ui_labels: config.ui_labels,
        }}
        clinic={clinic}
        isLoggedIn={isLoggedIn}
      />
    </>
  )
}
