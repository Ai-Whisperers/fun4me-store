/**
 * GET /api/dashboard/today-appointments
 * Get today's appointments for the clinic
 *
 * REFACTORED: Now uses AppointmentService (service layer pattern)
 * Before: 104 lines of direct database logic + manual enrichment
 * After: 32 lines delegating to service
 */

import { NextResponse } from 'next/server';
import { withApiAuth, type ApiHandlerContext } from '@/lib/auth';
import { apiError, HTTP_STATUS } from '@/lib/api/errors';
import { AppointmentService } from '@/lib/services';

export const GET = withApiAuth(
  async ({ profile, supabase }: ApiHandlerContext) => {
    // Calculate today's date range
    const today = new Date().toISOString().split('T')[0];
    const startOfDay = `${today}T00:00:00`;
    const endOfDay = `${today}T23:59:59`;

    // Delegate to service layer with date filters
    const service = new AppointmentService(supabase);
    const result = await service.list(profile.tenant_id, {
      start_date: startOfDay,
      end_date: endOfDay,
    });

    // Return standardized response
    if (!result.success) {
      return apiError('DATABASE_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR, {
        details: { message: result.error },
      });
    }

    // Service already returns enriched data with pet, owner, vet, and service details
    return NextResponse.json(result.data, { status: 200 });
  },
  { roles: ['vet', 'admin'] }
);
