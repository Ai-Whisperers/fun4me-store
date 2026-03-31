import * as Sentry from '@sentry/nextjs'

/**
 * Sentry Edge runtime configuration
 * Initializes error tracking for Edge functions (middleware, edge API routes)
 *
 * IMPORTANT: Only initializes when SENTRY_DSN is configured to avoid
 * console noise in development
 */

const dsn = process.env.SENTRY_DSN

// Only initialize Sentry if DSN is configured
if (dsn) {
  Sentry.init({
    dsn,

    // Environment identification
    environment: process.env.NODE_ENV,

    // Only enable debug when explicitly requested
    debug: process.env.SENTRY_DEBUG === 'true',

    // Multi-tenant context
    initialScope: {
      tags: {
        app: 'vete',
        runtime: 'edge',
      },
    },

    // Performance monitoring
    // Lower sample rate for edge due to high volume
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

    // Scrub sensitive data
    beforeSend(event) {
      // Scrub authorization headers
      if (event.request?.headers) {
        const headers = event.request.headers as Record<string, string>
        if (headers['authorization']) {
          headers['authorization'] = '[REDACTED]'
        }
        if (headers['cookie']) {
          headers['cookie'] = '[REDACTED]'
        }
      }

      return event
    },
  })
}
