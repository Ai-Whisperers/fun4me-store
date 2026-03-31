import { NextResponse } from 'next/server'
import { withApiAuth, type ApiHandlerContext } from '@/lib/auth'
import { apiError, HTTP_STATUS } from '@/lib/api/errors'
import { logger } from '@/lib/logger'
import { LIMITS, formatFileSize } from '@/lib/constants'

const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/png']

// SEC-013: Whitelist of allowed file extensions (prevents path traversal and dangerous extensions)
const ALLOWED_EXTENSIONS = ['pdf', 'jpg', 'jpeg', 'png']

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
 * POST /api/store/prescriptions/upload
 * Upload a prescription file to Supabase Storage
 */
export const POST = withApiAuth(
  async ({ request, user, profile, supabase }: ApiHandlerContext) => {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const productId = formData.get('productId') as string | null

    if (!file) {
      return apiError('MISSING_FIELDS', HTTP_STATUS.BAD_REQUEST, {
        details: { message: 'No se proporcionó archivo' },
      })
    }

    // Validate file size
    if (file.size > LIMITS.MAX_PRESCRIPTION_SIZE) {
      return apiError('FILE_TOO_LARGE', HTTP_STATUS.BAD_REQUEST, {
        details: { message: `Archivo muy grande. Máximo ${formatFileSize(LIMITS.MAX_PRESCRIPTION_SIZE)}` },
      })
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return apiError('INVALID_FILE_TYPE', HTTP_STATUS.BAD_REQUEST, {
        details: { message: 'Tipo de archivo no permitido. Use PDF, JPG o PNG' },
      })
    }

    // SEC-013: Validate file extension against whitelist
    const validExtension = validateExtension(file.name)
    if (!validExtension) {
      return apiError('INVALID_FILE_TYPE', HTTP_STATUS.BAD_REQUEST, {
        details: { message: 'Extensión de archivo no permitida. Use PDF, JPG o PNG' },
      })
    }

    // Generate unique filename
    const timestamp = Date.now()
    const safeName = file.name
      .replace(/\.[^/.]+$/, '') // Remove extension
      .replace(/[^a-zA-Z0-9]/g, '_') // Replace special chars
      .substring(0, 50) // Limit length

    // Build path: prescriptions/{tenant_id}/{user_id}/{timestamp}_{filename}.{ext}
    const filePath = `prescriptions/${profile.tenant_id}/${user.id}/${timestamp}_${safeName}.${validExtension}`

    // Convert File to ArrayBuffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = new Uint8Array(arrayBuffer)

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage.from('documents').upload(filePath, buffer, {
      contentType: file.type,
      upsert: false,
    })

    if (uploadError) {
      logger.error('Error uploading prescription', {
        tenantId: profile.tenant_id,
        userId: user.id,
        fileType: file.type,
        fileSize: file.size,
        error: uploadError.message,
      })
      return apiError('UPLOAD_FAILED', HTTP_STATUS.INTERNAL_SERVER_ERROR, {
        details: { message: 'Error al subir archivo' },
      })
    }

    // Get public URL
    const {
      data: { publicUrl },
    } = supabase.storage.from('documents').getPublicUrl(filePath)

    // Optionally log the upload for audit
    await supabase.from('audit_logs').insert({
      tenant_id: profile.tenant_id,
      user_id: user.id,
      action: 'prescription_uploaded',
      resource: 'store_order_items',
      details: {
        file_path: filePath,
        file_type: file.type,
        file_size: file.size,
        product_id: productId,
      },
    })

    return NextResponse.json(
      {
        success: true,
        url: publicUrl,
        path: filePath,
      },
      { status: 201 }
    )
  } catch (error) {
    logger.error('Error in prescription upload', {
      tenantId: profile.tenant_id,
      userId: user.id,
      error: error instanceof Error ? error.message : 'Unknown',
    })
    return apiError('SERVER_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR)
  }
  },
  { rateLimit: 'write' }
)
