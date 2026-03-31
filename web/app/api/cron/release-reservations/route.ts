import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'
import { checkCronAuth } from '@/lib/api/cron-auth'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

/**
 * GET /api/cron/release-reservations
 *
 * Cron job to release expired stock reservations.
 * Should be called every 5-10 minutes.
 * Configure in vercel.json crons with schedule: "0/5 * * * *"
 */
export async function GET(request: NextRequest) {
  // SEC-006: Use timing-safe cron authentication
  const { authorized, errorResponse } = checkCronAuth(request)
  if (!authorized && errorResponse) {
    return errorResponse
  }
  if (!authorized) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const supabase = await createClient('service_role')
  const startTime = Date.now()

  try {
    // Call the RPC function to release expired reservations
    const { data: result, error } = await supabase.rpc('release_expired_reservations')

    if (error) {
      logger.error('Error releasing expired reservations', { error })
      return NextResponse.json(
        {
          success: false,
          error: error.message
        },
        { status: 500 }
      )
    }

    const duration = Date.now() - startTime

    logger.info('Released expired reservations', {
      releasedCount: result?.released_count || 0,
      durationMs: duration,
    })

    return NextResponse.json({
      success: true,
      released_count: result?.released_count || 0,
      duration_ms: duration,
      timestamp: new Date().toISOString(),
    })
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err))
    logger.error('Exception in release-reservations cron', { error: error.message })

    return NextResponse.json(
      {
        success: false,
        error: error.message
      },
      { status: 500 }
    )
  }
}
