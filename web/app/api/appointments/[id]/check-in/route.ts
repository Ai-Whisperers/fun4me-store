/**
 * POST /api/appointments/[id]/check-in
 * Marks an appointment as checked in
 * Staff only - requires vet/admin role
 *
 * REFACTORED: Now uses AppointmentService (service layer pattern)
 * Before: 77 lines of direct database logic
 * After: 25 lines delegating to service
 */

import { withApiAuthParams, type ApiHandlerContextWithParams } from '@/lib/auth';
import { apiError, apiSuccess, HTTP_STATUS } from '@/lib/api/errors';
import { AppointmentService } from '@/lib/services';

type Params = { id: string };

export const POST = withApiAuthParams<Params>(
  async ({ params, user, profile, supabase }: ApiHandlerContextWithParams<Params>) => {
    const { id } = params;

    // Delegate to service layer
    const service = new AppointmentService(supabase);
    const result = await service.checkIn(id, profile.tenant_id, user.id);

    // Return standardized response
    if (!result.success) {
      const statusCode = result.code === 'NOT_FOUND' ? HTTP_STATUS.NOT_FOUND : HTTP_STATUS.BAD_REQUEST;
      return apiError('VALIDATION_ERROR', statusCode, {
        details: { reason: result.error },
      });
    }

    return apiSuccess({ id: result.data.id }, 'Cita registrada correctamente');
  },
  { roles: ['vet', 'admin'], rateLimit: 'write' }
);
