/**
 * Configuration types and interfaces
 * Type-safe configuration management
 */

export type Environment = 'development' | 'staging' | 'production' | 'test'

export interface DatabaseConfig {
  url: string
  maxConnections: number
  ssl: boolean
  timeout: number
}

export interface AuthConfig {
  jwtSecret: string
  jwtExpiresIn: string
  refreshTokenExpiresIn: string
  bcryptRounds: number
  supabaseUrl: string
  supabaseAnonKey: string
  supabaseServiceRoleKey: string
}

export interface EmailConfig {
  provider: 'smtp' | 'sendgrid' | 'ses'
  smtp?: {
    host: string
    port: number
    secure: boolean
    auth: {
      user: string
      pass: string
    }
  }
  sendgrid?: {
    apiKey: string
  }
  ses?: {
    accessKeyId: string
    secretAccessKey: string
    region: string
  }
  fromEmail: string
  fromName: string
}

export interface StorageConfig {
  provider: 'local' | 's3' | 'cloudinary'
  local?: {
    uploadDir: string
    maxFileSize: number
  }
  s3?: {
    accessKeyId: string
    secretAccessKey: string
    region: string
    bucket: string
  }
  cloudinary?: {
    cloudName: string
    apiKey: string
    apiSecret: string
  }
}

export interface CacheConfig {
  provider: 'memory' | 'redis' | 'upstash'
  ttl: number
  redis?: {
    url: string
    maxRetries: number
  }
  upstash?: {
    url: string
    token: string
  }
}

export interface MonitoringConfig {
  enabled: boolean
  logLevel: 'debug' | 'info' | 'warn' | 'error'
  sentry?: {
    dsn: string
    environment: string
  }
  datadog?: {
    apiKey: string
    appKey: string
  }
}

export interface RateLimitConfig {
  enabled: boolean
  maxRequests: number
  windowMs: number
  skipSuccessfulRequests: boolean
  skipFailedRequests: boolean
}

export interface FeatureFlags {
  appointments: boolean
  payments: boolean
  notifications: boolean
  analytics: boolean
  multiTenant: boolean
  apiRateLimiting: boolean
  emailNotifications: boolean
  smsNotifications: boolean
}

export interface AppConfig {
  env: Environment
  name: string
  version: string
  port: number
  host: string
  baseUrl: string
  corsOrigins: string[]
  database: DatabaseConfig
  auth: AuthConfig
  email: EmailConfig
  storage: StorageConfig
  cache: CacheConfig
  monitoring: MonitoringConfig
  rateLimit: RateLimitConfig
  features: FeatureFlags
}
