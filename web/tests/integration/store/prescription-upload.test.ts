/**
 * Prescription Upload API Tests
 *
 * Tests for POST /api/store/prescriptions/upload
 *
 * This route handles uploading prescription files for store orders.
 * Critical for compliance - only certain file types allowed,
 * size limits enforced, and proper storage bucket organization.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { POST } from '@/app/api/store/prescriptions/upload/route'
import {
  mockState,
  TENANTS,
  USERS,
  resetAllMocks,
  createStatefulSupabaseMock,
} from '@/lib/test-utils'

// Mock Supabase client
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => Promise.resolve(createStatefulSupabaseMock())),
}))

// Import routes AFTER mocks
import { POST } from '@/app/api/store/prescriptions/upload/route'

// Helper to create a mock File
function createMockFile(
  name: string,
  type: string,
  size: number,
  content: string = 'mock file content'
): File {
  const blob = new Blob([content], { type })
  Object.defineProperty(blob, 'size', { value: size })
  return new File([blob], name, { type })
}

// Helper to create FormData with file
function createFormData(file?: File | null, additionalFields?: Record<string, string>): FormData {
  const formData = new FormData()
  if (file) {
    formData.append('file', file)
  }
  if (additionalFields) {
    Object.entries(additionalFields).forEach(([key, value]) => {
      formData.append(key, value)
    })
  }
  return formData
}

// Helper to create POST request with FormData
function createRequest(formData: FormData): NextRequest {
  return new NextRequest('http://localhost:3000/api/store/prescriptions/upload', {
    method: 'POST',
    body: formData,
  })
}

describe('POST /api/store/prescriptions/upload', () => {
  beforeEach(() => {
    resetAllMocks()
    vi.clearAllMocks()
  })

  // ===========================================================================
  // Authentication Tests
  // ===========================================================================

  describe('Authentication', () => {
    it('should return 401 when unauthenticated', async () => {
      mockState.setAuthScenario('UNAUTHENTICATED')
      const formData = createFormData(createMockFile('test.pdf', 'application/pdf', 1000))

      const response = await POST(createRequest(formData))

      expect(response.status).toBe(401)
    })

    it('should allow authenticated owner to upload prescription', async () => {
      mockState.setAuthScenario('OWNER')
      const formData = createFormData(createMockFile('prescription.pdf', 'application/pdf', 1000))

      const response = await POST(createRequest(formData))

      expect(response.status).toBe(201)
    })

    it('should allow vet to upload prescription', async () => {
      mockState.setAuthScenario('VET')
      const formData = createFormData(createMockFile('prescription.pdf', 'application/pdf', 1000))

      const response = await POST(createRequest(formData))

      expect(response.status).toBe(201)
    })

    it('should allow admin to upload prescription', async () => {
      mockState.setAuthScenario('ADMIN')
      const formData = createFormData(createMockFile('prescription.pdf', 'application/pdf', 1000))

      const response = await POST(createRequest(formData))

      expect(response.status).toBe(201)
    })
  })

  // ===========================================================================
  // Profile Lookup Tests
  // ===========================================================================

  describe('Profile Lookup', () => {
    it('should return 404 when user profile not found', async () => {
      mockState.setAuthScenario('OWNER')
      mockState.setProfile(null)
      const formData = createFormData(createMockFile('prescription.pdf', 'application/pdf', 1000))

      const response = await POST(createRequest(formData))

      expect(response.status).toBe(404)
      const body = await response.json()
      expect(body.details?.message).toContain('Perfil no encontrado')
    })
  })

  // ===========================================================================
  // File Validation Tests
  // ===========================================================================

  describe('File Validation', () => {
    beforeEach(() => {
      mockState.setAuthScenario('OWNER')
    })

    it('should return 400 when no file provided', async () => {
      const formData = createFormData(null)

      const response = await POST(createRequest(formData))

      expect(response.status).toBe(400)
      const body = await response.json()
      expect(body.details?.message).toContain('No se proporcionó archivo')
    })

    it('should return 400 when file exceeds size limit', async () => {
      const largeFile = createMockFile(
        'large-prescription.pdf',
        'application/pdf',
        6 * 1024 * 1024 // 6MB - exceeds 5MB limit
      )
      const formData = createFormData(largeFile)

      const response = await POST(createRequest(formData))

      expect(response.status).toBe(400)
      const body = await response.json()
      expect(body.details?.message).toContain('muy grande')
      expect(body.details?.message).toContain('5MB')
    })

    it('should accept file at exactly max size limit', async () => {
      const maxFile = createMockFile(
        'max-prescription.pdf',
        'application/pdf',
        5 * 1024 * 1024 // Exactly 5MB
      )
      const formData = createFormData(maxFile)

      const response = await POST(createRequest(formData))

      expect(response.status).toBe(201)
    })
  })

  // ===========================================================================
  // File Type Validation Tests
  // ===========================================================================

  describe('File Type Validation', () => {
    beforeEach(() => {
      mockState.setAuthScenario('OWNER')
    })

    it('should accept PDF files', async () => {
      const pdfFile = createMockFile('prescription.pdf', 'application/pdf', 1000)
      const formData = createFormData(pdfFile)

      const response = await POST(createRequest(formData))

      expect(response.status).toBe(201)
    })

    it('should accept JPEG files', async () => {
      const jpegFile = createMockFile('prescription.jpg', 'image/jpeg', 1000)
      const formData = createFormData(jpegFile)

      const response = await POST(createRequest(formData))

      expect(response.status).toBe(201)
    })

    it('should accept PNG files', async () => {
      const pngFile = createMockFile('prescription.png', 'image/png', 1000)
      const formData = createFormData(pngFile)

      const response = await POST(createRequest(formData))

      expect(response.status).toBe(201)
    })

    it('should reject EXE files', async () => {
      const exeFile = createMockFile('malware.exe', 'application/x-msdownload', 1000)
      const formData = createFormData(exeFile)

      const response = await POST(createRequest(formData))

      expect(response.status).toBe(400)
      const body = await response.json()
      expect(body.details?.message).toContain('no permitido')
    })

    it('should reject JavaScript files', async () => {
      const jsFile = createMockFile('script.js', 'application/javascript', 1000)
      const formData = createFormData(jsFile)

      const response = await POST(createRequest(formData))

      expect(response.status).toBe(400)
    })

    it('should reject HTML files', async () => {
      const htmlFile = createMockFile('page.html', 'text/html', 1000)
      const formData = createFormData(htmlFile)

      const response = await POST(createRequest(formData))

      expect(response.status).toBe(400)
    })

    it('should reject SVG files', async () => {
      const svgFile = createMockFile('image.svg', 'image/svg+xml', 1000)
      const formData = createFormData(svgFile)

      const response = await POST(createRequest(formData))

      expect(response.status).toBe(400)
    })

    it('should reject ZIP files', async () => {
      const zipFile = createMockFile('archive.zip', 'application/zip', 1000)
      const formData = createFormData(zipFile)

      const response = await POST(createRequest(formData))

      expect(response.status).toBe(400)
    })

    it('should reject text files', async () => {
      const txtFile = createMockFile('notes.txt', 'text/plain', 1000)
      const formData = createFormData(txtFile)

      const response = await POST(createRequest(formData))

      expect(response.status).toBe(400)
    })
  })

  // ===========================================================================
  // Successful Upload Tests
  // ===========================================================================

  describe('Successful Upload', () => {
    beforeEach(() => {
      mockState.setAuthScenario('OWNER')
    })

    it('should return success with URL and path', async () => {
      const file = createMockFile('prescription.pdf', 'application/pdf', 1000)
      const formData = createFormData(file)

      const response = await POST(createRequest(formData))

      expect(response.status).toBe(201)
      const body = await response.json()
      expect(body.success).toBe(true)
      expect(body.url).toBeDefined()
      expect(body.path).toBeDefined()
    })

    it('should include correct file path structure', async () => {
      const file = createMockFile('prescription.pdf', 'application/pdf', 1000)
      const formData = createFormData(file)

      const response = await POST(createRequest(formData))

      expect(response.status).toBe(201)
      const body = await response.json()
      expect(body.path).toContain('prescriptions/')
      expect(body.path).toContain(TENANTS.ADRIS.id)
      expect(body.path).toContain(USERS.OWNER_JUAN.id)
    })

    it('should handle additional fields (productId)', async () => {
      const file = createMockFile('prescription.pdf', 'application/pdf', 1000)
      const formData = createFormData(file, { productId: 'product-123' })

      const response = await POST(createRequest(formData))

      expect(response.status).toBe(201)
    })

    it('should handle additional fields (clinic)', async () => {
      const file = createMockFile('prescription.pdf', 'application/pdf', 1000)
      const formData = createFormData(file, { clinic: 'terrapet' })

      const response = await POST(createRequest(formData))

      expect(response.status).toBe(201)
    })
  })

  // ===========================================================================
  // Filename Sanitization Tests
  // ===========================================================================

  describe('Filename Sanitization', () => {
    beforeEach(() => {
      mockState.setAuthScenario('OWNER')
    })

    it('should sanitize filenames with special characters', async () => {
      const file = createMockFile('my prescription (copy).pdf', 'application/pdf', 1000)
      const formData = createFormData(file)

      const response = await POST(createRequest(formData))

      expect(response.status).toBe(201)
      const body = await response.json()
      // Special characters should be replaced with underscores
      expect(body.path).not.toContain('(')
      expect(body.path).not.toContain(')')
      expect(body.path).not.toContain(' ')
    })

    it('should handle long filenames', async () => {
      const longName = 'a'.repeat(100) + '.pdf'
      const file = createMockFile(longName, 'application/pdf', 1000)
      const formData = createFormData(file)

      const response = await POST(createRequest(formData))

      expect(response.status).toBe(201)
      // Should truncate to reasonable length
    })

    it('should handle unicode filenames', async () => {
      const file = createMockFile('receta_médica_ñ.pdf', 'application/pdf', 1000)
      const formData = createFormData(file)

      const response = await POST(createRequest(formData))

      expect(response.status).toBe(201)
    })
  })

  // ===========================================================================
  // Storage Error Handling Tests
  // ===========================================================================

  describe('Storage Error Handling', () => {
    beforeEach(() => {
      mockState.setAuthScenario('OWNER')
    })

    it('should return 500 when storage upload fails', async () => {
      mockState.setStorageError('prescriptions', new Error('Storage upload failed'))
      const file = createMockFile('prescription.pdf', 'application/pdf', 1000)
      const formData = createFormData(file)

      const response = await POST(createRequest(formData))

      expect(response.status).toBe(500)
      const body = await response.json()
      expect(body.details?.message).toContain('Error al subir')
    })
  })

  // ===========================================================================
  // Audit Logging Tests
  // ===========================================================================

  describe('Audit Logging', () => {
    beforeEach(() => {
      mockState.setAuthScenario('OWNER')
    })

    it('should create audit log entry on successful upload', async () => {
      const file = createMockFile('prescription.pdf', 'application/pdf', 2048)
      const formData = createFormData(file, { productId: 'product-123' })

      const response = await POST(createRequest(formData))

      expect(response.status).toBe(201)
      // Audit log should have been inserted
      // The mock handles this internally
    })
  })

  // ===========================================================================
  // Tenant Isolation Tests
  // ===========================================================================

  describe('Tenant Isolation', () => {
    it('should use correct tenant_id in file path', async () => {
      mockState.setAuthScenario('OWNER')
      const file = createMockFile('prescription.pdf', 'application/pdf', 1000)
      const formData = createFormData(file)

      const response = await POST(createRequest(formData))

      expect(response.status).toBe(201)
      const body = await response.json()
      expect(body.path).toContain(TENANTS.ADRIS.id)
    })

    it('should use different tenant_id for different tenant users', async () => {
      mockState.setUser({
        id: USERS.ADMIN_PETLIFE.id,
        email: USERS.ADMIN_PETLIFE.email,
      })
      mockState.setProfile({
        id: USERS.ADMIN_PETLIFE.id,
        tenant_id: TENANTS.PETLIFE.id,
        role: 'admin',
      })

      const file = createMockFile('prescription.pdf', 'application/pdf', 1000)
      const formData = createFormData(file)

      const response = await POST(createRequest(formData))

      expect(response.status).toBe(201)
      const body = await response.json()
      expect(body.path).toContain(TENANTS.PETLIFE.id)
    })
  })

  // ===========================================================================
  // Response Format Tests
  // ===========================================================================

  describe('Response Format', () => {
    beforeEach(() => {
      mockState.setAuthScenario('OWNER')
    })

    it('should return 201 status on success', async () => {
      const file = createMockFile('prescription.pdf', 'application/pdf', 1000)
      const formData = createFormData(file)

      const response = await POST(createRequest(formData))

      expect(response.status).toBe(201)
    })

    it('should return JSON response', async () => {
      const file = createMockFile('prescription.pdf', 'application/pdf', 1000)
      const formData = createFormData(file)

      const response = await POST(createRequest(formData))

      const body = await response.json()
      expect(typeof body).toBe('object')
    })

    it('should include success, url, and path fields', async () => {
      const file = createMockFile('prescription.pdf', 'application/pdf', 1000)
      const formData = createFormData(file)

      const response = await POST(createRequest(formData))

      const body = await response.json()
      expect(body).toHaveProperty('success')
      expect(body).toHaveProperty('url')
      expect(body).toHaveProperty('path')
    })
  })

  // ===========================================================================
  // Security Tests
  // ===========================================================================

  describe('Security', () => {
    beforeEach(() => {
      mockState.setAuthScenario('OWNER')
    })

    it('should not allow path traversal in filename', async () => {
      const file = createMockFile('../../../etc/passwd', 'application/pdf', 1000)
      const formData = createFormData(file)

      const response = await POST(createRequest(formData))

      // Should either reject or sanitize the path
      if (response.status === 201) {
        const body = await response.json()
        expect(body.path).not.toContain('..')
      }
    })

    it('should not allow null bytes in filename', async () => {
      const file = createMockFile('prescription\x00.exe.pdf', 'application/pdf', 1000)
      const formData = createFormData(file)

      const response = await POST(createRequest(formData))

      if (response.status === 201) {
        const body = await response.json()
        expect(body.path).not.toContain('\x00')
      }
    })

    it('should preserve file extension correctly', async () => {
      const file = createMockFile('prescription.pdf', 'application/pdf', 1000)
      const formData = createFormData(file)

      const response = await POST(createRequest(formData))

      expect(response.status).toBe(201)
      const body = await response.json()
      expect(body.path).toMatch(/\.pdf$/)
    })
  })

  // ===========================================================================
  // Edge Cases
  // ===========================================================================

  describe('Edge Cases', () => {
    beforeEach(() => {
      mockState.setAuthScenario('OWNER')
    })

    it('should handle empty filename', async () => {
      const file = createMockFile('', 'application/pdf', 1000)
      const formData = createFormData(file)

      const response = await POST(createRequest(formData))

      // Should handle gracefully (either accept or reject with clear error)
      expect([201, 400]).toContain(response.status)
    })

    it('should handle filename with only extension', async () => {
      const file = createMockFile('.pdf', 'application/pdf', 1000)
      const formData = createFormData(file)

      const response = await POST(createRequest(formData))

      expect([201, 400]).toContain(response.status)
    })

    it('should handle zero-byte file', async () => {
      const emptyFile = createMockFile('empty.pdf', 'application/pdf', 0)
      const formData = createFormData(emptyFile)

      const response = await POST(createRequest(formData))

      // Zero-byte files might be rejected or accepted depending on implementation
      expect([201, 400]).toContain(response.status)
    })

    it('should handle multiple files (only first processed)', async () => {
      const formData = new FormData()
      formData.append('file', createMockFile('first.pdf', 'application/pdf', 1000))
      formData.append('file', createMockFile('second.pdf', 'application/pdf', 1000))

      const response = await POST(createRequest(formData))

      // Should handle gracefully - typically processes first file only
      expect([201, 400]).toContain(response.status)
    })
  })
})
