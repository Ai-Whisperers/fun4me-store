'use server'

import { withActionAuth } from '@/lib/auth'
import { actionSuccess, actionError } from '@/lib/errors'
import { revalidatePath } from 'next/cache'
import { logger } from '@/lib/logger'

// SEC-004: File extension whitelist (defense in depth alongside MIME validation)
const ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp', 'pdf', 'doc', 'docx', 'xls', 'xlsx']
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
]
const MAX_FILE_SIZE = 20 * 1024 * 1024 // 20MB

type DocumentCategory = 'medical' | 'lab' | 'xray' | 'vaccine' | 'prescription' | 'other'

interface UploadedDocument {
  id: string
  name: string
  file_url: string
  file_type: string
  file_size: number
  category: DocumentCategory
  created_at: string
}

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
 * Upload documents for a pet
 */
export const uploadPetDocuments = withActionAuth(
  async (
    { user, profile, supabase },
    petId: string,
    formData: FormData
  ): Promise<ReturnType<typeof actionSuccess<UploadedDocument[]>> | ReturnType<typeof actionError>> => {
    const category = (formData.get('category') as DocumentCategory) || 'other'
    const files = formData.getAll('files') as File[]
    const clinic = formData.get('clinic') as string

    if (!files || files.length === 0) {
      return actionError('No se proporcionaron archivos')
    }

    if (files.length > 10) {
      return actionError('Máximo 10 archivos por carga')
    }

    // Verify pet exists and user has access
    const { data: pet, error: petError } = await supabase
      .from('pets')
      .select('id, owner_id, tenant_id')
      .eq('id', petId)
      .is('deleted_at', null)
      .single()

    if (petError || !pet) {
      return actionError('Mascota no encontrada')
    }

    // Authorization: owner or staff of same tenant
    const isStaff = ['vet', 'admin'].includes(profile.role)
    const isOwner = pet.owner_id === user.id
    const sameTenant = profile.tenant_id === pet.tenant_id

    if (!isOwner && !(isStaff && sameTenant)) {
      return actionError('No tienes permiso para subir documentos a esta mascota')
    }

    const uploadedDocuments: UploadedDocument[] = []

    for (const file of files) {
      // SEC-004: Validate file extension
      const validExtension = validateExtension(file.name)
      if (!validExtension) {
        return actionError(
          `Extensión de archivo no permitida: "${file.name}". Extensiones permitidas: ${ALLOWED_EXTENSIONS.join(', ')}.`
        )
      }

      // Validate MIME type
      if (!ALLOWED_MIME_TYPES.includes(file.type)) {
        return actionError(
          `Tipo de archivo no permitido: ${file.type}. Use imágenes, PDF, o documentos de Office.`
        )
      }

      // Validate file size
      if (file.size > MAX_FILE_SIZE) {
        return actionError(`El archivo "${file.name}" excede el tamaño máximo de 20MB`)
      }

      // Generate storage path: tenant/pet/timestamp-random.ext
      const timestamp = Date.now()
      const randomSuffix = Math.random().toString(36).substring(7)
      const storagePath = `${pet.tenant_id}/${petId}/${timestamp}-${randomSuffix}.${validExtension}`

      // Upload to Supabase Storage
      const arrayBuffer = await file.arrayBuffer()
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('pet-documents')
        .upload(storagePath, arrayBuffer, {
          contentType: file.type,
          upsert: false,
        })

      if (uploadError) {
        logger.error('Error uploading pet document', {
          tenantId: pet.tenant_id,
          petId,
          userId: user.id,
          fileName: file.name,
          error: uploadError.message,
        })
        return actionError(`Error al subir "${file.name}": ${uploadError.message}`)
      }

      // Get public URL
      const {
        data: { publicUrl },
      } = supabase.storage.from('pet-documents').getPublicUrl(uploadData.path)

      // Create database record
      const { data: docRecord, error: dbError } = await supabase
        .from('pet_documents')
        .insert({
          tenant_id: pet.tenant_id,
          pet_id: petId,
          name: file.name,
          file_url: publicUrl,
          file_type: file.type,
          file_size: file.size,
          storage_path: storagePath,
          category,
          uploaded_by: user.id,
        })
        .select('id, name, file_url, file_type, file_size, category, created_at')
        .single()

      if (dbError) {
        logger.error('Error creating pet document record', {
          tenantId: pet.tenant_id,
          petId,
          userId: user.id,
          error: dbError.message,
        })
        // Try to clean up uploaded file
        await supabase.storage.from('pet-documents').remove([storagePath])
        return actionError(`Error al guardar documento "${file.name}"`)
      }

      uploadedDocuments.push(docRecord as UploadedDocument)
    }

    // Revalidate the pet detail page
    if (clinic) {
      revalidatePath(`/${clinic}/portal/pets/${petId}`)
      revalidatePath(`/${clinic}/dashboard/patients/${petId}`)
    }

    logger.info('Pet documents uploaded', {
      tenantId: pet.tenant_id,
      petId,
      userId: user.id,
      count: uploadedDocuments.length,
    })

    return actionSuccess(uploadedDocuments)
  }
)

/**
 * Delete a pet document (soft delete)
 */
export const deletePetDocument = withActionAuth(
  async (
    { user, profile, supabase },
    documentId: string,
    clinic?: string
  ): Promise<ReturnType<typeof actionSuccess> | ReturnType<typeof actionError>> => {
    // Fetch document with pet info
    const { data: document, error: docError } = await supabase
      .from('pet_documents')
      .select('id, pet_id, tenant_id, storage_path, uploaded_by, pets!inner(owner_id)')
      .eq('id', documentId)
      .is('deleted_at', null)
      .single()

    if (docError || !document) {
      return actionError('Documento no encontrado')
    }

    // Authorization: staff, owner of pet, or original uploader
    const isStaff = ['vet', 'admin'].includes(profile.role)
    const sameTenant = profile.tenant_id === document.tenant_id
    const petData = document.pets as { owner_id: string } | { owner_id: string }[]
    const petOwnerId = Array.isArray(petData) ? petData[0]?.owner_id : petData?.owner_id
    const isOwner = petOwnerId === user.id
    const isUploader = document.uploaded_by === user.id

    if (!((isStaff && sameTenant) || isOwner || isUploader)) {
      return actionError('No tienes permiso para eliminar este documento')
    }

    // Soft delete the record
    const { error: updateError } = await supabase
      .from('pet_documents')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', documentId)

    if (updateError) {
      logger.error('Error soft-deleting pet document', {
        documentId,
        userId: user.id,
        error: updateError.message,
      })
      return actionError('Error al eliminar el documento')
    }

    // Also remove from storage (hard delete the file)
    if (document.storage_path) {
      const { error: storageError } = await supabase.storage
        .from('pet-documents')
        .remove([document.storage_path])

      if (storageError) {
        logger.warn('Failed to remove document from storage', {
          documentId,
          storagePath: document.storage_path,
          error: storageError.message,
        })
        // Don't fail the operation - the record is already soft-deleted
      }
    }

    // Revalidate pages
    if (clinic) {
      revalidatePath(`/${clinic}/portal/pets/${document.pet_id}`)
      revalidatePath(`/${clinic}/dashboard/patients/${document.pet_id}`)
    }

    logger.info('Pet document deleted', {
      documentId,
      petId: document.pet_id,
      userId: user.id,
    })

    return actionSuccess()
  }
)

/**
 * Get documents for a pet
 */
export const getPetDocuments = withActionAuth(
  async ({ user, profile, supabase }, petId: string) => {
    // Verify pet exists and user has access
    const { data: pet, error: petError } = await supabase
      .from('pets')
      .select('id, owner_id, tenant_id')
      .eq('id', petId)
      .is('deleted_at', null)
      .single()

    if (petError || !pet) {
      return actionError('Mascota no encontrada')
    }

    // Authorization check
    const isStaff = ['vet', 'admin'].includes(profile.role)
    const isOwner = pet.owner_id === user.id
    const sameTenant = profile.tenant_id === pet.tenant_id

    if (!isOwner && !(isStaff && sameTenant)) {
      return actionError('No tienes permiso para ver documentos de esta mascota')
    }

    // Fetch documents
    const { data: documents, error: docError } = await supabase
      .from('pet_documents')
      .select(`
        id,
        name,
        file_url,
        file_type,
        file_size,
        category,
        description,
        uploaded_by,
        created_at,
        profiles:uploaded_by (full_name)
      `)
      .eq('pet_id', petId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })

    if (docError) {
      logger.error('Error fetching pet documents', {
        petId,
        userId: user.id,
        error: docError.message,
      })
      return actionError('Error al cargar documentos')
    }

    // Format response
    const formattedDocs = (documents || []).map((doc) => {
      const profileData = doc.profiles as { full_name: string } | { full_name: string }[] | null
      const uploaderName = Array.isArray(profileData) ? profileData[0]?.full_name : profileData?.full_name
      return {
        id: doc.id,
        name: doc.name,
        file_url: doc.file_url,
        file_type: doc.file_type,
        file_size: doc.file_size,
        category: doc.category as DocumentCategory,
        description: doc.description,
        uploaded_by: uploaderName || 'Usuario',
        created_at: doc.created_at,
      }
    })

    return actionSuccess(formattedDocs)
  }
)
