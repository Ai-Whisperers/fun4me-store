/**
 * Test Fixtures: Tenants
 *
 * Pre-defined tenant data for testing multi-tenant functionality.
 * These match the tenants defined in the database schema.
 */

export interface TenantFixture {
  id: string
  name: string
  slug: string
}

/** Default test tenants matching database seeds */
export const TENANTS: Record<string, TenantFixture> = {
  terrapet: {
    id: 'terrapet',
    name: 'Veterinaria Adris',
    slug: 'terrapet',
  },
  petlife: {
    id: 'petlife',
    name: 'PetLife Center',
    slug: 'petlife',
  },
}

/** Get tenant by ID */
export function getTenant(id: string): TenantFixture {
  const tenant = TENANTS[id]
  if (!tenant) {
    throw new Error(`Unknown tenant: ${id}`)
  }
  return tenant
}

/** Default tenant for most tests */
export const DEFAULT_TENANT = TENANTS.terrapet

/** All tenant IDs for multi-tenant tests */
export const ALL_TENANT_IDS = Object.keys(TENANTS)

/** Generate URL for a tenant route */
export function tenantUrl(tenant: string | TenantFixture, path: string = ''): string {
  const slug = typeof tenant === 'string' ? tenant : tenant.slug
  return `/${slug}${path.startsWith('/') ? path : `/${path}`}`
}

/** Routes for testing */
export const TENANT_ROUTES = {
  home: (tenant: string) => tenantUrl(tenant, ''),
  about: (tenant: string) => tenantUrl(tenant, 'about'),
  services: (tenant: string) => tenantUrl(tenant, 'services'),
  store: (tenant: string) => tenantUrl(tenant, 'store'),
  cart: (tenant: string) => tenantUrl(tenant, 'cart'),
  book: (tenant: string) => tenantUrl(tenant, 'book'),
  portal: {
    login: (tenant: string) => tenantUrl(tenant, 'portal/login'),
    signup: (tenant: string) => tenantUrl(tenant, 'portal/signup'),
    logout: (tenant: string) => tenantUrl(tenant, 'portal/logout'),
    profile: (tenant: string) => tenantUrl(tenant, 'portal/profile'),
    dashboard: (tenant: string) => tenantUrl(tenant, 'portal/dashboard'),
    pets: (tenant: string) => tenantUrl(tenant, 'portal/pets'),
    petNew: (tenant: string) => tenantUrl(tenant, 'portal/pets/new'),
    pet: (tenant: string, petId: string) => tenantUrl(tenant, `portal/pets/${petId}`),
    petRecords: (tenant: string, petId: string) =>
      tenantUrl(tenant, `portal/pets/${petId}/records`),
    petVaccines: (tenant: string, petId: string) =>
      tenantUrl(tenant, `portal/pets/${petId}/vaccines`),
    appointments: (tenant: string) => tenantUrl(tenant, 'portal/appointments'),
    schedule: (tenant: string) => tenantUrl(tenant, 'portal/schedule'),
    prescriptions: (tenant: string) => tenantUrl(tenant, 'portal/prescriptions'),
    inventory: (tenant: string) => tenantUrl(tenant, 'portal/inventory'),
    finance: (tenant: string) => tenantUrl(tenant, 'portal/finance'),
    products: (tenant: string) => tenantUrl(tenant, 'portal/products'),
    team: (tenant: string) => tenantUrl(tenant, 'portal/team'),
    admin: (tenant: string) => tenantUrl(tenant, 'portal/admin'),
    epidemiology: (tenant: string) => tenantUrl(tenant, 'portal/epidemiology'),
    campaigns: (tenant: string) => tenantUrl(tenant, 'portal/campaigns'),
  },
  tools: {
    toxicFood: (tenant: string) => tenantUrl(tenant, 'tools/toxic-food'),
    ageCalculator: (tenant: string) => tenantUrl(tenant, 'tools/age-calculator'),
  },
  clinical: {
    diagnosisCodes: (tenant: string) => tenantUrl(tenant, 'diagnosis_codes'),
    drugDosages: (tenant: string) => tenantUrl(tenant, 'drug_dosages'),
    growthCharts: (tenant: string) => tenantUrl(tenant, 'growth_charts'),
    euthanasiaAssessments: (tenant: string) => tenantUrl(tenant, 'euthanasia_assessments'),
    vaccineReactions: (tenant: string) => tenantUrl(tenant, 'vaccine_reactions'),
    reproductiveCycles: (tenant: string) => tenantUrl(tenant, 'reproductive_cycles'),
    loyaltyPoints: (tenant: string) => tenantUrl(tenant, 'loyalty_points'),
  },
}
