/**
 * File upload validation utilities
 * ARCH-022: Add File Upload Security
 */

/**
 * Allowed image MIME types
 */
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'] as const

/**
 * Allowed document MIME types
 */
export const ALLOWED_DOCUMENT_TYPES = ['application/pdf', 'image/jpeg', 'image/png'] as const

/**
 * Maximum file sizes in bytes
 */
export const MAX_FILE_SIZES = {
  image: 5 * 1024 * 1024, // 5MB
  document: 10 * 1024 * 1024, // 10MB
  avatar: 2 * 1024 * 1024, // 2MB
} as const

/**
 * Magic bytes for file type verification
 */
const MAGIC_BYTES: Record<string, number[][]> = {
  'image/jpeg': [[0xff, 0xd8, 0xff]],
  'image/png': [[0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]],
  'image/gif': [
    [0x47, 0x49, 0x46, 0x38, 0x37, 0x61], // GIF87a
    [0x47, 0x49, 0x46, 0x38, 0x39, 0x61], // GIF89a
  ],
  'image/webp': [[0x52, 0x49, 0x46, 0x46]], // RIFF (WebP container)
  'application/pdf': [[0x25, 0x50, 0x44, 0x46]], // %PDF
}

/**
 * Result of file validation
 */
export interface FileValidationResult {
  valid: boolean
  error?: string
  errorCode?: string
}

/**
 * Validate file size
 *
 * @param file - File to validate
 * @param maxSize - Maximum allowed size in bytes
 * @returns Validation result
 */
export function validateFileSize(file: File, maxSize: number): FileValidationResult {
  if (file.size > maxSize) {
    const maxSizeMB = Math.round(maxSize / (1024 * 1024))
    return {
      valid: false,
      error: `Archivo muy grande. Máximo ${maxSizeMB}MB`,
      errorCode: 'FILE_TOO_LARGE',
    }
  }
  return { valid: true }
}

/**
 * Validate file MIME type
 *
 * @param file - File to validate
 * @param allowedTypes - Array of allowed MIME types
 * @returns Validation result
 */
export function validateFileMimeType(
  file: File,
  allowedTypes: readonly string[]
): FileValidationResult {
  if (!allowedTypes.includes(file.type)) {
    const allowed = allowedTypes.map((t) => t.split('/')[1]).join(', ')
    return {
      valid: false,
      error: `Tipo de archivo no permitido. Permitidos: ${allowed}`,
      errorCode: 'INVALID_FILE_TYPE',
    }
  }
  return { valid: true }
}

/**
 * Verify file content by checking magic bytes
 *
 * @param file - File to verify
 * @returns Promise resolving to validation result
 */
export async function verifyFileContent(file: File): Promise<FileValidationResult> {
  try {
    const buffer = await file.slice(0, 16).arrayBuffer()
    const bytes = new Uint8Array(buffer)

    const magicPatterns = MAGIC_BYTES[file.type]

    if (!magicPatterns) {
      // No magic bytes defined for this type, skip verification
      return { valid: true }
    }

    const matches = magicPatterns.some((pattern) =>
      pattern.every((byte, index) => bytes[index] === byte)
    )

    if (!matches) {
      return {
        valid: false,
        error: 'Contenido de archivo no coincide con el tipo declarado',
        errorCode: 'INVALID_FILE_CONTENT',
      }
    }

    return { valid: true }
  } catch (_error: unknown) {
    return {
      valid: false,
      error: 'Error al verificar el archivo',
      errorCode: 'VERIFICATION_ERROR',
    }
  }
}

/**
 * Validate file extension matches MIME type
 *
 * @param file - File to validate
 * @returns Validation result
 */
export function validateFileExtension(file: File): FileValidationResult {
  const extension = file.name.split('.').pop()?.toLowerCase()

  const expectedExtensions: Record<string, string[]> = {
    'image/jpeg': ['jpg', 'jpeg'],
    'image/png': ['png'],
    'image/gif': ['gif'],
    'image/webp': ['webp'],
    'application/pdf': ['pdf'],
  }

  const allowed = expectedExtensions[file.type]
  if (allowed && !allowed.includes(extension || '')) {
    return {
      valid: false,
      error: 'Extensión de archivo no coincide con el tipo',
      errorCode: 'EXTENSION_MISMATCH',
    }
  }

  return { valid: true }
}

/**
 * Sanitize filename to prevent path traversal
 *
 * @param filename - Original filename
 * @returns Sanitized filename
 */
export function sanitizeFilename(filename: string): string {
  // Remove path separators and special characters
  const sanitized = filename
    .replace(/[/\\:*?"<>|]/g, '') // Remove dangerous characters
    .replace(/\.\./g, '') // Remove path traversal attempts
    .replace(/^\.+/, '') // Remove leading dots
    .trim()

  // Generate a safe filename if original is too short or dangerous
  if (sanitized.length < 3) {
    const extension = filename.split('.').pop()?.toLowerCase() || 'file'
    return `upload_${Date.now()}.${extension}`
  }

  return sanitized
}

/**
 * Generate a unique filename for storage
 *
 * @param originalName - Original filename
 * @param prefix - Optional prefix (e.g., user ID or category)
 * @returns Unique filename
 */
export function generateUniqueFilename(originalName: string, prefix?: string): string {
  const extension = originalName.split('.').pop()?.toLowerCase() || 'file'
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 8)

  const parts = [prefix, timestamp, random].filter(Boolean)
  return `${parts.join('_')}.${extension}`
}

/**
 * Complete file validation for uploads
 *
 * @param file - File to validate
 * @param options - Validation options
 * @returns Promise resolving to validation result
 *
 * @example
 * ```typescript
 * const result = await validateFile(file, {
 *   allowedTypes: ALLOWED_IMAGE_TYPES,
 *   maxSize: MAX_FILE_SIZES.image,
 *   verifyContent: true,
 * });
 *
 * if (!result.valid) {
 *   return { error: result.error };
 * }
 * ```
 */
export async function validateFile(
  file: File,
  options: {
    allowedTypes: readonly string[]
    maxSize: number
    verifyContent?: boolean
    checkExtension?: boolean
  }
): Promise<FileValidationResult> {
  // Check if file exists
  if (!file || file.size === 0) {
    return {
      valid: false,
      error: 'Archivo no proporcionado o vacío',
      errorCode: 'NO_FILE',
    }
  }

  // Validate size
  const sizeResult = validateFileSize(file, options.maxSize)
  if (!sizeResult.valid) return sizeResult

  // Validate MIME type
  const mimeResult = validateFileMimeType(file, options.allowedTypes)
  if (!mimeResult.valid) return mimeResult

  // Validate extension if requested
  if (options.checkExtension !== false) {
    const extensionResult = validateFileExtension(file)
    if (!extensionResult.valid) return extensionResult
  }

  // Verify content (magic bytes) if requested
  if (options.verifyContent !== false) {
    const contentResult = await verifyFileContent(file)
    if (!contentResult.valid) return contentResult
  }

  return { valid: true }
}

/**
 * Validate image file (convenience function)
 */
export async function validateImageFile(
  file: File,
  maxSize: number = MAX_FILE_SIZES.image
): Promise<FileValidationResult> {
  return validateFile(file, {
    allowedTypes: ALLOWED_IMAGE_TYPES,
    maxSize,
    verifyContent: true,
    checkExtension: true,
  })
}

/**
 * Validate document file (convenience function)
 */
export async function validateDocumentFile(
  file: File,
  maxSize: number = MAX_FILE_SIZES.document
): Promise<FileValidationResult> {
  return validateFile(file, {
    allowedTypes: ALLOWED_DOCUMENT_TYPES,
    maxSize,
    verifyContent: true,
    checkExtension: true,
  })
}

/**
 * Validate avatar/profile image (convenience function)
 */
export async function validateAvatarFile(file: File): Promise<FileValidationResult> {
  return validateFile(file, {
    allowedTypes: ['image/jpeg', 'image/png', 'image/webp'],
    maxSize: MAX_FILE_SIZES.avatar,
    verifyContent: true,
    checkExtension: true,
  })
}
