/**
 * Configuration manager
 * Provides access to validated configuration with caching and feature flags
 */

import { loadConfig, getEnvConfig } from './loader'
import type { AppConfig, FeatureFlags } from './types'

class ConfigManager {
  private config: AppConfig | null = null
  private featureOverrides = new Map<keyof FeatureFlags, boolean>()

  /**
   * Get the full configuration
   */
  get(): AppConfig {
    if (!this.config) {
      this.config = loadConfig()
    }
    return this.config
  }

  /**
   * Get a specific configuration section
   */
  getSection<K extends keyof AppConfig>(section: K): AppConfig[K] {
    return this.get()[section]
  }

  /**
   * Check if a feature is enabled
   */
  isFeatureEnabled(feature: keyof FeatureFlags): boolean {
    // Check overrides first
    if (this.featureOverrides.has(feature)) {
      const override = this.featureOverrides.get(feature)
      if (override !== undefined) {
        return override
      }
    }

    // Check configuration
    return this.get().features[feature]
  }

  /**
   * Override a feature flag (useful for testing or admin controls)
   */
  setFeatureOverride(feature: keyof FeatureFlags, enabled: boolean): void {
    this.featureOverrides.set(feature, enabled)
  }

  /**
   * Clear a feature override
   */
  clearFeatureOverride(feature: keyof FeatureFlags): void {
    this.featureOverrides.delete(feature)
  }

  /**
   * Clear all feature overrides
   */
  clearAllOverrides(): void {
    this.featureOverrides.clear()
  }

  /**
   * Get environment info
   */
  get env() {
    return getEnvConfig()
  }

  /**
   * Check if running in development
   */
  get isDevelopment(): boolean {
    return this.env.isDevelopment
  }

  /**
   * Check if running in production
   */
  get isProduction(): boolean {
    return this.env.isProduction
  }

  /**
   * Get application info
   */
  get app() {
    const config = this.get()
    return {
      name: config.name,
      version: config.version,
      env: config.env,
      baseUrl: config.baseUrl,
    }
  }

  /**
   * Reload configuration (useful for testing or dynamic config)
   */
  reload(): void {
    this.config = null
  }

  /**
   * Get database configuration
   */
  get database() {
    return this.getSection('database')
  }

  /**
   * Get auth configuration
   */
  get auth() {
    return this.getSection('auth')
  }

  /**
   * Get email configuration
   */
  get email() {
    return this.getSection('email')
  }

  /**
   * Get storage configuration
   */
  get storage() {
    return this.getSection('storage')
  }

  /**
   * Get cache configuration
   */
  get cache() {
    return this.getSection('cache')
  }

  /**
   * Get monitoring configuration
   */
  get monitoring() {
    return this.getSection('monitoring')
  }

  /**
   * Get rate limit configuration
   */
  get rateLimit() {
    return this.getSection('rateLimit')
  }

  /**
   * Get feature flags
   */
  get features() {
    return this.getSection('features')
  }
}

// Global configuration manager instance
export const config = new ConfigManager()

// Convenience functions
export const isFeatureEnabled = config.isFeatureEnabled.bind(config)
export const getConfig = config.get.bind(config)
export const getConfigSection = config.getSection.bind(config)
