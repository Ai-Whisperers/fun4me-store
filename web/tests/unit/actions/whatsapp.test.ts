import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { TENANT_IDS } from '@/lib/constants/tenants';

// Mock the Supabase client
const mockSupabaseClient = {
  auth: {
    getUser: vi.fn(),
  },
  from: vi.fn(),
}

const createMockChain = (data: unknown, error: unknown = null) => ({
  select: vi.fn().mockReturnThis(),
  insert: vi.fn().mockResolvedValue({ data, error }),
  update: vi.fn().mockReturnThis(),
  delete: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  gte: vi.fn().mockReturnThis(),
  order: vi.fn().mockReturnThis(),
  limit: vi.fn().mockReturnThis(),
  single: vi.fn().mockResolvedValue({ data, error }),
})

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => Promise.resolve(mockSupabaseClient)),
}))

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

vi.mock('@/lib/logger', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
  },
}))

// Mock WhatsApp client
vi.mock('@/lib/whatsapp/client', () => ({
  sendWhatsAppMessage: vi.fn().mockResolvedValue({ success: true, sid: 'SM123' }),
}))

// Import after mocking
import {
  getConversations,
  getMessages,
  sendMessage,
  getTemplates,
  createTemplate,
  deleteTemplate,
} from '@/app/actions/whatsapp'

describe('WhatsApp Server Actions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('getConversations', () => {
    it('should return error when user is not authenticated', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      })

      const result = await getConversations('terrapet')

      expect('error' in result).toBe(true)
      if ('error' in result) {
        expect(result.error).toContain('autorizado')
      }
    })

    it('should return error when user is not staff', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      })

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'profiles') {
          return createMockChain({ role: 'owner', tenant_id: TENANT_IDS.ADRIS })
        }
        return createMockChain(null)
      })

      const result = await getConversations('terrapet')

      expect('error' in result).toBe(true)
      if ('error' in result) {
        expect(result.error).toContain('autorizado')
      }
    })

    it('should return error when user is from different tenant', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      })

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'profiles') {
          return createMockChain({ role: 'vet', tenant_id: 'other-clinic' })
        }
        return createMockChain(null)
      })

      const result = await getConversations('terrapet')

      expect('error' in result).toBe(true)
      if ('error' in result) {
        expect(result.error).toContain('autorizado')
      }
    })
  })

  describe('getMessages', () => {
    it('should return error when user is not authenticated', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      })

      const result = await getMessages('terrapet', '+595981123456')

      expect('error' in result).toBe(true)
      if ('error' in result) {
        expect(result.error).toContain('autorizado')
      }
    })

    it('should return error when user is not staff', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      })

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'profiles') {
          return createMockChain({ role: 'owner', tenant_id: TENANT_IDS.ADRIS })
        }
        return createMockChain(null)
      })

      const result = await getMessages('terrapet', '+595981123456')

      expect('error' in result).toBe(true)
      if ('error' in result) {
        expect(result.error).toContain('autorizado')
      }
    })
  })

  describe('sendMessage', () => {
    it('should return error when user is not authenticated', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      })

      const formData = new FormData()
      formData.set('phone', '+595981123456')
      formData.set('message', 'Test message')

      const result = await sendMessage(formData)

      expect(result.success).toBe(false)
      expect(result.error).toContain('autorizado')
    })

    it('should return error when user is not staff', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      })

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'profiles') {
          return createMockChain({ role: 'owner', tenant_id: TENANT_IDS.ADRIS })
        }
        return createMockChain(null)
      })

      const formData = new FormData()
      formData.set('phone', '+595981123456')
      formData.set('message', 'Test message')

      const result = await sendMessage(formData)

      expect(result.success).toBe(false)
      expect(result.error).toContain('personal')
    })

    it('should return error when phone is missing', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      })

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'profiles') {
          return createMockChain({ role: 'vet', tenant_id: TENANT_IDS.ADRIS })
        }
        return createMockChain(null)
      })

      const formData = new FormData()
      // Missing phone
      formData.set('message', 'Test message')

      const result = await sendMessage(formData)

      expect(result.success).toBe(false)
      expect(result.error).toContain('requeridos')
    })

    it('should return error when message is missing', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      })

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'profiles') {
          return createMockChain({ role: 'vet', tenant_id: TENANT_IDS.ADRIS })
        }
        return createMockChain(null)
      })

      const formData = new FormData()
      formData.set('phone', '+595981123456')
      // Missing message

      const result = await sendMessage(formData)

      expect(result.success).toBe(false)
      expect(result.error).toContain('requeridos')
    })
  })

  describe('getTemplates', () => {
    it('should return error when user is not authenticated', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      })

      const result = await getTemplates('terrapet')

      expect('error' in result).toBe(true)
      if ('error' in result) {
        expect(result.error).toContain('autorizado')
      }
    })

    it('should return error when user is not staff', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      })

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'profiles') {
          return createMockChain({ role: 'owner', tenant_id: TENANT_IDS.ADRIS })
        }
        return createMockChain(null)
      })

      const result = await getTemplates('terrapet')

      expect('error' in result).toBe(true)
      if ('error' in result) {
        expect(result.error).toContain('autorizado')
      }
    })
  })

  describe('createTemplate', () => {
    it('should return error when user is not authenticated', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      })

      const formData = new FormData()
      formData.set('name', 'Test Template')
      formData.set('content', 'Hello {{name}}!')

      const result = await createTemplate(formData)

      expect(result.success).toBe(false)
      expect(result.error).toContain('autorizado')
    })

    it('should return error when user is not admin', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      })

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'profiles') {
          return createMockChain({ role: 'vet', tenant_id: TENANT_IDS.ADRIS }) // Vet, not admin
        }
        return createMockChain(null)
      })

      const formData = new FormData()
      formData.set('name', 'Test Template')
      formData.set('content', 'Hello {{name}}!')

      const result = await createTemplate(formData)

      expect(result.success).toBe(false)
      expect(result.error).toContain('administradores')
    })

    it('should return error when name is missing', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      })

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'profiles') {
          return createMockChain({ role: 'admin', tenant_id: TENANT_IDS.ADRIS })
        }
        return createMockChain(null)
      })

      const formData = new FormData()
      // Missing name
      formData.set('content', 'Hello {{name}}!')

      const result = await createTemplate(formData)

      expect(result.success).toBe(false)
      expect(result.error).toContain('requeridos')
    })

    it('should return error when content is missing', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      })

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'profiles') {
          return createMockChain({ role: 'admin', tenant_id: TENANT_IDS.ADRIS })
        }
        return createMockChain(null)
      })

      const formData = new FormData()
      formData.set('name', 'Test Template')
      // Missing content

      const result = await createTemplate(formData)

      expect(result.success).toBe(false)
      expect(result.error).toContain('requeridos')
    })
  })

  describe('deleteTemplate', () => {
    it('should return error when user is not authenticated', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      })

      const result = await deleteTemplate('template-123')

      expect(result.success).toBe(false)
      expect(result.error).toContain('autorizado')
    })

    it('should return error when user is not admin', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      })

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'profiles') {
          return createMockChain({ role: 'vet', tenant_id: TENANT_IDS.ADRIS }) // Vet, not admin
        }
        return createMockChain(null)
      })

      const result = await deleteTemplate('template-123')

      expect(result.success).toBe(false)
      expect(result.error).toContain('administradores')
    })
  })
})
