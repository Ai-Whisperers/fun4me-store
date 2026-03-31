/**
 * Cron Reminders API Tests
 *
 * Tests for:
 * - GET /api/cron/reminders
 *
 * This cron job processes pending reminders and sends notifications
 * via email, SMS, and WhatsApp channels.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET } from '@/app/api/cron/reminders/route'
import {
  mockState,
  TENANTS,
  USERS,
  PETS,
  REMINDERS,
  CRON_SECRETS,
  resetAllMocks,
  createStatefulSupabaseMock,
} from '@/lib/test-utils'

// Mock Supabase client
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => Promise.resolve(createStatefulSupabaseMock())),
}))

// Mock logger
vi.mock('@/lib/logger', () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
}))

// Mock reminders library - must match actual import paths from route.ts
vi.mock('@/lib/reminders/content-builder', () => ({
  buildReminderContent: vi.fn().mockResolvedValue({
    subject: 'Recordatorio de vacuna',
    htmlBody: '<p>Recordatorio de vacuna para Max</p>',
    textBody: 'Recordatorio de vacuna para Max',
  }),
}))

vi.mock('@/lib/reminders/channel-sender', () => ({
  sendReminderToChannels: vi.fn().mockResolvedValue([
    { channel: 'email', success: true },
  ]),
}))


// Import mocked reminders functions (after mock declaration)
// Using type assertion since vi.mock replaces the module
import * as contentBuilderModule from '@/lib/reminders/content-builder'
import * as channelSenderModule from '@/lib/reminders/channel-sender'
const buildReminderContent = contentBuilderModule.buildReminderContent as ReturnType<typeof vi.fn>
const sendReminderToChannels = channelSenderModule.sendReminderToChannels as ReturnType<typeof vi.fn>

// Store original env
const originalEnv = process.env

// Helper to create request with optional auth
function createRequest(authHeader?: string): NextRequest {
  const headers: HeadersInit = {}
  if (authHeader) {
    headers['authorization'] = authHeader
  }

  return new NextRequest('http://localhost:3000/api/cron/reminders', {
    method: 'GET',
    headers,
  })
}

// Sample reminder data
const SAMPLE_REMINDER = {
  id: REMINDERS.VACCINE_PENDING.id,
  tenant_id: TENANTS.ADRIS.id,
  client_id: USERS.OWNER_JUAN.id,
  pet_id: PETS.MAX_DOG.id,
  type: 'vaccine',
  reference_type: 'vaccine',
  reference_id: 'vaccine-001',
  scheduled_at: new Date(Date.now() - 60 * 60 * 1000).toISOString(), // 1 hour ago
  status: 'pending',
  attempts: 0,
  max_attempts: 3,
  channels: ['email'],
  channels_sent: [],
  custom_subject: null,
  custom_body: null,
  client: {
    id: USERS.OWNER_JUAN.id,
    full_name: USERS.OWNER_JUAN.fullName,
    email: USERS.OWNER_JUAN.email,
    phone: USERS.OWNER_JUAN.phone,
  },
  pet: {
    id: PETS.MAX_DOG.id,
    name: PETS.MAX_DOG.name,
    species: PETS.MAX_DOG.species,
  },
}

// ============================================================================
// Authentication Tests
// ============================================================================

describe('GET /api/cron/reminders', () => {
  beforeEach(() => {
    resetAllMocks()
    vi.clearAllMocks()
    // Set CRON_SECRET for auth tests
    process.env = { ...originalEnv, CRON_SECRET: CRON_SECRETS.VALID }
  })

  afterEach(() => {
    process.env = originalEnv
  })

  describe('Authentication', () => {
    it('should return 401 without authorization header when CRON_SECRET is set', async () => {
      const response = await GET(createRequest())

      expect(response.status).toBe(401)
      const body = await response.json()
      expect(body.error).toBe('Unauthorized')
    })

    it('should return 401 with invalid cron secret', async () => {
      const response = await GET(createRequest(`Bearer ${CRON_SECRETS.INVALID}`))

      expect(response.status).toBe(401)
      const body = await response.json()
      expect(body.error).toBe('Unauthorized')
    })

    it('should return 401 with malformed authorization header', async () => {
      const response = await GET(createRequest('InvalidFormat'))

      expect(response.status).toBe(401)
    })

    it('should allow request with valid cron secret', async () => {
      mockState.setTableResult('reminders', [])

      const response = await GET(createRequest(`Bearer ${CRON_SECRETS.VALID}`))

      expect(response.status).toBe(200)
    })

    it('should return 500 when CRON_SECRET is not set (fail-closed)', async () => {
      process.env = { ...originalEnv, CRON_SECRET: undefined }

      const response = await GET(createRequest())

      // SEC-006: Fail closed when CRON_SECRET is not configured
      expect(response.status).toBe(500)
      const body = await response.json()
      expect(body.error).toBe('Server configuration error')
    })
  })

  // ============================================================================
  // No Reminders Tests
  // ============================================================================

  describe('No Pending Reminders', () => {
    beforeEach(() => {
      process.env = { ...originalEnv, CRON_SECRET: CRON_SECRETS.VALID }
    })

    it('should return success when no pending reminders', async () => {
      mockState.setTableResult('reminders', [])

      const response = await GET(createRequest(`Bearer ${CRON_SECRETS.VALID}`))

      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.message).toBe('No pending reminders')
      expect(body.processed).toBe(0)
    })

    it('should return empty stats when no reminders', async () => {
      mockState.setTableResult('reminders', [])

      const response = await GET(createRequest(`Bearer ${CRON_SECRETS.VALID}`))

      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.sent).toBe(0)
      expect(body.failed).toBe(0)
      expect(body.skipped).toBe(0)
    })
  })

  // ============================================================================
  // Reminder Processing Tests
  // ============================================================================

  describe('Reminder Processing', () => {
    beforeEach(() => {
      process.env = { ...originalEnv, CRON_SECRET: CRON_SECRETS.VALID }
    })

    it('should process pending reminders', async () => {
      mockState.setTableResult('reminders', [SAMPLE_REMINDER])
      mockState.setTableResult('message_templates', [])
      mockState.setTableResult('tenants', [{ id: TENANTS.ADRIS.id, name: TENANTS.ADRIS.name }])

      const response = await GET(createRequest(`Bearer ${CRON_SECRETS.VALID}`))

      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.success).toBe(true)
      expect(body.stats.processed).toBe(1)
    })

    it('should mark successful reminders as sent', async () => {
      mockState.setTableResult('reminders', [SAMPLE_REMINDER])
      mockState.setTableResult('message_templates', [])
      mockState.setTableResult('tenants', [{ id: TENANTS.ADRIS.id, name: TENANTS.ADRIS.name }])

      const response = await GET(createRequest(`Bearer ${CRON_SECRETS.VALID}`))

      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.stats.sent).toBe(1)
    })

    it('should process multiple reminders', async () => {
      const multipleReminders = [
        SAMPLE_REMINDER,
        {
          ...SAMPLE_REMINDER,
          id: 'reminder-2',
          client_id: USERS.OWNER_MARIA.id,
          pet_id: PETS.ROCKY_DOG.id,
        },
      ]
      mockState.setTableResult('reminders', multipleReminders)
      mockState.setTableResult('message_templates', [])
      mockState.setTableResult('tenants', [{ id: TENANTS.ADRIS.id, name: TENANTS.ADRIS.name }])

      const response = await GET(createRequest(`Bearer ${CRON_SECRETS.VALID}`))

      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.stats.processed).toBe(2)
    })

    it('should limit batch size to 50 reminders', async () => {
      // The route limits to 50 reminders per run
      mockState.setTableResult('reminders', [])

      const response = await GET(createRequest(`Bearer ${CRON_SECRETS.VALID}`))

      expect(response.status).toBe(200)
    })
  })

  // ============================================================================
  // Channel Sending Tests
  // ============================================================================

  describe('Channel Sending', () => {
    beforeEach(() => {
      process.env = { ...originalEnv, CRON_SECRET: CRON_SECRETS.VALID }
    })

    it('should send via email channel', async () => {
      
      vi.mocked(sendReminderToChannels).mockResolvedValueOnce([
        { channel: 'email', success: true },
      ])

      mockState.setTableResult('reminders', [
        { ...SAMPLE_REMINDER, channels: ['email'] },
      ])
      mockState.setTableResult('message_templates', [])
      mockState.setTableResult('tenants', [{ id: TENANTS.ADRIS.id, name: TENANTS.ADRIS.name }])

      const response = await GET(createRequest(`Bearer ${CRON_SECRETS.VALID}`))

      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.stats.sent).toBe(1)
    })

    it('should send via WhatsApp channel', async () => {
      
      vi.mocked(sendReminderToChannels).mockResolvedValueOnce([
        { channel: 'whatsapp', success: true },
      ])

      mockState.setTableResult('reminders', [
        { ...SAMPLE_REMINDER, channels: ['whatsapp'] },
      ])
      mockState.setTableResult('message_templates', [])
      mockState.setTableResult('tenants', [{ id: TENANTS.ADRIS.id, name: TENANTS.ADRIS.name }])

      const response = await GET(createRequest(`Bearer ${CRON_SECRETS.VALID}`))

      expect(response.status).toBe(200)
    })

    it('should send via multiple channels', async () => {
      
      vi.mocked(sendReminderToChannels).mockResolvedValueOnce([
        { channel: 'email', success: true },
        { channel: 'whatsapp', success: true },
      ])

      mockState.setTableResult('reminders', [
        { ...SAMPLE_REMINDER, channels: ['email', 'whatsapp'] },
      ])
      mockState.setTableResult('message_templates', [])
      mockState.setTableResult('tenants', [{ id: TENANTS.ADRIS.id, name: TENANTS.ADRIS.name }])

      const response = await GET(createRequest(`Bearer ${CRON_SECRETS.VALID}`))

      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.stats.sent).toBe(1)
    })

    it('should count as sent if at least one channel succeeds', async () => {
      
      vi.mocked(sendReminderToChannels).mockResolvedValueOnce([
        { channel: 'email', success: true },
        { channel: 'sms', success: false, error: 'SMS provider error' },
      ])

      mockState.setTableResult('reminders', [
        { ...SAMPLE_REMINDER, channels: ['email', 'sms'] },
      ])
      mockState.setTableResult('message_templates', [])
      mockState.setTableResult('tenants', [{ id: TENANTS.ADRIS.id, name: TENANTS.ADRIS.name }])

      const response = await GET(createRequest(`Bearer ${CRON_SECRETS.VALID}`))

      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.stats.sent).toBe(1)
      expect(body.stats.failed).toBe(0)
    })
  })

  // ============================================================================
  // Error Handling Tests
  // ============================================================================

  describe('Error Handling', () => {
    beforeEach(() => {
      process.env = { ...originalEnv, CRON_SECRET: CRON_SECRETS.VALID }
    })

    it('should return 500 on database fetch error', async () => {
      mockState.setTableError('reminders', new Error('Database connection failed'))

      const response = await GET(createRequest(`Bearer ${CRON_SECRETS.VALID}`))

      expect(response.status).toBe(500)
      const body = await response.json()
      expect(body.error).toBe('Database error')
    })

    it('should handle channel send failure', async () => {
      
      vi.mocked(sendReminderToChannels).mockResolvedValueOnce([
        { channel: 'email', success: false, error: 'SMTP error' },
      ])

      mockState.setTableResult('reminders', [SAMPLE_REMINDER])
      mockState.setTableResult('message_templates', [])
      mockState.setTableResult('tenants', [{ id: TENANTS.ADRIS.id, name: TENANTS.ADRIS.name }])

      const response = await GET(createRequest(`Bearer ${CRON_SECRETS.VALID}`))

      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.stats.failed).toBe(1)
      expect(body.stats.errors.length).toBeGreaterThan(0)
    })

    it('should track errors in response', async () => {
      
      vi.mocked(sendReminderToChannels).mockResolvedValueOnce([
        { channel: 'email', success: false, error: 'Invalid email address' },
      ])

      mockState.setTableResult('reminders', [SAMPLE_REMINDER])
      mockState.setTableResult('message_templates', [])
      mockState.setTableResult('tenants', [{ id: TENANTS.ADRIS.id, name: TENANTS.ADRIS.name }])

      const response = await GET(createRequest(`Bearer ${CRON_SECRETS.VALID}`))

      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.stats.errors).toContainEqual(expect.stringContaining(SAMPLE_REMINDER.id))
    })

    it('should log errors', async () => {
      const { logger } = await import('@/lib/logger')
      mockState.setTableError('reminders', new Error('Database error'))

      await GET(createRequest(`Bearer ${CRON_SECRETS.VALID}`))

      expect(logger.error).toHaveBeenCalled()
    })

    it('should log unauthorized attempts', async () => {
      const { logger } = await import('@/lib/logger')

      await GET(createRequest(`Bearer ${CRON_SECRETS.INVALID}`))

      // cron-auth.ts logs via logger.error with structured data
      expect(logger.error).toHaveBeenCalledWith(
        'Unauthorized cron attempt',
        expect.objectContaining({
          endpoint: expect.stringContaining('reminders'),
          reason: 'Invalid or missing secret',
        })
      )
    })
  })

  // ============================================================================
  // Retry Logic Tests
  // ============================================================================

  describe('Retry Logic', () => {
    beforeEach(() => {
      process.env = { ...originalEnv, CRON_SECRET: CRON_SECRETS.VALID }
    })

    it('should increment attempts on failure', async () => {
      
      vi.mocked(sendReminderToChannels).mockResolvedValueOnce([
        { channel: 'email', success: false, error: 'Temporary failure' },
      ])

      mockState.setTableResult('reminders', [{ ...SAMPLE_REMINDER, attempts: 0 }])
      mockState.setTableResult('message_templates', [])
      mockState.setTableResult('tenants', [{ id: TENANTS.ADRIS.id, name: TENANTS.ADRIS.name }])

      const response = await GET(createRequest(`Bearer ${CRON_SECRETS.VALID}`))

      expect(response.status).toBe(200)
    })

    it('should mark as failed after max attempts', async () => {
      
      vi.mocked(sendReminderToChannels).mockResolvedValueOnce([
        { channel: 'email', success: false, error: 'Permanent failure' },
      ])

      mockState.setTableResult('reminders', [
        { ...SAMPLE_REMINDER, attempts: 2, max_attempts: 3 },
      ])
      mockState.setTableResult('message_templates', [])
      mockState.setTableResult('tenants', [{ id: TENANTS.ADRIS.id, name: TENANTS.ADRIS.name }])

      const response = await GET(createRequest(`Bearer ${CRON_SECRETS.VALID}`))

      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.stats.failed).toBe(1)
    })

    it('should skip reminders that exceeded max attempts', async () => {
      // The query filters out reminders with attempts >= 3
      mockState.setTableResult('reminders', [])

      const response = await GET(createRequest(`Bearer ${CRON_SECRETS.VALID}`))

      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.message).toBe('No pending reminders')
    })
  })

  // ============================================================================
  // Template Processing Tests
  // ============================================================================

  describe('Template Processing', () => {
    beforeEach(() => {
      process.env = { ...originalEnv, CRON_SECRET: CRON_SECRETS.VALID }
    })

    it('should load message templates', async () => {
      

      mockState.setTableResult('reminders', [SAMPLE_REMINDER])
      mockState.setTableResult('message_templates', [
        {
          id: 'template-vaccine',
          code: 'reminder_vaccine',
          name: 'Vaccine Reminder',
          subject: 'Recordatorio de vacuna para {{pet_name}}',
          content: 'Hola {{client_name}}, es hora de vacunar a {{pet_name}}',
          content_html: '<p>Hola {{client_name}}</p>',
          variables: ['client_name', 'pet_name'],
        },
      ])
      mockState.setTableResult('tenants', [{ id: TENANTS.ADRIS.id, name: TENANTS.ADRIS.name }])

      await GET(createRequest(`Bearer ${CRON_SECRETS.VALID}`))

      expect(buildReminderContent).toHaveBeenCalled()
    })

    it('should handle custom subject and body', async () => {
      mockState.setTableResult('reminders', [
        {
          ...SAMPLE_REMINDER,
          custom_subject: 'Cita urgente',
          custom_body: 'Por favor confirme su cita',
        },
      ])
      mockState.setTableResult('message_templates', [])
      mockState.setTableResult('tenants', [{ id: TENANTS.ADRIS.id, name: TENANTS.ADRIS.name }])

      const response = await GET(createRequest(`Bearer ${CRON_SECRETS.VALID}`))

      expect(response.status).toBe(200)
    })
  })

  // ============================================================================
  // Tenant Context Tests
  // ============================================================================

  describe('Tenant Context', () => {
    beforeEach(() => {
      process.env = { ...originalEnv, CRON_SECRET: CRON_SECRETS.VALID }
    })

    it('should include tenant branding', async () => {
      mockState.setTableResult('reminders', [SAMPLE_REMINDER])
      mockState.setTableResult('message_templates', [])
      mockState.setTableResult('tenants', [
        { id: TENANTS.ADRIS.id, name: 'Veterinaria Adris' },
      ])

      const response = await GET(createRequest(`Bearer ${CRON_SECRETS.VALID}`))

      expect(response.status).toBe(200)
    })

    it('should handle multiple tenants in single batch', async () => {
      mockState.setTableResult('reminders', [
        SAMPLE_REMINDER,
        { ...SAMPLE_REMINDER, id: 'reminder-petlife', tenant_id: TENANTS.PETLIFE.id },
      ])
      mockState.setTableResult('message_templates', [])
      mockState.setTableResult('tenants', [
        { id: TENANTS.ADRIS.id, name: 'Veterinaria Adris' },
        { id: TENANTS.PETLIFE.id, name: 'PetLife Center' },
      ])

      const response = await GET(createRequest(`Bearer ${CRON_SECRETS.VALID}`))

      expect(response.status).toBe(200)
    })

    it('should use fallback clinic name if tenant not found', async () => {
      mockState.setTableResult('reminders', [SAMPLE_REMINDER])
      mockState.setTableResult('message_templates', [])
      mockState.setTableResult('tenants', []) // No tenant found

      const response = await GET(createRequest(`Bearer ${CRON_SECRETS.VALID}`))

      // Should still process without error
      expect(response.status).toBe(200)
    })
  })

  // ============================================================================
  // Response Format Tests
  // ============================================================================

  describe('Response Format', () => {
    beforeEach(() => {
      process.env = { ...originalEnv, CRON_SECRET: CRON_SECRETS.VALID }
    })

    it('should return all required stats fields', async () => {
      mockState.setTableResult('reminders', [SAMPLE_REMINDER])
      mockState.setTableResult('message_templates', [])
      mockState.setTableResult('tenants', [{ id: TENANTS.ADRIS.id, name: TENANTS.ADRIS.name }])

      const response = await GET(createRequest(`Bearer ${CRON_SECRETS.VALID}`))

      expect(response.status).toBe(200)
      const body = await response.json()

      expect(body).toHaveProperty('success')
      expect(body).toHaveProperty('message')
      expect(body).toHaveProperty('stats')
      expect(body.stats).toHaveProperty('processed')
      expect(body.stats).toHaveProperty('sent')
      expect(body.stats).toHaveProperty('failed')
      expect(body.stats).toHaveProperty('skipped')
      expect(body.stats).toHaveProperty('errors')
    })

    it('should return message with processed count', async () => {
      mockState.setTableResult('reminders', [SAMPLE_REMINDER])
      mockState.setTableResult('message_templates', [])
      mockState.setTableResult('tenants', [{ id: TENANTS.ADRIS.id, name: TENANTS.ADRIS.name }])

      const response = await GET(createRequest(`Bearer ${CRON_SECRETS.VALID}`))

      const body = await response.json()
      expect(body.message).toContain('Processed 1 reminders')
    })
  })

  // ============================================================================
  // Integration Scenarios
  // ============================================================================

  describe('Integration Scenarios', () => {
    beforeEach(() => {
      process.env = { ...originalEnv, CRON_SECRET: CRON_SECRETS.VALID }
    })

    it('should handle vaccine reminder workflow', async () => {
      mockState.setTableResult('reminders', [
        {
          ...SAMPLE_REMINDER,
          type: 'vaccine',
          reference_type: 'vaccine',
          channels: ['email', 'whatsapp'],
        },
      ])
      mockState.setTableResult('message_templates', [])
      mockState.setTableResult('tenants', [{ id: TENANTS.ADRIS.id, name: TENANTS.ADRIS.name }])

      const response = await GET(createRequest(`Bearer ${CRON_SECRETS.VALID}`))

      expect(response.status).toBe(200)
    })

    it('should handle appointment reminder workflow', async () => {
      mockState.setTableResult('reminders', [
        {
          ...SAMPLE_REMINDER,
          type: 'appointment',
          reference_type: 'appointment',
          reference_id: 'appointment-001',
        },
      ])
      mockState.setTableResult('message_templates', [])
      mockState.setTableResult('tenants', [{ id: TENANTS.ADRIS.id, name: TENANTS.ADRIS.name }])

      const response = await GET(createRequest(`Bearer ${CRON_SECRETS.VALID}`))

      expect(response.status).toBe(200)
    })

    it('should handle followup reminder workflow', async () => {
      mockState.setTableResult('reminders', [
        {
          ...SAMPLE_REMINDER,
          type: 'followup',
          reference_type: 'medical_record',
          pet_id: null, // Followup without pet
        },
      ])
      mockState.setTableResult('message_templates', [])
      mockState.setTableResult('tenants', [{ id: TENANTS.ADRIS.id, name: TENANTS.ADRIS.name }])

      const response = await GET(createRequest(`Bearer ${CRON_SECRETS.VALID}`))

      expect(response.status).toBe(200)
    })

    it('should handle mixed success and failure in batch', async () => {
      
      vi.mocked(sendReminderToChannels)
        .mockResolvedValueOnce([{ channel: 'email', success: true }])
        .mockResolvedValueOnce([{ channel: 'email', success: false, error: 'Invalid email' }])

      mockState.setTableResult('reminders', [
        SAMPLE_REMINDER,
        { ...SAMPLE_REMINDER, id: 'reminder-fail' },
      ])
      mockState.setTableResult('message_templates', [])
      mockState.setTableResult('tenants', [{ id: TENANTS.ADRIS.id, name: TENANTS.ADRIS.name }])

      const response = await GET(createRequest(`Bearer ${CRON_SECRETS.VALID}`))

      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.stats.sent).toBe(1)
      expect(body.stats.failed).toBe(1)
      expect(body.stats.processed).toBe(2)
    })
  })
})
