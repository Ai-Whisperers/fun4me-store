import { NextResponse } from 'next/server'
import { withApiAuth } from '@/lib/auth'
import { apiError, HTTP_STATUS } from '@/lib/api/errors'
import { logger } from '@/lib/logger'

// GET /api/dashboard/stats - Get clinic dashboard stats (live query)
export const GET = withApiAuth(
  async ({ profile, supabase }) => {
    try {
      // Use live queries for accurate, real-time data
      const today = new Date().toISOString().split('T')[0]
      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

      // First get pets for this tenant
      const { data: tenantPets } = await supabase
        .from('pets')
        .select('id')
        .eq('tenant_id', profile.tenant_id)
        .is('deleted_at', null)

      const petIds = tenantPets?.map((p) => p.id) || []

      const [petsResult, appointmentsResult, completedResult, vaccinesResult, invoicesResult] =
        await Promise.all([
          // Pets count
          supabase
            .from('pets')
            .select('id', { count: 'exact', head: true })
            .eq('tenant_id', profile.tenant_id)
            .is('deleted_at', null),
          // Today's appointments (all statuses except cancelled)
          supabase
            .from('appointments')
            .select('id', { count: 'exact', head: true })
            .eq('tenant_id', profile.tenant_id)
            .gte('start_time', today)
            .lt('start_time', tomorrow)
            .neq('status', 'cancelled'),
          // Today's completed appointments
          supabase
            .from('appointments')
            .select('id', { count: 'exact', head: true })
            .eq('tenant_id', profile.tenant_id)
            .gte('start_time', today)
            .lt('start_time', tomorrow)
            .eq('status', 'completed'),
          // Pending vaccines for tenant's pets (due within 7 days)
          petIds.length > 0
            ? supabase
                .from('vaccines')
                .select('id', { count: 'exact', head: true })
                .in('pet_id', petIds)
                .lte('next_due_date', nextWeek)
                .is('deleted_at', null)
            : Promise.resolve({ count: 0 }),
          // Pending invoices
          supabase
            .from('invoices')
            .select('id, amount_due', { count: 'exact' })
            .eq('tenant_id', profile.tenant_id)
            .in('status', ['sent', 'partial']),
        ])

      const pendingAmount =
        invoicesResult.data?.reduce((sum, inv) => sum + (inv.amount_due || 0), 0) || 0

      return NextResponse.json({
        total_pets: petsResult.count || 0,
        appointments_today: appointmentsResult.count || 0,
        completed_today: completedResult.count || 0,
        pending_vaccines: vaccinesResult.count || 0,
        pending_invoices: invoicesResult.count || 0,
        pending_amount: pendingAmount,
        last_updated: new Date().toISOString(),
      })
    } catch (e) {
      logger.error('Error loading dashboard stats', {
        tenantId: profile.tenant_id,
        error: e instanceof Error ? e.message : 'Unknown',
      })
      return apiError('DATABASE_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR, {
        details: { message: e instanceof Error ? e.message : 'Unknown error' },
      })
    }
  },
  { roles: ['vet', 'admin'] }
)
