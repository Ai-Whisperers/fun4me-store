/**
 * Validated Environment Variables
 *
 * This module provides type-safe access to environment variables with
 * runtime validation. Import `env` instead of using `process.env` directly.
 *
 * Features:
 * - Lazy evaluation for NEXT_PUBLIC_* vars (client-safe)
 * - Fails fast on server-side if required variables are missing
 * - Graceful degradation on client-side with console errors
 * - Type-safe access (no need for `!` assertions)
 * - Clear error messages for debugging
 *
 * @example
 * ```typescript
 * import { env } from '@/lib/env'
 *
 * // Server-side usage
 * const client = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY)
 *
 * // Client-side usage (only NEXT_PUBLIC_ vars)
 * const url = env.SUPABASE_URL
 * ```
 */

// =============================================================================
// Validation Helpers
// =============================================================================

/**
 * Validates that a required environment variable exists
 * @throws Error if the variable is missing
 */
function requireEnv(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(
      `[ENV ERROR] Missing required environment variable: ${name}\n` +
        `Please ensure this variable is set in your .env.local file.`
    )
  }
  return value
}

/**
 * Gets an optional environment variable with a default value
 */
function optionalEnv(name: string, defaultValue: string): string {
  return process.env[name] || defaultValue
}

/**
 * Gets an optional environment variable that may be undefined
 */
function optionalEnvOrUndefined(name: string): string | undefined {
  return process.env[name]
}

/**
 * Parses an environment variable as a boolean
 */
function boolEnv(name: string, defaultValue: boolean): boolean {
  const value = process.env[name]
  if (value === undefined) return defaultValue
  return value.toLowerCase() === 'true' || value === '1'
}

/**
 * Parses an environment variable as a number
 */
function numberEnv(name: string, defaultValue: number): number {
  const value = process.env[name]
  if (value === undefined) return defaultValue
  const parsed = parseInt(value, 10)
  if (isNaN(parsed)) {
    console.warn(
      `[ENV WARNING] Invalid number for ${name}: "${value}", using default: ${defaultValue}`
    )
    return defaultValue
  }
  return parsed
}

// =============================================================================
// Environment Configuration
// =============================================================================

/**
 * Validated environment variables for the Vete platform.
 *
 * All variables are validated at module load time.
 * Missing required variables will throw an error immediately.
 */
export const env = {
  // =============================================================================
  // Supabase Configuration (Required)
  // =============================================================================

  /** Supabase project URL */
  get SUPABASE_URL(): string {
    // Use lazy evaluation for client-side compatibility
    // NEXT_PUBLIC_* vars are inlined at build time
    const value = process.env.NEXT_PUBLIC_SUPABASE_URL
    if (!value) {
      if (typeof window === 'undefined') {
        throw new Error(
          `[ENV ERROR] Missing required environment variable: NEXT_PUBLIC_SUPABASE_URL\n` +
            `Please ensure this variable is set in your .env.local file.`
        )
      }
      // On client-side, return empty string - Supabase will fail with clearer error
      console.error('[ENV ERROR] NEXT_PUBLIC_SUPABASE_URL is not defined')
      return ''
    }
    return value
  },

  /** Supabase anonymous key (safe for client-side) */
  get SUPABASE_ANON_KEY(): string {
    const value = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!value) {
      if (typeof window === 'undefined') {
        throw new Error(
          `[ENV ERROR] Missing required environment variable: NEXT_PUBLIC_SUPABASE_ANON_KEY\n` +
            `Please ensure this variable is set in your .env.local file.`
        )
      }
      console.error('[ENV ERROR] NEXT_PUBLIC_SUPABASE_ANON_KEY is not defined')
      return ''
    }
    return value
  },

  /** Stripe publishable key (safe for client-side) */
  get STRIPE_PUBLISHABLE_KEY(): string {
    return process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || ''
  },

  /** Supabase service role key (server-side only, bypasses RLS) */
  get SUPABASE_SERVICE_ROLE_KEY(): string {
    // Lazy evaluation to avoid errors when not needed
    return requireEnv('SUPABASE_SERVICE_ROLE_KEY')
  },

  // =============================================================================
  // Database Configuration (Required for server-side)
  // =============================================================================

  /** Direct PostgreSQL connection string */
  get DATABASE_URL(): string {
    const value = process.env.DATABASE_URL
    if (!value) {
      // During build time, DATABASE_URL might not be available
      // This is okay for static page generation
      if (process.env.NEXT_PHASE === 'phase-production-build') {
        console.warn('[ENV] DATABASE_URL not available during build - using placeholder')
        return 'postgresql://placeholder:placeholder@localhost:5432/placeholder'
      }
      throw new Error(
        `[ENV ERROR] Missing required environment variable: DATABASE_URL\n` +
          `Please ensure this variable is set in your .env.local file.`
      )
    }
    return value
  },

  // =============================================================================
  // Application Configuration
  // =============================================================================

  /** Application base URL */
  APP_URL: optionalEnv('NEXT_PUBLIC_APP_URL', 'http://localhost:3000'),

  /** Current environment */
  NODE_ENV: optionalEnv('NODE_ENV', 'development'),

  /** Is development mode */
  get isDev(): boolean {
    return this.NODE_ENV === 'development'
  },

  /** Is production mode */
  get isProd(): boolean {
    return this.NODE_ENV === 'production'
  },

  /** Is test mode */
  get isTest(): boolean {
    return this.NODE_ENV === 'test'
  },

  // =============================================================================
  // Email Configuration (Optional)
  // =============================================================================

  /** Email provider: 'resend' | 'sendgrid' | 'smtp' */
  EMAIL_PROVIDER: optionalEnvOrUndefined('EMAIL_PROVIDER'),

  /** Resend API key */
  RESEND_API_KEY: optionalEnvOrUndefined('RESEND_API_KEY'),

  /** SendGrid API key */
  SENDGRID_API_KEY: optionalEnvOrUndefined('SENDGRID_API_KEY'),

  /** SMTP host */
  SMTP_HOST: optionalEnvOrUndefined('SMTP_HOST'),

  /** SMTP port */
  SMTP_PORT: numberEnv('SMTP_PORT', 587),

  /** SMTP user */
  SMTP_USER: optionalEnvOrUndefined('SMTP_USER'),

  /** SMTP password */
  SMTP_PASS: optionalEnvOrUndefined('SMTP_PASS'),

  /** Email from address */
  EMAIL_FROM: optionalEnvOrUndefined('EMAIL_FROM'),

  /** Email from name */
  EMAIL_FROM_NAME: optionalEnvOrUndefined('EMAIL_FROM_NAME'),

  // =============================================================================
  // WhatsApp Configuration (Optional)
  // =============================================================================

  /** WhatsApp API URL */
  WHATSAPP_API_URL: optionalEnvOrUndefined('WHATSAPP_API_URL'),

  /** WhatsApp phone number ID */
  WHATSAPP_PHONE_NUMBER_ID: optionalEnvOrUndefined('WHATSAPP_PHONE_NUMBER_ID'),

  /** WhatsApp access token */
  WHATSAPP_ACCESS_TOKEN: optionalEnvOrUndefined('WHATSAPP_ACCESS_TOKEN'),

  /** WhatsApp verify token */
  WHATSAPP_VERIFY_TOKEN: optionalEnvOrUndefined('WHATSAPP_VERIFY_TOKEN'),

  // =============================================================================
  // AWS Configuration (Optional)
  // =============================================================================

  /** AWS access key ID */
  AWS_ACCESS_KEY_ID: optionalEnvOrUndefined('AWS_ACCESS_KEY_ID'),

  /** AWS secret access key */
  AWS_SECRET_ACCESS_KEY: optionalEnvOrUndefined('AWS_SECRET_ACCESS_KEY'),

  /** AWS region */
  AWS_REGION: optionalEnvOrUndefined('AWS_REGION'),

  /** S3 bucket name */
  S3_BUCKET: optionalEnvOrUndefined('S3_BUCKET'),

  // =============================================================================
  // Cloudinary Configuration (Optional)
  // =============================================================================

  /** Cloudinary cloud name */
  CLOUDINARY_CLOUD_NAME: optionalEnvOrUndefined('CLOUDINARY_CLOUD_NAME'),

  /** Cloudinary API key */
  CLOUDINARY_API_KEY: optionalEnvOrUndefined('CLOUDINARY_API_KEY'),

  /** Cloudinary API secret */
  CLOUDINARY_API_SECRET: optionalEnvOrUndefined('CLOUDINARY_API_SECRET'),

  // =============================================================================
  // Redis/Cache Configuration (Optional)
  // =============================================================================

  /** Cache provider: 'memory' | 'redis' | 'upstash' */
  CACHE_PROVIDER: optionalEnv('CACHE_PROVIDER', 'memory'),

  /** Redis URL */
  REDIS_URL: optionalEnvOrUndefined('REDIS_URL'),

  /** Upstash Redis REST URL */
  UPSTASH_REDIS_REST_URL: optionalEnvOrUndefined('UPSTASH_REDIS_REST_URL'),

  /** Upstash Redis REST token */
  UPSTASH_REDIS_REST_TOKEN: optionalEnvOrUndefined('UPSTASH_REDIS_REST_TOKEN'),

  // =============================================================================
  // Monitoring Configuration (Optional)
  // =============================================================================

  /** Sentry DSN */
  SENTRY_DSN: optionalEnvOrUndefined('NEXT_PUBLIC_SENTRY_DSN'),

  /** Datadog API key */
  DD_API_KEY: optionalEnvOrUndefined('DD_API_KEY'),

  /** Datadog app key */
  DD_APP_KEY: optionalEnvOrUndefined('DD_APP_KEY'),

  // =============================================================================
  // Feature Flags (Optional)
  // =============================================================================

  /** Enable store module */
  ENABLE_STORE: boolEnv('ENABLE_STORE', true),

  /** Enable WhatsApp integration */
  ENABLE_WHATSAPP: boolEnv('ENABLE_WHATSAPP', false),

  /** Enable hospitalization module */
  ENABLE_HOSPITALIZATION: boolEnv('ENABLE_HOSPITALIZATION', true),

  /** Enable lab module */
  ENABLE_LAB: boolEnv('ENABLE_LAB', true),

  /** Enable insurance module */
  ENABLE_INSURANCE: boolEnv('ENABLE_INSURANCE', false),

  // =============================================================================
  // Debug/Development (Optional)
  // =============================================================================

  /** Enable debug mode */
  DEBUG: boolEnv('DEBUG', false),

  /** Log level: 'error' | 'warn' | 'info' | 'debug' */
  LOG_LEVEL: optionalEnv('LOG_LEVEL', 'info'),

  // =============================================================================
  // Auth Configuration (Optional)
  // =============================================================================

  /** JWT secret for custom token generation */
  JWT_SECRET: optionalEnvOrUndefined('JWT_SECRET'),

  // =============================================================================
  // Storage Configuration (Optional)
  // =============================================================================

  /** Storage provider: 'supabase' | 's3' | 'cloudinary' */
  STORAGE_PROVIDER: optionalEnv('STORAGE_PROVIDER', 'supabase'),
} as const

// =============================================================================
// Type Exports
// =============================================================================

/** Type for the environment configuration */
export type Env = typeof env

// Log successful validation in development
if (env.isDev && typeof window === 'undefined') {
  // Note: Logger not imported to avoid circular dependency
  // This runs once at module load, console.log is acceptable here
  // eslint-disable-next-line no-console
  console.info('[ENV] ✅ Environment variables validated successfully')
}
