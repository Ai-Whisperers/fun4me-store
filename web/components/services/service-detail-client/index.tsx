/**
 * Service Detail Client Module
 *
 * Client-side component for service detail pages with pricing and cart.
 *
 * @example
 * ```tsx
 * import { ServiceDetailClient } from './service-detail-client'
 *
 * <ServiceDetailClient
 *   service={service}
 *   allServices={allServices}
 *   config={clinicConfig}
 *   clinic="terrapet"
 *   isLoggedIn={true}
 * />
 * ```
 */

export { ServiceDetailClient } from './ServiceDetailClient'

export type {
  ServiceDetailClientProps,
  ServiceDetailConfig,
  ServiceNavItem,
  PriceInfo,
  CalculatedPrices,
  Service,
  ServiceVariant,
  PetForService,
} from './types'

// Sub-components (for advanced usage)
export { ServiceHero } from './ServiceHero'
export { ServiceDescription } from './ServiceDescription'
export { ServicePricingTable } from './ServicePricingTable'
export { ServiceSidebar } from './ServiceSidebar'
