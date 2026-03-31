/**
 * Time Constants - Single Source of Truth
 *
 * All time-related constants (durations, TTLs, intervals).
 * Import from here instead of using magic numbers.
 *
 * @example
 * ```typescript
 * import { CACHE_TTL, RATE_LIMITS, DURATIONS } from '@/lib/constants/time'
 *
 * const cache = new Map()
 * setTimeout(() => cache.clear(), CACHE_TTL.SHORT)
 * ```
 */

// =============================================================================
// BASE TIME UNITS (Milliseconds)
// =============================================================================

export const MS = {
  SECOND: 1000,
  MINUTE: 60 * 1000,
  HOUR: 60 * 60 * 1000,
  DAY: 24 * 60 * 60 * 1000,
  WEEK: 7 * 24 * 60 * 60 * 1000,
} as const

// =============================================================================
// BASE TIME UNITS (Seconds)
// =============================================================================

export const SECONDS = {
  MINUTE: 60,
  HOUR: 60 * 60,
  DAY: 24 * 60 * 60,
  WEEK: 7 * 24 * 60 * 60,
} as const

// =============================================================================
// CACHE TTL (Time to Live)
// =============================================================================

export const CACHE_TTL = {
  /** 1 minute - for frequently changing data */
  VERY_SHORT: 1 * MS.MINUTE,

  /** 5 minutes - default cache duration */
  SHORT: 5 * MS.MINUTE,

  /** 15 minutes - for moderately stable data */
  MEDIUM: 15 * MS.MINUTE,

  /** 1 hour - for stable data */
  LONG: 1 * MS.HOUR,

  /** 24 hours - for rarely changing data */
  VERY_LONG: 24 * MS.HOUR,

  /** Feature flags cache (1 minute) */
  FEATURE_FLAGS: 1 * MS.MINUTE,

  /** Clinic config cache (5 minutes) */
  CLINIC_CONFIG: 5 * MS.MINUTE,

  /** Static assets (24 hours) */
  STATIC: 24 * MS.HOUR,
} as const

// =============================================================================
// RATE LIMITING
// =============================================================================

export const RATE_LIMITS = {
  /** Authentication endpoints */
  AUTH: {
    windowMs: 1 * MS.MINUTE,
    maxRequests: 5,
  },

  /** Search/read endpoints */
  SEARCH: {
    windowMs: 1 * MS.MINUTE,
    maxRequests: 30,
  },

  /** Write/mutation endpoints */
  WRITE: {
    windowMs: 1 * MS.MINUTE,
    maxRequests: 20,
  },

  /** Financial/sensitive endpoints */
  FINANCIAL: {
    windowMs: 1 * MS.MINUTE,
    maxRequests: 10,
  },

  /** Refund operations */
  REFUND: {
    windowMs: 1 * MS.HOUR,
    maxRequests: 5,
  },

  /** Checkout/orders */
  CHECKOUT: {
    windowMs: 1 * MS.MINUTE,
    maxRequests: 5,
  },

  /** Signup */
  SIGNUP: {
    windowMs: 1 * MS.HOUR,
    maxRequests: 5,
  },

  /** File uploads */
  UPLOAD: {
    windowMs: 1 * MS.MINUTE,
    maxRequests: 10,
  },

  /** Rate limit cache cleanup interval */
  CLEANUP_INTERVAL: 5 * MS.MINUTE,
} as const

// =============================================================================
// SESSION & COOKIE DURATIONS
// =============================================================================

export const SESSION = {
  /** Session timeout (30 days) */
  TIMEOUT: 30 * MS.DAY,

  /** Session refresh threshold (7 days) */
  REFRESH_THRESHOLD: 7 * MS.DAY,

  /** CSRF token max age (24 hours) */
  CSRF_MAX_AGE: 24 * MS.HOUR,

  /** CORS preflight cache (24 hours in seconds) */
  CORS_MAX_AGE: 24 * SECONDS.HOUR,

  /** Cookie max age for remember me (30 days in seconds) */
  COOKIE_MAX_AGE: 30 * SECONDS.DAY,
} as const

// =============================================================================
// DATABASE & CONNECTION
// =============================================================================

export const DATABASE = {
  /** Connection pool max lifetime (30 minutes in seconds) */
  POOL_MAX_LIFETIME: 30 * SECONDS.MINUTE,

  /** Query timeout (30 seconds) */
  QUERY_TIMEOUT: 30 * MS.SECOND,

  /** Connection timeout (10 seconds) */
  CONNECTION_TIMEOUT: 10 * MS.SECOND,
} as const

// =============================================================================
// CLIENT-SIDE INTERVALS
// =============================================================================

export const INTERVALS = {
  /** Polling interval for real-time data (30 seconds) */
  POLLING: 30 * MS.SECOND,

  /** Refetch interval for dashboard data (5 minutes) */
  DASHBOARD_REFETCH: 5 * MS.MINUTE,

  /** Refetch interval for notifications (1 minute) */
  NOTIFICATIONS_REFETCH: 1 * MS.MINUTE,

  /** Debounce for search input (300ms) */
  SEARCH_DEBOUNCE: 300,

  /** Debounce for form auto-save (1 second) */
  AUTOSAVE_DEBOUNCE: 1 * MS.SECOND,

  /** Toast notification duration (5 seconds) */
  TOAST_DURATION: 5 * MS.SECOND,
} as const

// =============================================================================
// BUSINESS LOGIC DURATIONS
// =============================================================================

export const DURATIONS = {
  /** Minimum time in future for appointments (15 minutes) */
  MIN_APPOINTMENT_FUTURE: 15 * MS.MINUTE,

  /** Default appointment duration (30 minutes) */
  DEFAULT_APPOINTMENT: 30 * MS.MINUTE,

  /** Cart reservation duration (24 hours) */
  CART_RESERVATION: 24 * MS.HOUR,

  /** Trial period (14 days) */
  TRIAL_PERIOD: 14 * MS.DAY,

  /** Password reset token validity (1 hour) */
  PASSWORD_RESET_TOKEN: 1 * MS.HOUR,

  /** Email verification token validity (24 hours) */
  EMAIL_VERIFICATION_TOKEN: 24 * MS.HOUR,

  /** Invite token validity (7 days) */
  INVITE_TOKEN: 7 * MS.DAY,
} as const

// =============================================================================
// CRON JOB SCHEDULES (for reference)
// =============================================================================

export const CRON_SCHEDULES = {
  /** Every minute */
  EVERY_MINUTE: '* * * * *',

  /** Every 5 minutes */
  EVERY_5_MINUTES: '*/5 * * * *',

  /** Every hour */
  EVERY_HOUR: '0 * * * *',

  /** Daily at midnight UTC */
  DAILY_MIDNIGHT: '0 0 * * *',

  /** Daily at 6 AM Paraguay time (10 AM UTC) */
  DAILY_6AM_PY: '0 10 * * *',

  /** Weekly on Monday at midnight */
  WEEKLY_MONDAY: '0 0 * * 1',

  /** Monthly on 1st at midnight */
  MONTHLY_FIRST: '0 0 1 * *',
} as const

// =============================================================================
// TIMEOUT DEFAULTS
// =============================================================================

export const TIMEOUTS = {
  /** API request timeout (30 seconds) */
  API_REQUEST: 30 * MS.SECOND,

  /** File upload timeout (5 minutes) */
  FILE_UPLOAD: 5 * MS.MINUTE,

  /** Long-running operation timeout (10 minutes) */
  LONG_OPERATION: 10 * MS.MINUTE,

  /** Idle timeout before logout prompt (30 minutes) */
  IDLE_WARNING: 30 * MS.MINUTE,

  /** Idle timeout for auto-logout (45 minutes) */
  IDLE_LOGOUT: 45 * MS.MINUTE,
} as const
