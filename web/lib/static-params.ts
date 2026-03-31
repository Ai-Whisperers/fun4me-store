import fs from 'fs'
import path from 'path'

// Cache for clinic slugs
let clinicSlugsCache: string[] | null = null

/**
 * Get all active clinic slugs from the content directory
 */
export function getClinicSlugs(): string[] {
  if (clinicSlugsCache) return clinicSlugsCache

  const contentDir = path.join(process.cwd(), '.content_data')

  try {
    const entries = fs.readdirSync(contentDir, { withFileTypes: true })
    clinicSlugsCache = entries
      .filter((entry) => entry.isDirectory() && !entry.name.startsWith('_'))
      .map((entry) => entry.name)

    return clinicSlugsCache
  } catch (_error: unknown) {
    // Fallback to known clinics
    return ['terrapet', 'petlife']
  }
}

/**
 * Generate static params for [clinic] routes
 * Use: export { generateClinicParams as generateStaticParams } from '@/lib/static-params'
 */
export async function generateClinicParams() {
  const slugs = getClinicSlugs()
  return slugs.map((clinic) => ({ clinic }))
}

/**
 * Generate static params for [clinic]/[...nested] routes
 */
export async function generateNestedClinicParams<T extends Record<string, string>>(
  nestedParams: T[]
) {
  const slugs = getClinicSlugs()
  return slugs.flatMap((clinic) => nestedParams.map((params) => ({ clinic, ...params })))
}

// Re-export for convenience
export { generateClinicParams as generateStaticParams }
