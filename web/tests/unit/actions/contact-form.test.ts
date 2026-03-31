import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('@/lib/logger', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
  },
}))

// Mock next/headers for rate limiting
vi.mock('next/headers', () => ({
  headers: vi.fn(async () => ({
    get: vi.fn((name: string) => {
      if (name === 'x-forwarded-for') return '192.168.1.100'
      if (name === 'x-real-ip') return '192.168.1.100'
      return null
    }),
  })),
}))

// Mock action rate limiting to always allow
vi.mock('@/lib/auth/action-rate-limit', () => ({
  checkActionRateLimit: vi.fn(async () => ({ success: true, remaining: 5, retryAfter: 0 })),
  ACTION_RATE_LIMITS: {
    contactForm: { type: 'auth' },
    foundPetReport: { type: 'refund' },
  },
  clearActionRateLimits: vi.fn(),
}))

// Import after mocking
import { submitContactForm } from '@/app/actions/contact-form'

describe('Contact Form Server Action', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.resetAllMocks()
    vi.useRealTimers()
  })

  describe('submitContactForm', () => {
    it('should return error when name is missing', async () => {
      const formData = new FormData()
      formData.set('name', '')
      formData.set('phone', '0981123456')
      formData.set('petName', 'Firulais')
      formData.set('reason', 'Consulta general')

      const resultPromise = submitContactForm(null, formData)
      vi.runAllTimers()
      const result = await resultPromise

      expect(result?.success).toBe(false)
      if (result && !result.success) {
        expect(result.error).toContain('nombre')
      }
    })

    it('should return error when phone is missing', async () => {
      const formData = new FormData()
      formData.set('name', 'Test Client')
      formData.set('phone', '')
      formData.set('petName', 'Firulais')
      formData.set('reason', 'Consulta general')

      const resultPromise = submitContactForm(null, formData)
      vi.runAllTimers()
      const result = await resultPromise

      expect(result?.success).toBe(false)
      if (result && !result.success) {
        expect(result.error).toContain('teléfono')
      }
    })

    it('should return error when petName is missing', async () => {
      const formData = new FormData()
      formData.set('name', 'Test Client')
      formData.set('phone', '0981123456')
      formData.set('petName', '')
      formData.set('reason', 'Consulta general')

      const resultPromise = submitContactForm(null, formData)
      vi.runAllTimers()
      const result = await resultPromise

      expect(result?.success).toBe(false)
      if (result && !result.success) {
        expect(result.error).toContain('mascota')
      }
    })

    it('should return error when reason is missing', async () => {
      const formData = new FormData()
      formData.set('name', 'Test Client')
      formData.set('phone', '0981123456')
      formData.set('petName', 'Firulais')
      formData.set('reason', '')

      const resultPromise = submitContactForm(null, formData)
      vi.runAllTimers()
      const result = await resultPromise

      expect(result?.success).toBe(false)
      if (result && !result.success) {
        expect(result.error).toContain('motivo')
      }
    })

    it('should succeed with valid form data', async () => {
      const formData = new FormData()
      formData.set('name', 'Test Client')
      formData.set('phone', '0981123456')
      formData.set('petName', 'Firulais')
      formData.set('reason', 'Consulta general')

      const resultPromise = submitContactForm(null, formData)
      // Use advanceTimersToNextTimerAsync to properly handle async operations
      await vi.advanceTimersToNextTimerAsync()
      await vi.advanceTimersToNextTimerAsync()
      const result = await resultPromise

      expect(result?.success).toBe(true)
      if (result && result.success) {
        expect(result.message).toContain('Gracias')
      }
    })
  })
})
