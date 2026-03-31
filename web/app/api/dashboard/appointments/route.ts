/**
 * GET /api/dashboard/appointments
 * Get appointment analytics for the clinic
 *
 * REFACTORED: Now uses AppointmentService (service layer pattern)
 * Before: 97 lines of direct database logic + fallback query
 * After: 22 lines delegating to service
 */

import { NextResponse } from 'next/server';
import { withApiAuth, type ApiHandlerContext } from '@/lib/auth';
import { apiError, HTTP_STATUS } from '@/lib/api/errors';
import { AppointmentService } from '@/lib/services';

export const GET = withApiAuth(
  async ({ request, profile, supabase }: ApiHandlerContext) => {
    const { searchParams } = new URL(request.url);
    const period = (searchParams.get('period') || 'month') as 'day' | 'week' | 'month';

    // Delegate to service layer
    const service = new AppointmentService(supabase);
    const result = await service.getAnalytics(profile.tenant_id, period);

    // Return standardized response
    if (!result.success) {
      return apiError('DATABASE_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR, {
        details: { message: result.error },
      });
    }

    return NextResponse.json(result.data);
  },
  { roles: ['vet', 'admin'] }
);
