/**
 * File Upload Security Validation Tests (Unit)
 *
 * Tests the file validation logic used by upload routes:
 * - Extension whitelisting
 * - MIME type verification
 * - File size limits
 * - Filename sanitization
 *
 * These unit tests verify the core validation logic that protects
 * against malicious file uploads.
 *
 * @tags security, uploads, critical, unit
 */
import { describe, it, expect } from 'vitest'

// Constants from the upload route - replicated here for testing
const ALLOWED_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
  'text/plain',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]

const ALLOWED_EXTENSIONS = [
  'jpg',
  'jpeg',
  'png',
  'gif',
  'webp', // Images
  'pdf', // Documents
  'txt', // Text
  'doc',
  'docx', // Word documents
]

const MAX_SIZE = 10 * 1024 * 1024 // 10MB
const MAX_FILES = 5

/**
 * Validates file extension against whitelist
 * Returns normalized lowercase extension or null if invalid
 */
function validateExtension(filename: string): string | null {
  const extension = filename.split('.').pop()?.toLowerCase()
  if (!extension || !ALLOWED_EXTENSIONS.includes(extension)) {
    return null
  }
  return extension
}

/**
 * Validates MIME type against whitelist
 */
function validateMimeType(type: string): boolean {
  return ALLOWED_TYPES.includes(type)
}

/**
 * Validates file size against maximum
 */
function validateSize(size: number): { valid: boolean; error?: string } {
  if (size > MAX_SIZE) {
    return {
      valid: false,
      error: `Archivo excede el tamaño máximo de 10MB`,
    }
  }
  return { valid: true }
}

/**
 * Validates file count against maximum
 */
function validateFileCount(count: number): { valid: boolean; error?: string } {
  if (count === 0) {
    return { valid: false, error: 'No se proporcionaron archivos' }
  }
  if (count > MAX_FILES) {
    return { valid: false, error: `Máximo ${MAX_FILES} archivos por mensaje` }
  }
  return { valid: true }
}

/**
 * Sanitizes filename to prevent path traversal
 */
function sanitizeFilename(filename: string): string {
  // Remove path traversal attempts
  // eslint-disable-next-line no-control-regex
  return filename.replace(/[./\\]/g, '_').replace(/[\x00-\x1f]/g, '')
}

/**
 * Validates that extension matches MIME type (basic check)
 */
function validateExtensionMimeMatch(
  extension: string,
  mimeType: string
): { valid: boolean; suspicious: boolean } {
  const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'webp']
  const imageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']

  // If extension suggests image but MIME is executable
  if (
    imageExts.includes(extension) &&
    (mimeType.includes('executable') ||
      mimeType.includes('msdownload') ||
      mimeType.includes('x-sh') ||
      mimeType.includes('javascript'))
  ) {
    return { valid: false, suspicious: true }
  }

  // If extension is PDF but MIME is dangerous
  if (extension === 'pdf' && !mimeType.includes('pdf')) {
    if (
      mimeType.includes('executable') ||
      mimeType.includes('msdownload') ||
      mimeType.includes('x-sh')
    ) {
      return { valid: false, suspicious: true }
    }
  }

  return { valid: true, suspicious: false }
}

describe('File Upload Security - Extension Validation', () => {
  describe('Allowed Extensions', () => {
    const allowedCases = [
      { filename: 'photo.jpg', expected: 'jpg' },
      { filename: 'photo.jpeg', expected: 'jpeg' },
      { filename: 'image.png', expected: 'png' },
      { filename: 'animation.gif', expected: 'gif' },
      { filename: 'modern.webp', expected: 'webp' },
      { filename: 'document.pdf', expected: 'pdf' },
      { filename: 'readme.txt', expected: 'txt' },
      { filename: 'legacy.doc', expected: 'doc' },
      { filename: 'report.docx', expected: 'docx' },
    ]

    allowedCases.forEach(({ filename, expected }) => {
      it(`should accept ${filename}`, () => {
        const result = validateExtension(filename)
        expect(result).toBe(expected)
      })
    })
  })

  describe('Blocked Extensions', () => {
    const blockedCases = [
      { ext: 'exe', reason: 'Executable' },
      { ext: 'bat', reason: 'Batch script' },
      { ext: 'sh', reason: 'Shell script' },
      { ext: 'php', reason: 'PHP script' },
      { ext: 'js', reason: 'JavaScript' },
      { ext: 'py', reason: 'Python script' },
      { ext: 'dll', reason: 'DLL library' },
      { ext: 'cmd', reason: 'Command script' },
      { ext: 'ps1', reason: 'PowerShell' },
      { ext: 'vbs', reason: 'VBScript' },
      { ext: 'jar', reason: 'Java archive' },
      { ext: 'html', reason: 'HTML file' },
      { ext: 'htm', reason: 'HTML file' },
      { ext: 'svg', reason: 'SVG (can contain scripts)' },
      { ext: 'msi', reason: 'Windows installer' },
      { ext: 'scr', reason: 'Screen saver (executable)' },
      { ext: 'pif', reason: 'Program Information File' },
      { ext: 'hta', reason: 'HTML Application' },
    ]

    blockedCases.forEach(({ ext, reason }) => {
      it(`should reject .${ext} files (${reason})`, () => {
        const result = validateExtension(`malicious.${ext}`)
        expect(result).toBeNull()
      })
    })
  })

  describe('Case Sensitivity', () => {
    it('should accept uppercase extensions', () => {
      expect(validateExtension('photo.JPG')).toBe('jpg')
      expect(validateExtension('photo.PNG')).toBe('png')
      expect(validateExtension('document.PDF')).toBe('pdf')
    })

    it('should accept mixed case extensions', () => {
      expect(validateExtension('photo.JpG')).toBe('jpg')
      expect(validateExtension('photo.PnG')).toBe('png')
    })
  })

  describe('Edge Cases', () => {
    it('should reject file with no extension', () => {
      expect(validateExtension('noextension')).toBeNull()
    })

    it('should handle file with double extension (uses last)', () => {
      expect(validateExtension('image.jpg.exe')).toBeNull()
      expect(validateExtension('document.pdf.js')).toBeNull()
    })

    it('should handle filename with only extension', () => {
      expect(validateExtension('.jpg')).toBe('jpg')
    })

    it('should handle empty filename', () => {
      expect(validateExtension('')).toBeNull()
    })
  })
})

describe('File Upload Security - MIME Type Validation', () => {
  describe('Allowed MIME Types', () => {
    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'application/pdf',
      'text/plain',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ]

    allowedTypes.forEach((type) => {
      it(`should accept ${type}`, () => {
        expect(validateMimeType(type)).toBe(true)
      })
    })
  })

  describe('Blocked MIME Types', () => {
    const blockedTypes = [
      { type: 'application/x-executable', desc: 'Executable' },
      { type: 'application/x-sh', desc: 'Shell script' },
      { type: 'application/javascript', desc: 'JavaScript' },
      { type: 'text/javascript', desc: 'JavaScript (text)' },
      { type: 'application/x-php', desc: 'PHP' },
      { type: 'text/html', desc: 'HTML' },
      { type: 'application/x-msdos-program', desc: 'DOS program' },
      { type: 'application/x-msdownload', desc: 'Windows download' },
      { type: 'application/octet-stream', desc: 'Binary stream' },
      { type: 'image/svg+xml', desc: 'SVG (can contain scripts)' },
      { type: 'application/x-httpd-php', desc: 'PHP handler' },
      { type: 'application/java-archive', desc: 'Java archive' },
    ]

    blockedTypes.forEach(({ type, desc }) => {
      it(`should reject ${desc} (${type})`, () => {
        expect(validateMimeType(type)).toBe(false)
      })
    })
  })
})

describe('File Upload Security - Size Limits', () => {
  const MAX_SIZE = 10 * 1024 * 1024 // 10MB

  describe('Size Validation', () => {
    it('should accept files under 10MB', () => {
      expect(validateSize(1 * 1024 * 1024).valid).toBe(true) // 1MB
      expect(validateSize(5 * 1024 * 1024).valid).toBe(true) // 5MB
      expect(validateSize(9.9 * 1024 * 1024).valid).toBe(true) // 9.9MB
    })

    it('should accept files exactly at 10MB', () => {
      expect(validateSize(MAX_SIZE).valid).toBe(true)
    })

    it('should reject files over 10MB', () => {
      const result = validateSize(MAX_SIZE + 1)
      expect(result.valid).toBe(false)
      expect(result.error).toContain('tamaño máximo')
    })

    it('should reject very large files', () => {
      expect(validateSize(50 * 1024 * 1024).valid).toBe(false) // 50MB
      expect(validateSize(100 * 1024 * 1024).valid).toBe(false) // 100MB
    })

    it('should accept zero-byte files', () => {
      expect(validateSize(0).valid).toBe(true)
    })
  })
})

describe('File Upload Security - File Count Limits', () => {
  it('should accept 1-5 files', () => {
    expect(validateFileCount(1).valid).toBe(true)
    expect(validateFileCount(3).valid).toBe(true)
    expect(validateFileCount(5).valid).toBe(true)
  })

  it('should reject 0 files', () => {
    const result = validateFileCount(0)
    expect(result.valid).toBe(false)
    expect(result.error).toContain('No se proporcionaron')
  })

  it('should reject more than 5 files', () => {
    const result = validateFileCount(6)
    expect(result.valid).toBe(false)
    expect(result.error).toContain('Máximo 5')
  })

  it('should reject large file counts', () => {
    expect(validateFileCount(10).valid).toBe(false)
    expect(validateFileCount(100).valid).toBe(false)
  })
})

describe('File Upload Security - Path Traversal Prevention', () => {
  describe('Filename Sanitization', () => {
    it('should sanitize path traversal attempts', () => {
      expect(sanitizeFilename('../../../etc/passwd')).not.toContain('..')
      expect(sanitizeFilename('../../../etc/passwd')).not.toContain('/')
    })

    it('should sanitize Windows path traversal', () => {
      expect(sanitizeFilename('..\\..\\windows\\system32')).not.toContain('..')
      expect(sanitizeFilename('..\\..\\windows\\system32')).not.toContain('\\')
    })

    it('should remove null bytes', () => {
      expect(sanitizeFilename('file\x00.exe')).not.toContain('\x00')
    })

    it('should remove control characters', () => {
      const sanitized = sanitizeFilename('file\x0A\x0D.txt')
      // eslint-disable-next-line no-control-regex
      expect(sanitized).not.toMatch(/[\x00-\x1f]/)
    })
  })
})

describe('File Upload Security - Extension/MIME Match', () => {
  describe('Spoofing Prevention', () => {
    it('should detect executable disguised as image', () => {
      const result = validateExtensionMimeMatch('jpg', 'application/x-executable')
      expect(result.valid).toBe(false)
      expect(result.suspicious).toBe(true)
    })

    it('should detect shell script disguised as image', () => {
      const result = validateExtensionMimeMatch('png', 'application/x-sh')
      expect(result.valid).toBe(false)
      expect(result.suspicious).toBe(true)
    })

    it('should detect JavaScript disguised as image', () => {
      const result = validateExtensionMimeMatch('gif', 'application/javascript')
      expect(result.valid).toBe(false)
      expect(result.suspicious).toBe(true)
    })

    it('should detect Windows executable disguised as PDF', () => {
      const result = validateExtensionMimeMatch('pdf', 'application/x-msdownload')
      expect(result.valid).toBe(false)
      expect(result.suspicious).toBe(true)
    })

    it('should allow matching extension and MIME', () => {
      expect(validateExtensionMimeMatch('jpg', 'image/jpeg').valid).toBe(true)
      expect(validateExtensionMimeMatch('png', 'image/png').valid).toBe(true)
      expect(validateExtensionMimeMatch('pdf', 'application/pdf').valid).toBe(true)
    })
  })
})

describe('File Upload Security - Comprehensive Validation', () => {
  interface FileInfo {
    name: string
    type: string
    size: number
  }

  function validateFile(file: FileInfo): { valid: boolean; errors: string[] } {
    const errors: string[] = []

    // Extension validation
    const extension = validateExtension(file.name)
    if (!extension) {
      errors.push(`Extensión no permitida: ${file.name}`)
    }

    // MIME type validation
    if (!validateMimeType(file.type)) {
      errors.push(`Tipo MIME no permitido: ${file.type}`)
    }

    // Size validation
    const sizeResult = validateSize(file.size)
    if (!sizeResult.valid) {
      errors.push(sizeResult.error!)
    }

    // Extension/MIME match validation (if extension was valid)
    if (extension) {
      const matchResult = validateExtensionMimeMatch(extension, file.type)
      if (!matchResult.valid) {
        errors.push('Extensión no coincide con tipo de archivo (posible archivo malicioso)')
      }
    }

    return { valid: errors.length === 0, errors }
  }

  it('should accept valid file', () => {
    const result = validateFile({
      name: 'photo.jpg',
      type: 'image/jpeg',
      size: 1024 * 1024, // 1MB
    })
    expect(result.valid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  it('should reject multiple invalid properties', () => {
    const result = validateFile({
      name: 'malware.exe',
      type: 'application/x-executable',
      size: 50 * 1024 * 1024, // 50MB
    })
    expect(result.valid).toBe(false)
    expect(result.errors.length).toBeGreaterThan(1)
  })

  it('should catch spoofed file', () => {
    const result = validateFile({
      name: 'innocent.jpg',
      type: 'application/x-executable',
      size: 1024,
    })
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.includes('MIME'))).toBe(true)
  })
})
