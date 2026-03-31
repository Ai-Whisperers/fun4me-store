/**
 * Factory Mode Manager
 *
 * Manages the execution mode for test factories:
 * - memory: In-memory only, no database persistence (unit tests)
 * - persist: Write to database, track for cleanup (integration tests)
 *
 * Also manages default tenant and other global factory settings.
 *
 * @example
 * ```typescript
 * // Unit test setup
 * factoryMode.setMode('memory')
 * const pet = factories.pet().build() // Returns data, no DB write
 *
 * // Integration test setup
 * factoryMode.setMode('persist')
 * const pet = await factories.pet().create() // Writes to DB, tracked
 * ```
 */

export type FactoryMode = 'memory' | 'persist'

export interface FactoryConfig {
  mode: FactoryMode
  defaultTenant: string
  autoTrackResources: boolean
  logDeprecationWarnings: boolean
}

const DEFAULT_CONFIG: FactoryConfig = {
  mode: 'memory',
  defaultTenant: 'terrapet',
  autoTrackResources: true,
  logDeprecationWarnings: true,
}

class ModeManager {
  private config: FactoryConfig = { ...DEFAULT_CONFIG }

  /**
   * Set the factory execution mode
   */
  setMode(mode: FactoryMode): void {
    this.config.mode = mode
  }

  /**
   * Get current mode
   */
  getMode(): FactoryMode {
    return this.config.mode
  }

  /**
   * Check if we're in persist mode
   */
  isPersistMode(): boolean {
    return this.config.mode === 'persist'
  }

  /**
   * Check if we're in memory mode
   */
  isMemoryMode(): boolean {
    return this.config.mode === 'memory'
  }

  /**
   * Set the default tenant for factory-created entities
   */
  setDefaultTenant(tenantId: string): void {
    this.config.defaultTenant = tenantId
  }

  /**
   * Get the default tenant
   */
  getDefaultTenant(): string {
    return this.config.defaultTenant
  }

  /**
   * Enable/disable automatic resource tracking for cleanup
   */
  setAutoTrackResources(enabled: boolean): void {
    this.config.autoTrackResources = enabled
  }

  /**
   * Check if auto-tracking is enabled
   */
  shouldAutoTrack(): boolean {
    return this.config.autoTrackResources && this.isPersistMode()
  }

  /**
   * Enable/disable deprecation warnings
   */
  setLogDeprecationWarnings(enabled: boolean): void {
    this.config.logDeprecationWarnings = enabled
  }

  /**
   * Check if deprecation warnings are enabled
   */
  shouldLogDeprecationWarnings(): boolean {
    return this.config.logDeprecationWarnings
  }

  /**
   * Get the full configuration
   */
  getConfig(): Readonly<FactoryConfig> {
    return { ...this.config }
  }

  /**
   * Reset to default configuration
   */
  reset(): void {
    this.config = { ...DEFAULT_CONFIG }
  }

  /**
   * Configure for unit tests (memory mode, sequential IDs)
   */
  configureForUnitTests(options?: Partial<FactoryConfig>): void {
    this.config = {
      ...DEFAULT_CONFIG,
      mode: 'memory',
      autoTrackResources: false,
      ...options,
    }
  }

  /**
   * Configure for integration tests (persist mode, UUID IDs)
   */
  configureForIntegrationTests(options?: Partial<FactoryConfig>): void {
    this.config = {
      ...DEFAULT_CONFIG,
      mode: 'persist',
      autoTrackResources: true,
      ...options,
    }
  }
}

// Singleton instance
export const factoryMode = new ModeManager()

// Convenience exports
export function setFactoryMode(mode: FactoryMode): void {
  factoryMode.setMode(mode)
}

export function getFactoryMode(): FactoryMode {
  return factoryMode.getMode()
}

export function setDefaultTenant(tenantId: string): void {
  factoryMode.setDefaultTenant(tenantId)
}

export function getDefaultTenant(): string {
  return factoryMode.getDefaultTenant()
}

// For tests that need isolated mode management
export function createModeManager(): ModeManager {
  return new ModeManager()
}
