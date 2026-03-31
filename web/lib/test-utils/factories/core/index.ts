/**
 * Core Factory Infrastructure
 *
 * Exports the foundational modules for the unified factory system:
 * - ID generation (sequential + UUID)
 * - Mode management (memory/persist)
 * - Base factory class
 */

// ID Generation
export {
  idGenerator,
  generateId,
  resetIdCounter,
  createIdGenerator,
  type IdMode,
} from './id-generator'

// Mode Management
export {
  factoryMode,
  setFactoryMode,
  getFactoryMode,
  setDefaultTenant,
  getDefaultTenant,
  createModeManager,
  type FactoryMode,
  type FactoryConfig,
} from './mode'

// Base Factory Class
export {
  BaseFactory,
  trackResource,
  getTrackedResources,
  clearTrackedResources,
  quickBuild,
  quickCreate,
  type CreateResult,
  type CreateResultWithRelated,
  type TrackedResource,
  type FactoryDataType,
} from './base-factory'
