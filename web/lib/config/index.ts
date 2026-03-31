/**
 * Configuration management system
 * Type-safe, validated configuration with feature flags and environment management
 */

// Types
export type {
  AppConfig,
  Environment,
  DatabaseConfig,
  AuthConfig,
  EmailConfig,
  StorageConfig,
  CacheConfig,
  MonitoringConfig,
  RateLimitConfig,
  FeatureFlags,
} from './types'

// Configuration manager
export { config, isFeatureEnabled, getConfig, getConfigSection } from './manager'

// Configuration loader (for testing or manual loading)
export { loadConfig, validateConfig, getEnvConfig } from './loader'

// Metadata configuration (URLs, site info)
export { SITE_CONFIG, getSiteUrl, getCanonicalUrl, getMetadataBaseUrl } from './metadata'
