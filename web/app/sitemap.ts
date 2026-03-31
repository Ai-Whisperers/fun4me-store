import { MetadataRoute } from 'next'
import { getAllClinics, getClinicData } from '@/lib/clinics'
import { getSiteUrl } from '@/lib/config'

// Marketing pages at root level
const MARKETING_PAGES = [
  { path: '/funcionalidades', priority: 0.9, changeFrequency: 'weekly' as const },
  { path: '/precios', priority: 0.9, changeFrequency: 'weekly' as const },
  { path: '/red', priority: 0.8, changeFrequency: 'daily' as const },
  { path: '/demo', priority: 0.9, changeFrequency: 'weekly' as const },
  { path: '/nosotros', priority: 0.7, changeFrequency: 'monthly' as const },
]

// Static pages for each clinic
const CLINIC_PAGES = [
  '', // homepage
  '/services',
  '/about',
  '/store',
  '/faq',
  '/book',
  '/tools/toxic-food',
  '/tools/age-calculator',
  '/loyalty_points',
  '/privacy',
  '/terms',
]

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const clinics = await getAllClinics()
  const entries: MetadataRoute.Sitemap = []

  // Root landing page
  entries.push({
    url: getSiteUrl(),
    lastModified: new Date(),
    changeFrequency: 'weekly',
    priority: 1.0,
  })

  // Marketing pages
  for (const page of MARKETING_PAGES) {
    entries.push({
      url: getSiteUrl(page.path),
      lastModified: new Date(),
      changeFrequency: page.changeFrequency,
      priority: page.priority,
    })
  }

  // Generate entries for each clinic
  for (const clinicSlug of clinics) {
    const clinicData = await getClinicData(clinicSlug)
    if (!clinicData) continue

    // Clinic homepage - highest priority
    entries.push({
      url: getSiteUrl(`/${clinicSlug}`),
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    })

    // Static clinic pages
    for (const page of CLINIC_PAGES) {
      if (page === '') continue // Already added homepage

      entries.push({
        url: getSiteUrl(`/${clinicSlug}${page}`),
        lastModified: new Date(),
        changeFrequency: page === '/services' || page === '/store' ? 'daily' : 'weekly',
        priority: page === '/services' ? 0.8 : 0.7,
      })
    }

    // Dynamic service detail pages
    if (clinicData.services?.services) {
      for (const service of clinicData.services.services) {
        entries.push({
          url: getSiteUrl(`/${clinicSlug}/services/${service.id}`),
          lastModified: new Date(),
          changeFrequency: 'weekly',
          priority: 0.6,
        })
      }
    }
  }

  return entries
}
