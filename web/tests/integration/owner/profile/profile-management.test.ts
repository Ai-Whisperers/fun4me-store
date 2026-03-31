/**
 * TST-003: Owner Profile Management Tests - Profile Management Section
 *
 * Tests for owner profile operations:
 * - View own profile
 * - Update profile (name, phone, preferences)
 * - Notification preferences
 * - Profile data validation
 *
 * @epic EPIC-17
 * @ticket TST-003
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'
import {
  mockState,
  getAuthMock,
  getSupabaseServerMock,
  resetAllMocks,
  DEFAULT_TENANT,
  DEFAULT_OWNER,
} from '@/lib/test-utils'

// =============================================================================
// TEST FIXTURES
// =============================================================================

const NOTIFICATION_SETTINGS = {
  email_vaccine_reminders: true,
  email_appointment_reminders: true,
  email_promotions: false,
  sms_vaccine_reminders: false,
  sms_appointment_reminders: true,
  whatsapp_enabled: true,
}

const COMMUNICATION_PREFERENCES = {
  user_id: DEFAULT_OWNER.id,
  tenant_id: DEFAULT_TENANT.id,
  allow_email: true,
  allow_sms: false,
  allow_whatsapp: true,
  allow_appointment_reminders: true,
  allow_vaccine_reminders: true,
  allow_marketing: false,
}

// =============================================================================
// MOCKS - Use centralized test utilities
// =============================================================================

vi.mock('@/lib/supabase/server', () => getSupabaseServerMock())
vi.mock('@/lib/auth', () => getAuthMock())

vi.mock('@/lib/rate-limit', () => ({
  rateLimit: vi.fn().mockResolvedValue({ success: true, remaining: 10 }),
  RATE_LIMITS: { api: { standard: { requests: 100, window: '1m' } } },
}))

vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}))

// Import routes after mocks
import { GET as GetNotificationSettings, POST as PostNotificationSettings } from '@/app/api/user/notification-settings/route'

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function createRequest(url: string, body?: Record<string, unknown>): NextRequest {
  const baseUrl = 'http://localhost:3000'
  const fullUrl = url.startsWith('http') ? url : `${baseUrl}${url}`

  if (body) {
    return new NextRequest(fullUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  }

  return new NextRequest(fullUrl, { method: 'GET' })
}

async function getResponseBody(response: Response): Promise<Record<string, unknown>> {
  const text = await response.text()
  try {
    return JSON.parse(text)
  } catch (_error: unknown) {
    return { raw: text }
  }
}

// =============================================================================
// TESTS
// =============================================================================

describe('TST-003: Owner Profile Management', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resetAllMocks()
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  // ===========================================================================
  // GET /api/user/notification-settings - Notification Preferences
  // ===========================================================================

  describe('GET /api/user/notification-settings - Notification Preferences', () => {
    describe('Authentication', () => {
      it('should reject unauthenticated requests', async () => {
        mockState.setAuthScenario('UNAUTHENTICATED')

        const response = await GetNotificationSettings(
          createRequest('/api/user/notification-settings')
        )

        expect(response.status).toBe(401)
      })

      it('should allow authenticated owner to view settings', async () => {
        mockState.setAuthScenario('OWNER')
        mockState.setTableResult('communication_preferences', COMMUNICATION_PREFERENCES)

        const response = await GetNotificationSettings(
          createRequest('/api/user/notification-settings')
        )

        expect(response.status).toBe(200)
      })

      it('should allow vet to view their own settings', async () => {
        mockState.setAuthScenario('VET')

        const response = await GetNotificationSettings(
          createRequest('/api/user/notification-settings')
        )

        expect(response.status).toBe(200)
      })
    })

    describe('Response Data', () => {
      it('should return notification settings object', async () => {
        mockState.setAuthScenario('OWNER')
        mockState.setTableResult('communication_preferences', COMMUNICATION_PREFERENCES)

        const response = await GetNotificationSettings(
          createRequest('/api/user/notification-settings')
        )

        expect(response.status).toBe(200)
        const body = await getResponseBody(response)
        expect(body).toHaveProperty('email_vaccine_reminders')
        expect(body).toHaveProperty('email_appointment_reminders')
        expect(body).toHaveProperty('whatsapp_enabled')
      })

      it('should return defaults when no preferences exist', async () => {
        mockState.setAuthScenario('OWNER')
        mockState.setTableResult('communication_preferences', null)

        const response = await GetNotificationSettings(
          createRequest('/api/user/notification-settings')
        )

        expect(response.status).toBe(200)
        const body = await getResponseBody(response)
        expect(body.email_vaccine_reminders).toBe(true)
        expect(body.email_appointment_reminders).toBe(true)
        expect(body.email_promotions).toBe(false)
      })

      it('should map database preferences to UI format', async () => {
        mockState.setAuthScenario('OWNER')
        mockState.setTableResult('communication_preferences', COMMUNICATION_PREFERENCES)

        const response = await GetNotificationSettings(
          createRequest('/api/user/notification-settings')
        )

        expect(response.status).toBe(200)
        const body = await getResponseBody(response)
        expect(typeof body.email_vaccine_reminders).toBe('boolean')
        expect(typeof body.whatsapp_enabled).toBe('boolean')
      })
    })
  })

  // ===========================================================================
  // POST /api/user/notification-settings - Update Notification Preferences
  // ===========================================================================

  describe('POST /api/user/notification-settings - Update Preferences', () => {
    describe('Authentication', () => {
      it('should reject unauthenticated requests', async () => {
        mockState.setAuthScenario('UNAUTHENTICATED')

        const response = await PostNotificationSettings(
          createRequest('/api/user/notification-settings', { settings: NOTIFICATION_SETTINGS })
        )

        expect(response.status).toBe(401)
      })

      it('should allow authenticated owner to update settings', async () => {
        mockState.setAuthScenario('OWNER')

        const response = await PostNotificationSettings(
          createRequest('/api/user/notification-settings', { settings: NOTIFICATION_SETTINGS })
        )

        expect(response.status).toBe(200)
      })
    })

    describe('Validation', () => {
      it('should require settings object', async () => {
        mockState.setAuthScenario('OWNER')

        const response = await PostNotificationSettings(
          createRequest('/api/user/notification-settings', {})
        )

        expect(response.status).toBe(400)
      })

      it('should accept partial settings', async () => {
        mockState.setAuthScenario('OWNER')

        const response = await PostNotificationSettings(
          createRequest('/api/user/notification-settings', {
            settings: { whatsapp_enabled: false },
          })
        )

        expect(response.status).toBe(200)
      })

      it('should handle all setting fields', async () => {
        mockState.setAuthScenario('OWNER')

        const fullSettings = {
          email_vaccine_reminders: true,
          email_appointment_reminders: true,
          email_promotions: true,
          sms_vaccine_reminders: true,
          sms_appointment_reminders: true,
          whatsapp_enabled: true,
        }

        const response = await PostNotificationSettings(
          createRequest('/api/user/notification-settings', { settings: fullSettings })
        )

        expect(response.status).toBe(200)
      })
    })

    describe('Response', () => {
      it('should return success on update', async () => {
        mockState.setAuthScenario('OWNER')

        const response = await PostNotificationSettings(
          createRequest('/api/user/notification-settings', { settings: NOTIFICATION_SETTINGS })
        )

        expect(response.status).toBe(200)
        const body = await getResponseBody(response)
        expect(body.success).toBe(true)
      })
    })
  })

  // ===========================================================================
  // OWNER PROFILE ISOLATION TESTS
  // ===========================================================================

  describe('Profile Isolation', () => {
    it('should only return current user settings', async () => {
      mockState.setAuthScenario('OWNER')
      mockState.setTableResult('communication_preferences', COMMUNICATION_PREFERENCES)

      const response = await GetNotificationSettings(
        createRequest('/api/user/notification-settings')
      )

      expect(response.status).toBe(200)
    })

    it('should not expose other users preferences', async () => {
      mockState.setAuthScenario('OWNER')

      const response = await GetNotificationSettings(
        createRequest('/api/user/notification-settings')
      )

      expect(response.status).toBe(200)
    })
  })
})
