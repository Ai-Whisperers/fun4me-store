import { describe, it, expect, beforeEach, vi } from 'vitest';
import { POST } from '@/app/api/booking/route';
import { createMockApiContext } from '@/tests/__helpers__/api-test-helper';
import { createMockSupabase } from '@/tests/__helpers__/mocks';

// Mock Supabase
const mockSupabase = createMockSupabase();

// Mock auth library
vi.mock('@/lib/auth', () => ({
  withApiAuth: (handler: any) => async (req: any, ctx: any) => {
    // Simulate auth middleware behavior
    const context = {
        ...req.headers.get('x-test-context') ? JSON.parse(req.headers.get('x-test-context') as string) : {},
        supabase: mockSupabase,
        request: req,
    }
    
    // If we want to simulate failure in middleware, we would check for headers here.
    // However, the test helper will call the handler directly with mocked context
    // This mock is mainly to allow importing the handler without errors
    
    return handler(context, ctx);
  }
}));

vi.mock('@/lib/api/errors', () => ({
    API_ERRORS: {
        NOT_FOUND: { error: 'Not Found', code: 'NOT_FOUND' },
        VALIDATION_ERROR: { error: 'Validation Error', code: 'VALIDATION_ERROR' },
        FORBIDDEN: { error: 'Forbidden', code: 'FORBIDDEN' },
        UNAUTHORIZED: { error: 'Unauthorized', code: 'UNAUTHORIZED' },
        DATABASE_ERROR: { error: 'Database Error', code: 'DATABASE_ERROR' }
    },
    apiError: (code: string, status: number, details?: any) => Promise.resolve(Response.json({ error: code, details }, { status })),
    apiSuccess: (data: any, message?: string, status = 200) => Promise.resolve(Response.json({ data, message }, { status }))
}));

describe('Integration: Protected Route (Booking)', () => {

  const testTenantId = 'tenant_123';
  const testOwnerId = '123e4567-e89b-12d3-a456-426614174099'; // Owner ID UUID
  const testPetId = '123e4567-e89b-12d3-a456-426614174000'; // Pet ID UUID

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Since actual API testing requires running the Next.js server, and we are in unit/integration test mode,
  // we will test the handler logic by invoking the route function directly.
  // The `withApiAuth` wrapper handles the authentication check before calling the handler.
  
  // NOTE: True integration testing of the middleware + route requires e2e tests (Playwright).
  // This test focuses on the ROUTE LOGIC given an authenticated context.

  it('Create Booking - Should fail validation with empty body', async () => {
    // Arrange
    const { request, context } = createMockApiContext({
        method: 'POST',
        body: {}, // Empty body
        user: { id: testOwnerId }, 
        profile: { id: testOwnerId, tenant_id: testTenantId, role: 'owner' }
    });

    // Act
    const response = await POST(request as any);
    const json = await response.json();

    // Assert
    expect(response.status).toBe(400);
    expect(json.error).toBe('VALIDATION_ERROR');
  });

  it('Create Booking - Should fail if pet not owned by user (Owner Role)', async () => {
    // Arrange
    const body = {
        clinic_slug: testTenantId,
        pet_id: '123e4567-e89b-12d3-a456-426614174000', // Valid UUID
        service_id: '123e4567-e89b-12d3-a456-426614174001', // Valid UUID
        appointment_date: '2026-06-01T10:00:00Z', // Valid ISO Datetime
        time_slot: '10:00',
        notes: 'Checkup'
    };

    const { request } = createMockApiContext({
        method: 'POST',
        body,
        user: { id: testOwnerId }, 
        profile: { id: testOwnerId, tenant_id: testTenantId, role: 'owner' }
    });

    // Mock Pet Query: Return pet owned by SOMEONE ELSE
    mockSupabase.from().select().eq().single.mockResolvedValue({
        data: { id: testPetId, owner_id: 'other_owner', tenant_id: testTenantId },
        error: null
    });

    // Act
    const response = await POST(request as any);
    const json = await response.json();

    // Assert
    expect(response.status).toBe(403);
    expect(json.error).toBe('FORBIDDEN');
  });
});
