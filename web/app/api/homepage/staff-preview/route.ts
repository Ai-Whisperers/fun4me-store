import { NextResponse } from 'next/server'
import { withApiAuth } from '@/lib/auth/api-wrapper'
import { logger } from '@/lib/logger'

/**
 * GET /api/homepage/staff-preview
 * Returns a preview of staff dashboard data for the homepage widget
 * - Waiting room count
 * - Today's appointments (max 4)
 * - Pending approvals count
 */
export const GET = withApiAuth(
  async ({ profile, supabase, request }) => {
    const clinic = request.nextUrl.searchParams.get('clinic')

    if (!clinic) {
      return NextResponse.json({ error: 'Se requiere el parámetro clinic' }, { status: 400 })
    }

    // Verify staff belongs to this clinic
    if (profile.tenant_id !== clinic) {
      return NextResponse.json({ error: 'Acceso denegado a esta clínica' }, { status: 403 })
    }

    try {
      // Get today's date boundaries
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const tomorrow = new Date(today)
      tomorrow.setDate(tomorrow.getDate() + 1)

      // Run queries in parallel for efficiency
      const [waitingResult, appointmentsResult, ordersResult] = await Promise.all([
        // Waiting room count (checked_in status)
        supabase
          .from('appointments')
          .select('id', { count: 'exact', head: true })
          .eq('tenant_id', profile.tenant_id)
          .eq('status', 'checked_in'),

        // Today's appointments
        supabase
          .from('appointments')
          .select(
            `
            id,
            start_time,
            end_time,
            status,
            reason,
            pets (
              id,
              name,
              photo_url,
              species
            )
          `
          )
          .eq('tenant_id', profile.tenant_id)
          .gte('start_time', today.toISOString())
          .lt('start_time', tomorrow.toISOString())
          .neq('status', 'cancelled')
          .order('start_time', { ascending: true })
          .limit(4),

        // Pending prescription orders count
        supabase
          .from('store_orders')
          .select('id', { count: 'exact', head: true })
          .eq('tenant_id', profile.tenant_id)
          .eq('requires_prescription_review', true)
          .eq('status', 'pending'),
      ])

      return NextResponse.json({
        waitingCount: waitingResult.count || 0,
        todayAppointments: appointmentsResult.data || [],
        pendingApprovals: ordersResult.count || 0,
      })
    } catch (error) {
      logger.error('Error in staff-preview endpoint', {
        tenantId: profile.tenant_id,
        error: error instanceof Error ? error.message : 'Unknown error',
      })
      return NextResponse.json({ error: 'Error al obtener datos' }, { status: 500 })
    }
  },
  { roles: ['vet', 'admin'] }
)
