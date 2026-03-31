import type { Metadata } from 'next'
import { getClinicData } from '@/lib/clinics'
import { getCanonicalUrl } from '@/lib/config'

interface PageMetadata {
  title: string
  description: string
  path?: string
  image?: string
  noIndex?: boolean
}

/**
 * Generate metadata for clinic pages with consistent structure
 * @param clinic - Clinic slug
 * @param page - Page metadata configuration
 * @returns Next.js Metadata object
 */
export async function generateClinicMetadata(
  clinic: string,
  page: PageMetadata
): Promise<Metadata> {
  const clinicData = await getClinicData(clinic)
  const clinicName = clinicData?.config?.name || 'Veterinaria'

  return {
    title: `${page.title} | ${clinicName}`,
    description: page.description,
    robots: page.noIndex ? 'noindex, nofollow' : 'index, follow',
    openGraph: {
      title: `${page.title} | ${clinicName}`,
      description: page.description,
      type: 'website',
      url: page.path ? getCanonicalUrl(clinic, page.path) : undefined,
      siteName: clinicName,
      locale: 'es_PY',
      images: page.image ? [{ url: page.image, width: 1200, height: 630 }] : undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title: `${page.title} | ${clinicName}`,
      description: page.description,
      images: page.image ? [page.image] : undefined,
    },
    alternates: {
      canonical: page.path ? getCanonicalUrl(clinic, page.path) : undefined,
    },
  }
}

/**
 * Generate metadata for product pages
 * @param product - Product data
 * @param clinicName - Clinic name
 * @returns Next.js Metadata object
 */
export function generateProductMetadata(
  product: { name: string; description?: string; image_url?: string; base_price: number },
  clinicName: string
): Metadata {
  return {
    title: `${product.name} | ${clinicName}`,
    description: product.description || `Compra ${product.name} en ${clinicName}`,
    openGraph: {
      title: product.name,
      description: product.description,
      type: 'website',
      images: product.image_url ? [{ url: product.image_url }] : undefined,
    },
  }
}

/**
 * Generate metadata for service pages
 * @param service - Service data
 * @param clinicName - Clinic name
 * @returns Next.js Metadata object
 */
export function generateServiceMetadata(
  service: { name: string; description?: string; base_price?: number },
  clinicName: string
): Metadata {
  return {
    title: `${service.name} | ${clinicName}`,
    description: service.description || `Servicio de ${service.name} en ${clinicName}`,
    openGraph: {
      title: service.name,
      description: service.description,
      type: 'website',
    },
  }
}
