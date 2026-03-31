/**
 * GET /api/appointments/slots
 * Returns available appointment slots for a clinic
 *
 * Public endpoint - authentication required
 * Security: Users can only access slots for their own clinic
 *
 * REFACTORED: Now uses AppointmentService (service layer pattern)
 * Before: 123 lines of direct database logic + RPC call
 * After: 44 lines delegating to service
 */

import { NextResponse } from 'next/server';
import { withApiAuth, type ApiHandlerContext } from '@/lib/auth/api-wrapper';
import { apiError } from '@/lib/api/errors';
import { AppointmentService } from '@/lib/services';

export const GET = withApiAuth(async ({ request, profile, supabase }: ApiHandlerContext) => {
  const { searchParams } = new URL(request.url);

  const clinicSlug = searchParams.get('clinic');
  const date = searchParams.get('date');
  const serviceId = searchParams.get('service_id');
  const vetId = searchParams.get('vet_id');

  // Validate required parameters
  if (!clinicSlug || !date) {
    return apiError('MISSING_FIELDS', 400, {
      details: { required: ['clinic', 'date'] },
    });
  }

  // Validate date format (YYYY-MM-DD)
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(date)) {
    return apiError('INVALID_FORMAT', 400, {
      details: { field: 'date', expected: 'YYYY-MM-DD' },
    });
  }

  // Verify tenant isolation - users can only access slots for their own clinic
  const isStaff = ['vet', 'admin'].includes(profile.role);
  if (clinicSlug !== profile.tenant_id && !isStaff) {
    return apiError('FORBIDDEN', 403);
  }

  // Delegate to service layer
  const service = new AppointmentService(supabase);
  const result = await service.getAvailableSlots(clinicSlug, {
    date,
    service_id: serviceId || undefined,
    vet_id: vetId || undefined,
  });

  // Return standardized response
  if (!result.success) {
    return apiError('DATABASE_ERROR', 500, {
      details: { message: result.error },
    });
  }

  return NextResponse.json(result.data);
});
