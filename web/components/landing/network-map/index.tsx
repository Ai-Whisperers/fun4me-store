/**
 * Network Map Module
 *
 * Clinic network map section with search, filtering, and interactive map.
 *
 * @example
 * ```tsx
 * import { NetworkMap } from './network-map'
 *
 * <NetworkMap />
 * ```
 */

export { NetworkMap } from './NetworkMap'

export type { ClinicLocation } from './types'

// Sub-components (for advanced usage)
export { ClinicListItem } from './ClinicListItem'
export { ClinicDetailPanel } from './ClinicDetailPanel'
export { SearchFilters } from './SearchFilters'
export { MapDisplay } from './MapDisplay'

// Data exports
export { clinicLocations, specialtyIcons, allCities, allSpecialties } from './data'
