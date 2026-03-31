/**
 * Configuration loader
 * Loads and validates configuration from environment variables
 */

import { z } from 'zod'
import type { AppConfig, Environment } from './types'

// Environment schema
const envSchema = z.enum(['development', 'staging', 'production', 'test'])

// Database configuration schema
const databaseSchema = z.object({
  url: z.string().url(),
  maxConnections: z.coerce.number().min(1).max(100).default(20),
  ssl: z.coerce.boolean().default(true),
  timeout: z.coerce.number().min(1000).max(30000).default(10000),
})

// Auth configuration schema
const authSchema = z.object({
  jwtSecret: z.string().min(32),
  jwtExpiresIn: z.string().default('1h'),
  refreshTokenExpiresIn: z.string().default('7d'),
  bcryptRounds: z.coerce.number().min(8).max(16).default(12),
  supabaseUrl: z.string().url(),
  supabaseAnonKey: z.string().min(1),
  supabaseServiceRoleKey: z.string().min(1),
})

// Email configuration schema
const emailSchema = z.object({
  provider: z.enum(['smtp', 'sendgrid', 'ses']),
  smtp: z
    .object({
      host: z.string(),
      port: z.coerce.number(),
      secure: z.coerce.boolean(),
      auth: z.object({
        user: z.string(),
        pass: z.string(),
      }),
    })
    .optional(),
  sendgrid: z
    .object({
      apiKey: z.string(),
    })
    .optional(),
  ses: z
    .object({
      accessKeyId: z.string(),
      secretAccessKey: z.string(),
      region: z.string(),
    })
    .optional(),
  fromEmail: z.string().email(),
  fromName: z.string().min(1),
})

// Storage configuration schema
const storageSchema = z.object({
  provider: z.enum(['local', 's3', 'cloudinary']),
  local: z
    .object({
      uploadDir: z.string(),
      maxFileSize: z.coerce.number(),
    })
    .optional(),
  s3: z
    .object({
      accessKeyId: z.string(),
      secretAccessKey: z.string(),
      region: z.string(),
      bucket: z.string(),
    })
    .optional(),
  cloudinary: z
    .object({
      cloudName: z.string(),
      apiKey: z.string(),
      apiSecret: z.string(),
    })
    .optional(),
})

// Cache configuration schema
const cacheSchema = z.object({
  provider: z.enum(['memory', 'redis', 'upstash']),
  ttl: z.coerce.number().min(0).default(300),
  redis: z
    .object({
      url: z.string().url(),
      maxRetries: z.coerce.number().min(0).default(3),
    })
    .optional(),
  upstash: z
    .object({
      url: z.string().url(),
      token: z.string(),
    })
    .optional(),
})

// Monitoring configuration schema
const monitoringSchema = z.object({
  enabled: z.coerce.boolean().default(true),
  logLevel: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  sentry: z
    .object({
      dsn: z.string().url(),
      environment: z.string(),
    })
    .optional(),
  datadog: z
    .object({
      apiKey: z.string(),
      appKey: z.string(),
    })
    .optional(),
})

// Rate limit configuration schema
const rateLimitSchema = z.object({
  enabled: z.coerce.boolean().default(true),
  maxRequests: z.coerce.number().min(1).default(100),
  windowMs: z.coerce.number().min(1000).default(60000), // 1 minute
  skipSuccessfulRequests: z.coerce.boolean().default(false),
  skipFailedRequests: z.coerce.boolean().default(false),
})

// Feature flags schema
const featureFlagsSchema = z.object({
  appointments: z.coerce.boolean().default(true),
  payments: z.coerce.boolean().default(true),
  notifications: z.coerce.boolean().default(true),
  analytics: z.coerce.boolean().default(true),
  multiTenant: z.coerce.boolean().default(true),
  apiRateLimiting: z.coerce.boolean().default(true),
  emailNotifications: z.coerce.boolean().default(true),
  smsNotifications: z.coerce.boolean().default(false),
})

// Main configuration schema
const configSchema = z.object({
  env: envSchema,
  name: z.string().default('Vetic'),
  version: z.string().default('1.0.0'),
  port: z.coerce.number().min(1).max(65535).default(3000),
  host: z.string().default('localhost'),
  baseUrl: z.string().url(),
  corsOrigins: z.string().transform((s) => s.split(',').map((o) => o.trim())),
  database: databaseSchema,
  auth: authSchema,
  email: emailSchema,
  storage: storageSchema,
  cache: cacheSchema,
  monitoring: monitoringSchema,
  rateLimit: rateLimitSchema,
  features: featureFlagsSchema,
})

/**
 * Load configuration from environment variables
 * 
 * Note: Non-null assertions are used for required environment variables.
 * The app will fail at startup if these are not set, which is intentional.
 */
export function loadConfig(): AppConfig {
  /* eslint-disable @typescript-eslint/no-non-null-assertion */
  try {
    const config = configSchema.parse({
      env: (process.env.NODE_ENV as Environment) || 'development',
      name: process.env.APP_NAME,
      version: process.env.APP_VERSION,
      port: process.env.PORT,
      host: process.env.HOST,
      baseUrl: process.env.BASE_URL || 'http://localhost:3000',
      corsOrigins: process.env.CORS_ORIGINS || 'http://localhost:3000',

      database: {
        url: process.env.DATABASE_URL!,
        maxConnections: process.env.DB_MAX_CONNECTIONS,
        ssl: process.env.DB_SSL,
        timeout: process.env.DB_TIMEOUT,
      },

      auth: {
        jwtSecret: process.env.JWT_SECRET!,
        jwtExpiresIn: process.env.JWT_EXPIRES_IN,
        refreshTokenExpiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN,
        bcryptRounds: process.env.BCRYPT_ROUNDS,
        supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL!,
        supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
      },

      email: {
        provider: process.env.EMAIL_PROVIDER! as 'smtp' | 'sendgrid' | 'ses',
        smtp:
          process.env.EMAIL_PROVIDER === 'smtp'
            ? {
                host: process.env.SMTP_HOST!,
                port: parseInt(process.env.SMTP_PORT!),
                secure: process.env.SMTP_SECURE === 'true',
                auth: {
                  user: process.env.SMTP_USER!,
                  pass: process.env.SMTP_PASS!,
                },
              }
            : undefined,
        sendgrid:
          process.env.EMAIL_PROVIDER === 'sendgrid'
            ? {
                apiKey: process.env.SENDGRID_API_KEY!,
              }
            : undefined,
        ses:
          process.env.EMAIL_PROVIDER === 'ses'
            ? {
                accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
                secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
                region: process.env.AWS_REGION!,
              }
            : undefined,
        fromEmail: process.env.EMAIL_FROM!,
        fromName: process.env.EMAIL_FROM_NAME!,
      },

      storage: {
        provider: process.env.STORAGE_PROVIDER! as 'local' | 's3' | 'cloudinary',
        local:
          process.env.STORAGE_PROVIDER === 'local'
            ? {
                uploadDir: process.env.UPLOAD_DIR || './uploads',
                maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '5242880'), // 5MB
              }
            : undefined,
        s3:
          process.env.STORAGE_PROVIDER === 's3'
            ? {
                accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
                secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
                region: process.env.AWS_REGION!,
                bucket: process.env.S3_BUCKET!,
              }
            : undefined,
        cloudinary:
          process.env.STORAGE_PROVIDER === 'cloudinary'
            ? {
                cloudName: process.env.CLOUDINARY_CLOUD_NAME!,
                apiKey: process.env.CLOUDINARY_API_KEY!,
                apiSecret: process.env.CLOUDINARY_API_SECRET!,
              }
            : undefined,
      },

      cache: {
        provider: process.env.CACHE_PROVIDER! as 'memory' | 'redis' | 'upstash',
        ttl: process.env.CACHE_TTL,
        redis:
          process.env.CACHE_PROVIDER === 'redis'
            ? {
                url: process.env.REDIS_URL!,
                maxRetries: process.env.REDIS_MAX_RETRIES,
              }
            : undefined,
        upstash:
          process.env.CACHE_PROVIDER === 'upstash'
            ? {
                url: process.env.UPSTASH_REDIS_REST_URL!,
                token: process.env.UPSTASH_REDIS_REST_TOKEN!,
              }
            : undefined,
      },

      monitoring: {
        enabled: process.env.MONITORING_ENABLED,
        logLevel: process.env.LOG_LEVEL as 'debug' | 'info' | 'warn' | 'error',
        sentry: process.env.SENTRY_DSN
          ? {
              dsn: process.env.SENTRY_DSN,
              environment: process.env.NODE_ENV!,
            }
          : undefined,
        datadog: process.env.DD_API_KEY
          ? {
              apiKey: process.env.DD_API_KEY,
              appKey: process.env.DD_APP_KEY!,
            }
          : undefined,
      },

      rateLimit: {
        enabled: process.env.RATE_LIMIT_ENABLED,
        maxRequests: process.env.RATE_LIMIT_MAX_REQUESTS,
        windowMs: process.env.RATE_LIMIT_WINDOW_MS,
        skipSuccessfulRequests: process.env.RATE_LIMIT_SKIP_SUCCESSFUL,
        skipFailedRequests: process.env.RATE_LIMIT_SKIP_FAILED,
      },

      features: {
        appointments: process.env.FEATURE_APPOINTMENTS,
        payments: process.env.FEATURE_PAYMENTS,
        notifications: process.env.FEATURE_NOTIFICATIONS,
        analytics: process.env.FEATURE_ANALYTICS,
        multiTenant: process.env.FEATURE_MULTI_TENANT,
        apiRateLimiting: process.env.FEATURE_API_RATE_LIMITING,
        emailNotifications: process.env.FEATURE_EMAIL_NOTIFICATIONS,
        smsNotifications: process.env.FEATURE_SMS_NOTIFICATIONS,
      },
    })

    return config
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      const issues = error.issues
        .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
        .join('\n')

      throw new Error(`Configuration validation failed:\n${issues}`)
    }

    throw new Error(`Configuration loading failed: ${error}`)
  }
  /* eslint-enable @typescript-eslint/no-non-null-assertion */
}

/**
 * Validate configuration
 */
export function validateConfig(config: Partial<AppConfig>): boolean {
  try {
    configSchema.parse(config)
    return true
  } catch (_error: unknown) {
    return false
  }
}

/**
 * Get environment-specific configuration
 */
export function getEnvConfig(): {
  isDevelopment: boolean
  isStaging: boolean
  isProduction: boolean
  isTest: boolean
} {
  const env = (process.env.NODE_ENV as Environment) || 'development'

  return {
    isDevelopment: env === 'development',
    isStaging: env === 'staging',
    isProduction: env === 'production',
    isTest: env === 'test',
  }
}
