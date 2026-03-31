/**
 * POST /api/signup/upload-logo
 *
 * Upload a clinic logo to Supabase Storage during signup.
 * This is a public endpoint (no auth required) with rate limiting.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { UploadLogoResponse } from '@/lib/signup/types'
import { logger } from '@/lib/logger'
import { LIMITS, formatFileSize } from '@/lib/constants'
import { uploadLogoFormSchema } from '@/lib/schemas/signup'

export const dynamic = 'force-dynamic'
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/svg+xml', 'image/webp']
const ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'svg', 'webp']

// Simple in-memory rate limiting (reset on server restart)
const uploadAttempts = new Map<string, { count: number; resetAt: number }>()
const RATE_LIMIT = 10 // uploads per hour per IP
const RATE_WINDOW = 60 * 60 * 1000 // 1 hour

function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const record = uploadAttempts.get(ip)

  if (!record || record.resetAt < now) {
    uploadAttempts.set(ip, { count: 1, resetAt: now + RATE_WINDOW })
    return true
  }

  if (record.count >= RATE_LIMIT) {
    return false
  }

  record.count++
  return true
}

function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }
  return request.headers.get('x-real-ip') || 'unknown'
}

export async function POST(request: NextRequest): Promise<NextResponse<UploadLogoResponse>> {
  try {
    // Rate limiting
    const clientIp = getClientIp(request)
    if (!checkRateLimit(clientIp)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Demasiados intentos. Por favor espera antes de subir otro logo.',
        },
        { status: 429 }
      )
    }

    const formData = await request.formData()
    const file = formData.get('file') as File | null
    
    // Validate form fields with Zod
    const formValidation = uploadLogoFormSchema.safeParse({
      slug: formData.get('slug'),
    })
    
    const tempSlug = formValidation.success ? formValidation.data.slug : null

    if (!file) {
      return NextResponse.json(
        {
          success: false,
          error: 'No se proporciono archivo',
        },
        { status: 400 }
      )
    }

    // Validate file size
    if (file.size > LIMITS.MAX_LOGO_SIZE) {
      return NextResponse.json(
        {
          success: false,
          error: `Archivo muy grande. Máximo ${formatFileSize(LIMITS.MAX_LOGO_SIZE)}`,
        },
        { status: 400 }
      )
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Tipo de archivo no permitido. Use JPG, PNG, SVG o WebP',
        },
        { status: 400 }
      )
    }

    // Validate extension
    const extension = file.name.split('.').pop()?.toLowerCase() || ''
    if (!ALLOWED_EXTENSIONS.includes(extension)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Extension de archivo no permitida',
        },
        { status: 400 }
      )
    }

    // Generate unique filename
    const timestamp = Date.now()
    const randomId = Math.random().toString(36).substring(2, 8)
    const safeSlug = (tempSlug || 'pending')
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '')
      .substring(0, 30)

    // Build path: logos/pending/{slug}_{timestamp}_{random}.{ext}
    // Files in 'pending' folder can be moved to proper tenant folder after signup
    const filePath = `logos/pending/${safeSlug}_${timestamp}_${randomId}.${extension}`

    // Convert File to ArrayBuffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = new Uint8Array(arrayBuffer)

    // Upload to Supabase Storage
    const supabase = await createClient()

    const { error: uploadError } = await supabase.storage.from('public').upload(filePath, buffer, {
      contentType: file.type,
      upsert: false,
    })

    if (uploadError) {
      logger.error('Logo upload to storage failed', {
        filePath,
        fileType: file.type,
        error: uploadError.message,
      })

      // Check for specific errors
      if (uploadError.message?.includes('Bucket not found')) {
        return NextResponse.json(
          {
            success: false,
            error: 'Almacenamiento no configurado. Contacte al administrador.',
          },
          { status: 500 }
        )
      }

      return NextResponse.json(
        {
          success: false,
          error: 'Error al subir el logo. Por favor intente nuevamente.',
        },
        { status: 500 }
      )
    }

    // Get public URL
    const {
      data: { publicUrl },
    } = supabase.storage.from('public').getPublicUrl(filePath)

    return NextResponse.json({
      success: true,
      url: publicUrl,
    })
  } catch (error) {
    logger.error('Unexpected error in logo upload', {
      error: error instanceof Error ? error.message : 'Unknown error',
    })
    return NextResponse.json(
      {
        success: false,
        error: 'Error inesperado. Por favor intente nuevamente.',
      },
      { status: 500 }
    )
  }
}
