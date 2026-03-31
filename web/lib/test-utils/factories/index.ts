/**
 * Factory Index - Exports all builder-pattern factories
 *
 * ## NEW: Unified Factory API (Phase 1 Refactoring)
 *
 * The factory system has been consolidated into a unified API:
 *
 * ```typescript
 * import { factories, factoryMode, idGenerator } from '@/lib/test-utils';
 *
 * // Configure for unit tests (in-memory, sequential IDs)
 * factoryMode.configureForUnitTests();
 * idGenerator.useSequentialMode();
 *
 * // Configure for integration tests (persist, UUID IDs)
 * factoryMode.configureForIntegrationTests();
 * idGenerator.useUuidMode();
 *
 * // Use factories
 * const pet = factories.pet().asDog().forOwner(ownerId).build();
 * const pet = await factories.pet().asDog().forOwner(ownerId).create();
 * ```
 *
 * ## Legacy API (still supported)
 *
 * ```typescript
 * import { OwnerFactory, PetFactory, AppointmentFactory } from '@/lib/test-utils/factories';
 *
 * // Create an owner with VIP persona
 * const owner = await OwnerFactory.create()
 *   .forTenant('terrapet')
 *   .withPersona('vip')
 *   .build();
 *
 * // Create a pet with vaccines
 * const { pet, vaccines } = await PetFactory.create()
 *   .forTenant('terrapet')
 *   .forOwner(owner.id)
 *   .asDog('Labrador')
 *   .withVaccines()
 *   .build();
 * ```
 */

// ============================================================================
// NEW: Core Infrastructure (Phase 1 Refactoring)
// ============================================================================

export * from './core'

// ============================================================================
// Types
// ============================================================================

export * from './types'

// ============================================================================
// Base utilities (random generators, constants)
// ============================================================================

export {
  generateId,
  generateSequence,
  resetSequence,
  randomBusinessDate,
  randomPastDate,
  randomFutureDate,
  randomPhone,
  randomEmail,
  randomWeight,
  randomBirthDate,
  randomAmount,
  pick,
  pickN,
  PARAGUAYAN_FIRST_NAMES,
  PARAGUAYAN_LAST_NAMES,
  DOG_BREEDS,
  CAT_BREEDS,
  PET_NAMES,
  PET_COLORS,
} from './base'

// Owner factory
export {
  OwnerFactory,
  createDistinctOwners,
  createPredefinedOwners,
  PREDEFINED_OWNERS,
} from './owner-factory'

// Pet factory
export { PetFactory, createPetsForOwner } from './pet-factory'

// Appointment factory
export { AppointmentFactory, createAppointmentHistory } from './appointment-factory'

// Invoice & Payment factory
export { InvoiceFactory, createInvoiceHistory } from './invoice-factory'

// Loyalty factory
export {
  LoyaltyFactory,
  createLoyaltyFromPurchases,
  createLoyaltyForPersona,
} from './loyalty-factory'

// Store order factory
export {
  StoreOrderFactory,
  CartFactory,
  createOrderHistory,
  createAbandonedCarts,
} from './store-order-factory'
