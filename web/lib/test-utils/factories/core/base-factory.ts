/**
 * Base Factory Class
 *
 * Abstract base class for all test factories. Provides:
 * - Fluent builder pattern API
 * - Memory and persist modes
 * - Automatic resource tracking for cleanup
 * - Type-safe data building
 *
 * @example
 * ```typescript
 * class PetFactory extends BaseFactory<PetData> {
 *   protected tableName = 'pets'
 *
 *   constructor() {
 *     super({
 *       id: idGenerator.generate(),
 *       tenant_id: factoryMode.getDefaultTenant(),
 *       species: 'dog',
 *       name: pick(PET_NAMES),
 *     })
 *   }
 *
 *   asDog(breed?: string): this {
 *     this.data.species = 'dog'
 *     this.data.breed = breed || pick(DOG_BREEDS)
 *     return this
 *   }
 *
 *   forOwner(ownerId: string): this {
 *     this.data.owner_id = ownerId
 *     return this
 *   }
 * }
 *
 * // Usage
 * const pet = PetFactory.create().asDog().forOwner('owner-1').build()
 * const pet = await PetFactory.create().asDog().forOwner('owner-1').create()
 * ```
 */

import { idGenerator } from './id-generator'
import { factoryMode } from './mode'
import { apiClient } from '../../api-client'

/**
 * Result of a factory create() operation
 */
export interface CreateResult<T> {
  data: T
  id: string
  tenantId: string
}

/**
 * Result of a factory create() with related entities
 */
export interface CreateResultWithRelated<T, R extends Record<string, unknown[]> = Record<string, never>> {
  data: T
  id: string
  tenantId: string
  related: R
}

/**
 * Resource tracker for cleanup
 */
export interface TrackedResource {
  table: string
  id: string
  tenantId?: string
}

// Global resource tracker (will be replaced by CleanupManager in Phase 2)
const trackedResources: TrackedResource[] = []

export function trackResource(table: string, id: string, tenantId?: string): void {
  if (factoryMode.shouldAutoTrack()) {
    trackedResources.push({ table, id, tenantId })
  }
}

export function getTrackedResources(): TrackedResource[] {
  return [...trackedResources]
}

export function clearTrackedResources(): void {
  trackedResources.length = 0
}

/**
 * Abstract base class for all factories
 */
export abstract class BaseFactory<TData extends Record<string, unknown>> {
  protected data: Partial<TData>
  protected abstract tableName: string

  constructor(defaultData: Partial<TData>) {
    this.data = { ...defaultData }
  }

  /**
   * Set tenant ID for this entity
   */
  forTenant(tenantId: string): this {
    ;(this.data as Record<string, unknown>).tenant_id = tenantId
    return this
  }

  /**
   * Set custom ID (useful for deterministic tests)
   */
  withId(id: string): this {
    ;(this.data as Record<string, unknown>).id = id
    return this
  }

  /**
   * Apply multiple overrides at once
   */
  with(overrides: Partial<TData>): this {
    Object.assign(this.data, overrides)
    return this
  }

  /**
   * Get the current data (for inspection/debugging)
   */
  getData(): Readonly<Partial<TData>> {
    return { ...this.data }
  }

  /**
   * Build in-memory data (no database persistence)
   * Always returns data regardless of mode setting
   */
  build(): TData {
    return this.finalize()
  }

  /**
   * Build and persist to database (if in persist mode)
   * Returns created data with ID
   */
  async create(): Promise<CreateResult<TData>> {
    const data = this.finalize()
    const id = (data as Record<string, unknown>).id as string
    const tenantId = (data as Record<string, unknown>).tenant_id as string

    if (factoryMode.isPersistMode()) {
      const result = await apiClient.dbInsert(this.tableName, data as Record<string, unknown>)
      if (result.error) {
        throw new Error(`Failed to create ${this.tableName}: ${result.error}`)
      }
      trackResource(this.tableName, id, tenantId)
    }

    return { data, id, tenantId }
  }

  /**
   * Finalize the data - ensure all required fields are set
   * Can be overridden by subclasses for custom finalization
   */
  protected finalize(): TData {
    const data = { ...this.data }

    // Ensure ID exists
    if (!data.id) {
      ;(data as Record<string, unknown>).id = idGenerator.generate()
    }

    // Ensure tenant_id exists
    if (!data.tenant_id) {
      ;(data as Record<string, unknown>).tenant_id = factoryMode.getDefaultTenant()
    }

    // Ensure timestamps exist
    const now = new Date().toISOString()
    if (!data.created_at) {
      ;(data as Record<string, unknown>).created_at = now
    }
    if (!data.updated_at) {
      ;(data as Record<string, unknown>).updated_at = now
    }

    return data as TData
  }
}

/**
 * Helper type for extracting factory data type
 */
export type FactoryDataType<F> = F extends BaseFactory<infer T> ? T : never

/**
 * Quick factory creation helpers
 */
export function quickBuild<T extends Record<string, unknown>>(
  FactoryClass: new () => BaseFactory<T>,
  overrides?: Partial<T>
): T {
  const factory = new FactoryClass()
  if (overrides) {
    factory.with(overrides)
  }
  return factory.build()
}

export async function quickCreate<T extends Record<string, unknown>>(
  FactoryClass: new () => BaseFactory<T>,
  overrides?: Partial<T>
): Promise<CreateResult<T>> {
  const factory = new FactoryClass()
  if (overrides) {
    factory.with(overrides)
  }
  return factory.create()
}
