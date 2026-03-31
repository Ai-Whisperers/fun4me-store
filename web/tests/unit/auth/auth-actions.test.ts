import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock the supabase server client
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

// Mock next/cache
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

// Mock next/navigation
vi.mock('next/navigation', () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`)
  }),
}))

// Mock next/headers
vi.mock('next/headers', () => ({
  headers: vi.fn().mockResolvedValue({
    get: vi.fn((key) => {
      if (key === 'x-forwarded-for') return '127.0.0.1'
      return null
    }),
  }),
}))

import { createClient } from '@/lib/supabase/server'
import { requestPasswordReset, updatePassword } from '@/app/auth/actions'

describe('Auth Actions', () => {
  const mockSupabase = {
    auth: {
      resetPasswordForEmail: vi.fn(),
      updateUser: vi.fn(),
    },
  }

  beforeEach(() => {
    vi.clearAllMocks()
    ;(createClient as ReturnType<typeof vi.fn>).mockResolvedValue(mockSupabase)
  })

  describe('requestPasswordReset', () => {
    it('returns error when email is empty', async () => {
      const formData = new FormData()
      formData.append('email', '')
      formData.append('clinic', 'terrapet')

      const result = await requestPasswordReset(null, formData)

      expect(result).toEqual({ error: 'El correo electrónico es requerido' })
      expect(mockSupabase.auth.resetPasswordForEmail).not.toHaveBeenCalled()
    })

    it('returns success even when email does not exist (security)', async () => {
      mockSupabase.auth.resetPasswordForEmail.mockResolvedValue({
        error: { message: 'User not found' },
      })

      const formData = new FormData()
      formData.append('email', 'nonexistent@example.com')
      formData.append('clinic', 'terrapet')

      const result = await requestPasswordReset(null, formData)

      // Should always return success to prevent email enumeration
      expect(result).toEqual({ success: true })
    })

    it('calls resetPasswordForEmail with correct redirect URL', async () => {
      mockSupabase.auth.resetPasswordForEmail.mockResolvedValue({ error: null })

      const formData = new FormData()
      formData.append('email', 'user@example.com')
      formData.append('clinic', 'terrapet')

      await requestPasswordReset(null, formData)

      expect(mockSupabase.auth.resetPasswordForEmail).toHaveBeenCalledWith(
        'user@example.com',
        expect.objectContaining({
          redirectTo: expect.stringContaining('/terrapet/portal/reset-password'),
        })
      )
    })

    it('returns success on successful password reset request', async () => {
      mockSupabase.auth.resetPasswordForEmail.mockResolvedValue({ error: null })

      const formData = new FormData()
      formData.append('email', 'user@example.com')
      formData.append('clinic', 'terrapet')

      const result = await requestPasswordReset(null, formData)

      expect(result).toEqual({ success: true })
    })
  })

  describe('updatePassword', () => {
    it('returns error when password is too short', async () => {
      const formData = new FormData()
      formData.append('password', '1234567')
      formData.append('confirmPassword', '1234567')

      const result = await updatePassword(null, formData)

      expect(result).toEqual({
        error: 'La contraseña debe tener al menos 8 caracteres',
      })
      expect(mockSupabase.auth.updateUser).not.toHaveBeenCalled()
    })

    it('returns error when password is empty', async () => {
      const formData = new FormData()
      formData.append('password', '')
      formData.append('confirmPassword', '')

      const result = await updatePassword(null, formData)

      expect(result).toEqual({
        error: 'La contraseña debe tener al menos 8 caracteres',
      })
    })

    it('returns error when passwords do not match', async () => {
      const formData = new FormData()
      formData.append('password', 'password123')
      formData.append('confirmPassword', 'password456')

      const result = await updatePassword(null, formData)

      expect(result).toEqual({ error: 'Las contraseñas no coinciden' })
      expect(mockSupabase.auth.updateUser).not.toHaveBeenCalled()
    })

    it('returns error when updateUser fails', async () => {
      mockSupabase.auth.updateUser.mockResolvedValue({
        error: { message: 'Token expired' },
      })

      const formData = new FormData()
      formData.append('password', 'newpassword123')
      formData.append('confirmPassword', 'newpassword123')

      const result = await updatePassword(null, formData)

      expect(result).toEqual({
        error: 'Error al actualizar la contraseña. El enlace puede haber expirado.',
      })
    })

    it('returns success when password is updated', async () => {
      mockSupabase.auth.updateUser.mockResolvedValue({ error: null })

      const formData = new FormData()
      formData.append('password', 'newpassword123')
      formData.append('confirmPassword', 'newpassword123')

      const result = await updatePassword(null, formData)

      expect(result).toEqual({ success: true })
      expect(mockSupabase.auth.updateUser).toHaveBeenCalledWith({
        password: 'newpassword123',
      })
    })

    it('accepts password exactly 8 characters', async () => {
      mockSupabase.auth.updateUser.mockResolvedValue({ error: null })

      const formData = new FormData()
      formData.append('password', '12345678')
      formData.append('confirmPassword', '12345678')

      const result = await updatePassword(null, formData)

      expect(result).toEqual({ success: true })
    })
  })
})
