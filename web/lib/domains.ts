/**
 * Domain Resolution Utilities
 *
 * Provides domain-to-tenant mapping for the multi-tenant platform.
 * Used by middleware to resolve custom domains to tenant slugs.
 *
 * @see /web/.content_data/domains.json - Domain registry
 * @see /web/middleware.ts - Domain resolution in middleware
 */

import type { DomainEntry, DomainLookupResult, DomainTenantMap } from '@/lib/types/domains'

// Import domains at build time
// Note: In Edge runtime, we can't use fs, so we import the JSON directly
import domainsConfig from '@/.content_data/domains.json'

// ============================================================================
// DOMAIN LOOKUP MAP
// ============================================================================

/**
 * Pre-built lookup map for fast domain resolution
 * Only includes active domains
 */
const domainMap: DomainTenantMap = new Map()

// Build the lookup map at module load time
for (const entry of domainsConfig.domains as DomainEntry[]) {
  if (entry.status === 'active') {
    domainMap.set(entry.domain.toLowerCase(), entry)
  }
}

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * Get domain mapping entry by hostname
 *
 * @param host - The hostname from request headers (may include port)
 * @returns Domain entry or null if not found/inactive
 *
 * @example
 * const mapping = getDomainMapping('terrapet.com.py')
 * if (mapping) {
 *   console.log(mapping.tenant) // 'terrapet'
 * }
 */
export function getDomainMapping(host: string): DomainLookupResult {
  // Remove port if present (e.g., "localhost:3000" -> "localhost")
  const domain = host.split(':')[0].toLowerCase()
  return domainMap.get(domain) || null
}

/**
 * Get tenant slug by hostname
 *
 * @param host - The hostname from request headers
 * @returns Tenant slug or null if not mapped
 *
 * @example
 * const tenant = getTenantByDomain('terrapet.com.py')
 * // Returns: 'terrapet'
 */
export function getTenantByDomain(host: string): string | null {
  const mapping = getDomainMapping(host)
  return mapping?.tenant || null
}

/**
 * Check if a hostname is a custom domain (not the default platform domain)
 *
 * @param host - The hostname to check
 * @returns True if it's a custom domain that should be resolved to a tenant
 */
export function isCustomDomain(host: string): boolean {
  const domain = host.split(':')[0].toLowerCase()

  // Always skip localhost
  if (domain === 'localhost') return false

  // Check registry for explicit mapping
  const mapping = getDomainMapping(host)

  // If explicitly mapped to a tenant, it's a custom domain
  if (mapping && mapping.tenant !== 'platform') {
    return true
  }

  // If explicitly mapped to platform, it's NOT a custom domain (serves landing page)
  if (mapping && mapping.tenant === 'platform') {
    return false
  }

  // Skip default platform domains and Vercel system domains
  // This ensures preview deployments and branch URLs serve the landing page
  if (domain.includes('vercel.app')) return false
  if (domain.includes('vercel-dns.com')) return false
  if (domain.includes('ai-whisperers.org')) return false

  return true
}

/**
 * Get all active domains for a specific tenant
 *
 * @param tenant - The tenant slug
 * @returns Array of domain entries for this tenant
 */
export function getDomainsByTenant(tenant: string): DomainEntry[] {
  return (domainsConfig.domains as DomainEntry[]).filter(
    (entry) => entry.tenant === tenant && entry.status === 'active'
  )
}

/**
 * Get the primary domain for a tenant
 *
 * @param tenant - The tenant slug
 * @returns Primary domain entry or null if none configured
 */
export function getPrimaryDomain(tenant: string): DomainEntry | null {
  const tenantDomains = getDomainsByTenant(tenant)
  return tenantDomains.find((d) => d.type === 'primary') || tenantDomains[0] || null
}

/**
 * Get the default platform domain
 */
export function getDefaultDomain(): string {
  return domainsConfig.defaultDomain
}

/**
 * Get all registered domains (for debugging/admin)
 */
export function getAllDomains(): DomainEntry[] {
  return domainsConfig.domains as DomainEntry[]
}
