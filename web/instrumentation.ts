import * as Sentry from '@sentry/nextjs'

/**
 * Next.js instrumentation file for Sentry integration
 * This file is automatically loaded by Next.js to initialize monitoring
 * @see https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./sentry.server.config')
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('./sentry.edge.config')
  }
}

/**
 * Automatically capture request errors and send to Sentry
 * This hook is called by Next.js when an error occurs during request handling
 */
export const onRequestError = Sentry.captureRequestError
