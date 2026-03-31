/**
 * E2E Test Fixtures: Tenants
 *
 * Tenant configuration for E2E tests.
 */

export const DEFAULT_TENANT = {
  id: 'terrapet',
  slug: 'terrapet',
  name: 'Veterinaria Adris',
}

export const TENANTS = {
  terrapet: {
    id: 'terrapet',
    slug: 'terrapet',
    name: 'Veterinaria Adris',
  },
  petlife: {
    id: 'petlife',
    slug: 'petlife',
    name: 'PetLife',
  },
}

export const getRoute = (tenant: keyof typeof TENANTS, path: string): string => {
  return `/${TENANTS[tenant].slug}${path}`
}
