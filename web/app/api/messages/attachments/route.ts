import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/logger'
import { LIMITS, formatFileSize } from '@/lib/constants'
import { uploadAttachmentFormSchema } from '@/lib/schemas/message'

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

// SEC-004: Whitelist of allowed file extensions (prevents path traversal and dangerous extensions)
const ALLOWED_EXTENSIONS = [
  'jpg', 'jpeg', 'png', 'gif', 'webp',  // Images
  'pdf',                                  // Documents
  'txt',                                  // Text
  'doc', 'docx',                          // Word documents
]

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

interface UploadedAttachment {
  url: string
  name: string
  type: string
  size: number
}

// POST /api/messages/attachments - Upload file(s) for message
export async function POST(request: NextRequest): Promise<NextResponse> {
  const supabase = await createClient()

  // Auth check
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  try {
    const formData = await request.formData()
    
    // Validate form data with Zod
    const formValidation = uploadAttachmentFormSchema.safeParse({
      conversation_id: formData.get('conversation_id'),
    })
    
    if (!formValidation.success) {
      return NextResponse.json(
        { error: 'Datos inválidos', issues: formValidation.error.issues },
        { status: 400 }
      )
    }
    
    const conversationId = formValidation.data.conversation_id
    const files = formData.getAll('files') as File[]

    if (!files || files.length === 0) {
      return NextResponse.json({ error: 'No se proporcionaron archivos' }, { status: 400 })
    }

    if (files.length > 5) {
      return NextResponse.json({ error: 'Máximo 5 archivos por mensaje' }, { status: 400 })
    }

    // Verify user has access to conversation
    const { data: profile } = await supabase
      .from('profiles')
      .select('tenant_id, role')
      .eq('id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'Perfil no encontrado' }, { status: 404 })
    }

    const { data: conversation } = await supabase
      .from('conversations')
      .select('id, client_id, tenant_id')
      .eq('id', conversationId)
      .single()

    if (!conversation) {
      return NextResponse.json({ error: 'Conversación no encontrada' }, { status: 404 })
    }

    // SEC-015: Verify tenant isolation for both staff and clients
    const isStaff = ['vet', 'admin'].includes(profile.role)
    const hasAccess = isStaff
      ? conversation.tenant_id === profile.tenant_id  // Staff: must be from same tenant
      : conversation.client_id === user.id            // Clients: must own the conversation

    if (!hasAccess) {
      return NextResponse.json({ error: 'No tienes acceso a esta conversación' }, { status: 403 })
    }

    // Upload files
    const uploadedAttachments: UploadedAttachment[] = []

    for (const file of files) {
      // SEC-004: Validate extension
      const validExtension = validateExtension(file.name)
      if (!validExtension) {
        return NextResponse.json(
          {
            error: `Extensión de archivo no permitida: "${file.name}". Extensiones permitidas: ${ALLOWED_EXTENSIONS.join(', ')}.`,
          },
          { status: 400 }
        )
      }

      // Validate type
      if (!ALLOWED_TYPES.includes(file.type)) {
        return NextResponse.json(
          {
            error: `Tipo de archivo no permitido: ${file.type}. Tipos permitidos: imágenes, PDF, documentos de texto.`,
          },
          { status: 400 }
        )
      }

      // Validate size
      if (file.size > LIMITS.MAX_ATTACHMENT_SIZE) {
        return NextResponse.json(
          {
            error: `Archivo "${file.name}" excede el tamaño máximo de ${formatFileSize(LIMITS.MAX_ATTACHMENT_SIZE)}`,
          },
          { status: 400 }
        )
      }

      // Generate unique filename using validated extension
      const timestamp = Date.now()
      const randomSuffix = Math.random().toString(36).substring(7)
      // Use validExtension from SEC-004 check above (guaranteed non-null at this point)
      const storagePath = `${user.id}/${conversationId}/${timestamp}-${randomSuffix}.${validExtension}`

      // Upload to Supabase Storage
      const arrayBuffer = await file.arrayBuffer()
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('message-attachments')
        .upload(storagePath, arrayBuffer, {
          contentType: file.type,
          upsert: false,
        })

      if (uploadError) {
        logger.error('Upload error', {
          userId: user.id,
          tenantId: profile.tenant_id,
          conversationId,
          fileName: file.name,
          error: uploadError instanceof Error ? uploadError.message : String(uploadError),
        })
        return NextResponse.json(
          {
            error: `Error al subir "${file.name}": ${uploadError.message}`,
          },
          { status: 500 }
        )
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('message-attachments')
        .getPublicUrl(uploadData.path)

      uploadedAttachments.push({
        url: urlData.publicUrl,
        name: file.name,
        type: file.type,
        size: file.size,
      })
    }

    return NextResponse.json({
      success: true,
      attachments: uploadedAttachments,
    })
  } catch (e) {
    logger.error('Error uploading attachments', {
      userId: user?.id,
      error: e instanceof Error ? e.message : String(e),
    })
    return NextResponse.json({ error: 'Error al subir archivos' }, { status: 500 })
  }
}
