/**
 * Generic Cron Job Handler Factory
 *
 * Creates standardized cron job handlers with:
 * - Authorization via CRON_SECRET
 * - Batch processing with configurable size
 * - Retry logic
 * - Structured logging
 * - Error handling
 * - Performance metrics
 *
 * @example
 * ```typescript
 * // api/cron/process-reminders/route.ts
 * import { createCronHandler } from '@/lib/cron/handler'
 *
 * export const dynamic = 'force-dynamic'
 * export const maxDuration = 60
 *
 * export const GET = createCronHandler({
 *   name: 'process-reminders',
 *   query: async (supabase) => {
 *     const { data } = await supabase
 *       .from('reminders')
 *       .select('*')
 *       .eq('status', 'pending')
 *       .lt('scheduled_at', new Date().toISOString())
 *       .limit(50)
 *     return data || []
 *   },
 *   process: async (reminder, supabase) => {
 *     await sendReminderEmail(reminder)
 *     await supabase
 *       .from('reminders')
 *       .update({ status: 'sent', sent_at: new Date().toISOString() })
 *       .eq('id', reminder.id)
 *   },
 *   batchSize: 10,
 * })
 * ```
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'
import type { SupabaseClient } from '@supabase/supabase-js'

// =============================================================================
// TYPES
// =============================================================================

/**
 * Context passed to raw cron handler functions
 * Currently empty, reserved for future extension (e.g., tenant context)
 */
export interface CronContext {
  // Reserved for future use
}

/**
 * Raw handler function signature for custom cron jobs
 */
export type CronRawHandler = (
  request: NextRequest,
  context: CronContext
) => Promise<NextResponse>

export interface CronJobResult {
  success: boolean
  message: string
  stats: {
    total: number
    processed: number
    succeeded: number
    failed: number
    skipped: number
    durationMs: number
  }
  errors?: Array<{
    itemId: string
    error: string
  }>
}

export interface CronHandlerOptions<T = unknown> {
  /** Job name for logging */
  name: string

  /** Query to fetch items to process */
  query: (supabase: SupabaseClient) => Promise<T[]>

  /** Process a single item */
  process: (item: T, supabase: SupabaseClient) => Promise<void>

  /** Number of items to process concurrently (default: 5) */
  batchSize?: number

  /** Maximum retries per item (default: 3) */
  maxRetries?: number

  /** Skip authorization (for local testing) */
  skipAuth?: boolean

  /** Called before processing starts */
  beforeAll?: (items: T[], supabase: SupabaseClient) => Promise<void>

  /** Called after all processing completes */
  afterAll?: (result: CronJobResult, supabase: SupabaseClient) => Promise<void>

  /** Get a unique identifier for an item (for logging) */
  getItemId?: (item: T) => string

  /** Determine if an item should be skipped */
  shouldSkip?: (item: T) => boolean

  /** Handle a failed item (for custom retry/dead-letter logic) */
  onError?: (item: T, error: Error, supabase: SupabaseClient) => Promise<void>
}

// =============================================================================
// CRON HANDLER FACTORY
// =============================================================================

/**
 * Create a cron handler from options or a raw handler function
 *
 * @overload Raw handler: Pass a function (request, context) => Promise<NextResponse>
 * @overload Options-based: Pass CronHandlerOptions with query + process
 */
export function createCronHandler<T = unknown>(
  optionsOrHandler: CronHandlerOptions<T> | CronRawHandler
) {
  // If a raw handler function is passed, wrap it with auth check
  if (typeof optionsOrHandler === 'function') {
    const rawHandler = optionsOrHandler
    return async (request: NextRequest): Promise<NextResponse> => {
      // Authorization check
      const authHeader = request.headers.get('authorization')
      const cronSecret = process.env.CRON_SECRET

      if (!cronSecret) {
        logger.error('[cron] CRON_SECRET not configured - blocking request')
        return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
      }

      if (authHeader !== `Bearer ${cronSecret}`) {
        logger.warn('[cron] Unauthorized cron attempt')
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }

      // Execute the raw handler with empty context
      return rawHandler(request, {})
    }
  }

  // Options-based handler
  const options = optionsOrHandler
  const {
    name,
    query,
    process: processItem,
    batchSize = 5,
    maxRetries = 3,
    skipAuth = false,
    beforeAll,
    afterAll,
    getItemId = (item: T) => (item as Record<string, unknown>).id as string,
    shouldSkip,
    onError,
  } = options

  return async (request: NextRequest): Promise<NextResponse> => {
    const startTime = Date.now()

    // ---------------------------------------------------------------------------
    // Authorization
    // ---------------------------------------------------------------------------
    if (!skipAuth) {
      const authHeader = request.headers.get('authorization')
      const cronSecret = process.env.CRON_SECRET

      // CRITICAL: CRON_SECRET must be configured - fail closed if missing
      if (!cronSecret) {
        logger.error(`[${name}] CRON_SECRET not configured - blocking request`)
        return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
      }

      if (authHeader !== `Bearer ${cronSecret}`) {
        logger.warn(`Unauthorized cron attempt for ${name}`)
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
    }

    // ---------------------------------------------------------------------------
    // Initialize
    // ---------------------------------------------------------------------------
    const supabase = await createClient()

    const result: CronJobResult = {
      success: true,
      message: '',
      stats: {
        total: 0,
        processed: 0,
        succeeded: 0,
        failed: 0,
        skipped: 0,
        durationMs: 0,
      },
      errors: [],
    }

    try {
      // ---------------------------------------------------------------------------
      // Fetch Items
      // ---------------------------------------------------------------------------
      logger.info(`[${name}] Starting cron job`)

      const items = await query(supabase)
      result.stats.total = items.length

      if (items.length === 0) {
        result.message = 'No items to process'
        result.stats.durationMs = Date.now() - startTime
        return NextResponse.json(result)
      }

      logger.info(`[${name}] Found ${items.length} items to process`)

      // ---------------------------------------------------------------------------
      // Before All Hook
      // ---------------------------------------------------------------------------
      if (beforeAll) {
        await beforeAll(items, supabase)
      }

      // ---------------------------------------------------------------------------
      // Process Items in Batches
      // ---------------------------------------------------------------------------
      for (let i = 0; i < items.length; i += batchSize) {
        const batch = items.slice(i, i + batchSize)

        const batchResults = await Promise.allSettled(
          batch.map(async (item) => {
            const itemId = getItemId(item)

            // Check if should skip
            if (shouldSkip && shouldSkip(item)) {
              result.stats.skipped++
              return { status: 'skipped', itemId }
            }

            // Process with retry
            let lastError: Error | null = null
            for (let attempt = 1; attempt <= maxRetries; attempt++) {
              try {
                await processItem(item, supabase)
                result.stats.processed++
                result.stats.succeeded++
                return { status: 'success', itemId }
              } catch (err) {
                lastError = err instanceof Error ? err : new Error(String(err))

                if (attempt < maxRetries) {
                  // Wait before retry with exponential backoff
                  await new Promise((resolve) => setTimeout(resolve, Math.pow(2, attempt) * 100))
                  logger.warn(`[${name}] Retry ${attempt}/${maxRetries} for item ${itemId}`, {
                    error: lastError.message,
                  })
                }
              }
            }

            // All retries failed
            result.stats.processed++
            result.stats.failed++
            result.errors?.push({
              itemId,
              error: lastError?.message || 'Unknown error',
            })

            // Call error handler
            if (onError && lastError) {
              try {
                await onError(item, lastError, supabase)
              } catch (handlerError) {
                logger.error(`[${name}] Error handler failed for item ${itemId}`, {
                  error: handlerError instanceof Error ? handlerError.message : String(handlerError),
                })
              }
            }

            return { status: 'failed', itemId, error: lastError }
          })
        )

        // Log batch progress
        const batchNum = Math.floor(i / batchSize) + 1
        const totalBatches = Math.ceil(items.length / batchSize)
        logger.info(`[${name}] Processed batch ${batchNum}/${totalBatches}`)
      }

      // ---------------------------------------------------------------------------
      // Finalize
      // ---------------------------------------------------------------------------
      result.stats.durationMs = Date.now() - startTime
      result.message = `Processed ${result.stats.processed}/${result.stats.total} items (${result.stats.succeeded} succeeded, ${result.stats.failed} failed, ${result.stats.skipped} skipped)`

      if (result.stats.failed > 0) {
        result.success = false
      }

      // After all hook
      if (afterAll) {
        await afterAll(result, supabase)
      }

      logger.info(`[${name}] Completed`, {
        ...result.stats,
        errorCount: result.errors?.length || 0,
      })

      return NextResponse.json(result)
    } catch (error: unknown) {
      const err = error instanceof Error ? error : new Error(String(error))
      result.stats.durationMs = Date.now() - startTime
      result.success = false
      result.message = err.message

      logger.error(`[${name}] Cron job failed`, { error: err.message })

      return NextResponse.json(
        {
          ...result,
          error: err.message,
        },
        { status: 500 }
      )
    }
  }
}

// =============================================================================
// SIMPLE CRON HANDLER (for RPC-based jobs)
// =============================================================================

/**
 * Simple cron handler for jobs that just call a database RPC function
 *
 * @example
 * ```typescript
 * export const GET = createSimpleCronHandler({
 *   name: 'release-reservations',
 *   rpc: 'release_expired_reservations',
 * })
 * ```
 */
export function createSimpleCronHandler(options: {
  name: string
  rpc: string
  rpcParams?: Record<string, unknown>
  skipAuth?: boolean
}) {
  const { name, rpc, rpcParams, skipAuth = false } = options

  return async (request: NextRequest): Promise<NextResponse> => {
    const startTime = Date.now()

    // Authorization
    if (!skipAuth) {
      const authHeader = request.headers.get('authorization')
      const cronSecret = process.env.CRON_SECRET

      // CRITICAL: CRON_SECRET must be configured - fail closed if missing
      if (!cronSecret) {
        logger.error(`[${name}] CRON_SECRET not configured - blocking request`)
        return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
      }

      if (authHeader !== `Bearer ${cronSecret}`) {
        logger.warn(`Unauthorized cron attempt for ${name}`)
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
    }

    const supabase = await createClient()

    try {
      logger.info(`[${name}] Starting RPC cron job`)

      const { data, error } = rpcParams
        ? await supabase.rpc(rpc, rpcParams)
        : await supabase.rpc(rpc)

      if (error) {
        logger.error(`[${name}] RPC failed`, { error: error.message })
        return NextResponse.json(
          {
            success: false,
            error: error.message,
            durationMs: Date.now() - startTime,
          },
          { status: 500 }
        )
      }

      const durationMs = Date.now() - startTime

      logger.info(`[${name}] Completed`, { result: data, durationMs })

      return NextResponse.json({
        success: true,
        result: data,
        durationMs,
        timestamp: new Date().toISOString(),
      })
    } catch (error: unknown) {
      const err = error instanceof Error ? error : new Error(String(error))
      logger.error(`[${name}] Exception`, { error: err.message })

      return NextResponse.json(
        {
          success: false,
          error: err.message,
          durationMs: Date.now() - startTime,
        },
        { status: 500 }
      )
    }
  }
}

// =============================================================================
// TENANT-AWARE CRON HANDLER
// =============================================================================

/**
 * Cron handler that processes items across all tenants
 *
 * @example
 * ```typescript
 * export const GET = createTenantCronHandler({
 *   name: 'generate-invoices',
 *   queryByTenant: async (supabase, tenantId) => {
 *     const { data } = await supabase
 *       .from('pending_invoices')
 *       .select('*')
 *       .eq('tenant_id', tenantId)
 *     return data || []
 *   },
 *   process: async (item, supabase) => {
 *     await generateInvoice(item)
 *   },
 * })
 * ```
 */
export function createTenantCronHandler<T = unknown>(
  options: Omit<CronHandlerOptions<T>, 'query'> & {
    queryByTenant: (supabase: SupabaseClient, tenantId: string) => Promise<T[]>
    /** Filter which tenants to process (optional) */
    tenantFilter?: (tenant: { id: string; name: string }) => boolean
  }
) {
  const { queryByTenant, tenantFilter, ...restOptions } = options

  return createCronHandler<T>({
    ...restOptions,
    query: async (supabase) => {
      // Get all active tenants
      const { data: tenants } = await supabase.from('tenants').select('id, name')

      if (!tenants || tenants.length === 0) {
        return []
      }

      // Filter tenants if needed
      const activeTenants = tenantFilter ? tenants.filter(tenantFilter) : tenants

      // Query items from all tenants
      const allItems: T[] = []
      for (const tenant of activeTenants) {
        const items = await queryByTenant(supabase, tenant.id)
        allItems.push(...items)
      }

      return allItems
    },
  })
}

// Note: Types are exported at declaration
