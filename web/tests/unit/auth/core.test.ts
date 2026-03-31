import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock drizzle and db - Drizzle returns camelCase fields
vi.mock('@/db', () => ({
  db: {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          limit: vi.fn(() =>
            Promise.resolve([
              {
                id: 'user-123',
                role: 'admin',
                tenantId: 'terrapet',
                fullName: 'Test User',
                email: 'test@example.com',
                phone: null,
                avatarUrl: null,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              },
            ])
          ),
        })),
      })),
    })),
  },
}))

vi.mock('@/db/schema', () => ({
  profiles: {
    id: 'id',
  },
}))

// Mock supabase
const mockSupabase = {
  auth: {
    getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-123' } }, error: null }),
  },
}

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => Promise.resolve(mockSupabase)),
}))

import { AuthService } from '@/lib/auth/core'

describe('AuthService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should successfully get context with Drizzle', async () => {
    const context = await AuthService.getContext()
    expect(context.isAuthenticated).toBe(true)
    expect(context.profile?.role).toBe('admin')
  })
})
