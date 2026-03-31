/**
 * Inngest Serve Endpoint
 *
 * This endpoint handles all Inngest function execution.
 * Inngest will call this endpoint to:
 * - Register functions
 * - Execute scheduled jobs (cron)
 * - Execute event-triggered jobs
 *
 * @see https://www.inngest.com/docs/learn/serving-inngest-functions
 */

import { serve } from 'inngest/next'
import { inngest, inngestFunctions } from '@/lib/inngest'

/**
 * Serve configuration
 *
 * In production, Inngest Cloud will call this endpoint.
 * In development, run `npx inngest-cli@latest dev` for local testing.
 */
export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: inngestFunctions,
  // Streaming for long-running functions
  streaming: 'allow',
})
