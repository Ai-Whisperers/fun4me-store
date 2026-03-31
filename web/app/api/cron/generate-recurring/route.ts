import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'
import { checkCronAuth } from '@/lib/api/cron-auth'
import { notifyStaff } from '@/lib/notifications'

export const dynamic = 'force-dynamic'

/**
 * Generate Recurring Appointments Cron Job
 *
 * Runs daily to generate appointments from recurring patterns.
 * Should be scheduled to run at 00:00 or early morning.
 *
 * Uses the database function `generate_recurring_appointments` which:
 * - Finds active, non-paused recurrences
 * - Calculates next occurrence dates
 * - Creates appointments avoiding conflicts
 * - Updates the occurrences_generated counter
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  // SEC-006: Use timing-safe cron authentication
  const { authorized, errorResponse } = checkCronAuth(request)
  if (!authorized && errorResponse) {
    return errorResponse
  }
  if (!authorized) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const supabase = await createClient('service_role')

  const results = {
    generated: 0,
    recurrences_processed: new Set<string>(),
    expired_offers_processed: 0,
    errors: [] as string[],
  }

  try {
    logger.info('Starting generate-recurring cron job')

    // 1. Generate recurring appointments for next 30 days
    const { data: generated, error: genError } = await supabase.rpc(
      'generate_recurring_appointments',
      { p_days_ahead: 30 }
    )

    if (genError) {
      logger.error('Error generating recurring appointments:', { error: genError.message })
      results.errors.push(`Generation error: ${genError.message}`)
    } else {
      results.generated = generated?.length || 0

      // Track unique recurrences
      for (const apt of generated || []) {
        results.recurrences_processed.add(apt.recurrence_id)
      }

      logger.info(
        `Generated ${results.generated} appointments from ${results.recurrences_processed.size} recurrences`
      )

      // Log each generated appointment
      for (const apt of generated || []) {
        logger.info(`Generated appointment ${apt.appointment_id} for ${apt.scheduled_for}`)
      }
    }

    // 2. Expire old waitlist offers (bonus cleanup)
    const { data: expiredCount, error: expireError } = await supabase.rpc(
      'expire_waitlist_offers'
    )

    if (expireError) {
      // This is not critical, just log it
      logger.warn('Error expiring waitlist offers:', { error: expireError.message })
    } else {
      results.expired_offers_processed = expiredCount || 0
      if (expiredCount > 0) {
        logger.info(`Expired ${expiredCount} waitlist offers`)
      }
    }

    // 3. Check for recurrences that are about to reach their limit
    const { data: nearingLimit } = await supabase
      .from('appointment_recurrences')
      .select(`
        id,
        tenant_id,
        pet_id,
        service_id,
        max_occurrences,
        occurrences_generated,
        pet:pets!pet_id (name, owner:profiles!owner_id (full_name)),
        service:services!service_id (name)
      `)
      .eq('is_active', true)
      .not('max_occurrences', 'is', null)

    const aboutToEnd = (nearingLimit || []).filter(
      (r) => r.max_occurrences && r.occurrences_generated >= r.max_occurrences - 2
    )

    if (aboutToEnd.length > 0) {
      logger.info(
        `${aboutToEnd.length} recurrences are nearing their occurrence limit`
      )

      // Group by tenant and send notifications
      const byTenant = new Map<string, typeof aboutToEnd>()
      for (const r of aboutToEnd) {
        const existing = byTenant.get(r.tenant_id) || []
        existing.push(r)
        byTenant.set(r.tenant_id, existing)
      }

      for (const [tenantId, recurrences] of byTenant) {
        try {
          const details = recurrences.map((r) => {
            const pet = r.pet as { name?: string; owner?: { full_name?: string } } | null
            const service = r.service as { name?: string } | null
            const remaining = (r.max_occurrences || 0) - r.occurrences_generated
            return `${pet?.name || 'Mascota'} (${pet?.owner?.full_name || 'Cliente'}) - ${service?.name || 'Servicio'}: ${remaining} citas restantes`
          })

          await notifyStaff({
            tenantId,
            title: 'Citas recurrentes por terminar',
            message: `${recurrences.length} patrón(es) de citas recurrentes están próximos a alcanzar su límite. Considera extender o renovar.`,
            type: 'recurrence_limit_warning',
            channels: ['in_app'],
            data: {
              count: recurrences.length,
              details,
            },
          })
        } catch (notifError) {
          logger.warn('Failed to send recurrence limit notification', {
            tenantId,
            error: notifError instanceof Error ? notifError.message : 'Unknown',
          })
        }
      }
    }

    // 4. Check for paused recurrences that should resume
    const today = new Date().toISOString().split('T')[0]
    const { data: toResume, error: resumeError } = await supabase
      .from('appointment_recurrences')
      .update({ paused_until: null, updated_at: new Date().toISOString() })
      .eq('is_active', true)
      .lte('paused_until', today)
      .select('id')

    if (resumeError) {
      logger.warn('Error resuming paused recurrences:', { error: resumeError.message })
    } else if (toResume && toResume.length > 0) {
      logger.info(`Resumed ${toResume.length} paused recurrences`)
    }

    logger.info('Completed generate-recurring cron job', results)

    return NextResponse.json({
      success: true,
      ...results,
      recurrences_processed: results.recurrences_processed.size,
    })
  } catch (error) {
    logger.error('Fatal error in generate-recurring cron:', {
      error: error instanceof Error ? error.message : String(error),
    })

    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        results,
      },
      { status: 500 }
    )
  }
}
