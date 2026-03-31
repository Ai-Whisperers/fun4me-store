import * as Sentry from '@sentry/nextjs'

/**
 * Sentry client-side configuration
 * Initializes error tracking, performance monitoring, and session replay for the browser
 *
 * IMPORTANT: Only initializes when NEXT_PUBLIC_SENTRY_DSN is configured to avoid
 * console noise in development
 */

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN

// Only initialize Sentry if DSN is configured
if (dsn) {
  Sentry.init({
    dsn,

    // Environment identification
    environment: process.env.NODE_ENV,

    // Only enable debug when explicitly requested via NEXT_PUBLIC_SENTRY_DEBUG=true
    debug: process.env.NEXT_PUBLIC_SENTRY_DEBUG === 'true',

    // Multi-tenant context - identify this as the Vete app
    initialScope: {
      tags: {
        app: 'vete',
        runtime: 'browser',
      },
    },

    // Performance monitoring
    // Sample 10% of transactions in production, 100% in development
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

    // Session replay configuration
    // Capture 10% of all sessions, but 100% of sessions with errors
    replaysSessionSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 0,
    replaysOnErrorSampleRate: 1.0,

    // Integrations
    integrations: [
      // Session replay for debugging user issues
      Sentry.replayIntegration({
        // Mask all text for privacy
        maskAllText: false,
        // Block all media for performance
        blockAllMedia: true,
      }),
      // Browser performance tracing
      Sentry.browserTracingIntegration(),
    ],

    // Filter out noisy errors that aren't actionable
    beforeSend(event, hint) {
      const error = hint.originalException

      // Ignore network errors from ad blockers or extensions
      if (event.message?.includes('blocked') || event.message?.includes('ERR_BLOCKED')) {
        return null
      }

      // Ignore ResizeObserver errors (common browser noise)
      if (error instanceof Error && error.message?.includes('ResizeObserver')) {
        return null
      }

      // Ignore chunk loading errors (usually network issues)
      if (event.message?.includes('Loading chunk') || event.message?.includes('ChunkLoadError')) {
        return null
      }

      return event
    },

    // Automatically instrument fetch and XHR requests
    tracePropagationTargets: [
      'localhost',
      /^https:\/\/.*\.supabase\.co/,
      /^\/api\//,
    ],
  })
}
