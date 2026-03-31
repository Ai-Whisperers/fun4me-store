/**
 * Service Mappers - Type-safe Supabase to Domain Type Conversion
 *
 * These mappers eliminate unsafe `as unknown as` casts by providing
 * explicit, validated conversion functions between Supabase query
 * results and domain types.
 *
 * @example
 * ```typescript
 * import { mapAppointmentWithDetails } from '@/lib/services/mappers'
 *
 * const { data } = await supabase.from('appointments').select('...')
 * const appointment = mapAppointmentWithDetails(data)
 * ```
 */

export {
  mapAppointmentWithDetails,
  mapAppointmentsWithDetails,
  isRawAppointmentWithDetails,
  type RawAppointmentWithDetails,
} from './appointment-mapper'

export {
  mapInvoiceWithDetails,
  mapInvoicesWithDetails,
  isRawInvoiceWithDetails,
  type RawInvoiceWithDetails,
} from './invoice-mapper'

export {
  mapPetWithOwner,
  mapPetsWithOwner,
  isRawPetWithOwner,
  type RawPetWithOwner,
} from './pet-mapper'
