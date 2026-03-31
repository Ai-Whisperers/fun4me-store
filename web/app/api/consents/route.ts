import { NextResponse } from 'next/server'
import { withApiAuth, type ApiHandlerContext } from '@/lib/auth'
import { apiError, HTTP_STATUS } from '@/lib/api/errors'
import { logger } from '@/lib/logger'
import { createConsentDocumentSchema } from '@/lib/schemas/consent'

export const GET = withApiAuth(async ({ request, user, profile, supabase }: ApiHandlerContext) => {
  const { searchParams } = new URL(request.url)
  const petId = searchParams.get('pet_id')
  const ownerId = searchParams.get('owner_id')
  const category = searchParams.get('category')
  const status = searchParams.get('status')

  // Build query based on role
  let query = supabase
    .from('consent_documents')
    .select(
      `
      *,
      pet:pets!inner(id, name, owner_id, tenant_id),
      owner:profiles!owner_id(id, full_name, email),
      template:consent_templates!template_id(id, name, category),
      signed_by_user:profiles!signed_by_id(id, full_name)
    `
    )
    .order('created_at', { ascending: false })

  if (['vet', 'admin'].includes(profile.role)) {
    // Staff sees all clinic consent documents
    query = query.eq('pet.tenant_id', profile.tenant_id)
  } else {
    // Owners see only their pets' consent documents
    query = query.eq('owner_id', user.id)
  }

  if (petId) {
    query = query.eq('pet_id', petId)
  }

  if (ownerId) {
    query = query.eq('owner_id', ownerId)
  }

  if (category) {
    query = query.eq('template.category', category)
  }

  if (status) {
    query = query.eq('status', status)
  }

  const { data, error } = await query

  if (error) {
    logger.error('Error fetching consent documents', {
      tenantId: profile.tenant_id,
      userId: user.id,
      error: error.message,
    })
    return apiError('DATABASE_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR)
  }

  return NextResponse.json(data)
})

export const POST = withApiAuth(
  async ({ request, user, profile, supabase }: ApiHandlerContext) => {
    // Parse and validate body
    let body
    try {
      body = await request.json()
    } catch (_error: unknown) {
      return apiError('INVALID_FORMAT', HTTP_STATUS.BAD_REQUEST)
    }

    const result = createConsentDocumentSchema.safeParse(body)
    if (!result.success) {
      return apiError('VALIDATION_ERROR', HTTP_STATUS.BAD_REQUEST, {
        details: { errors: result.error.flatten().fieldErrors },
      })
    }

    const {
      template_id,
      pet_id,
      owner_id,
      custom_content,
      field_values,
      signature_data,
      witness_signature_data,
      witness_name,
      id_verification_type,
      id_verification_number,
      expires_at,
    } = result.data

    // Verify pet belongs to staff's clinic
    const { data: pet } = await supabase
      .from('pets')
      .select('id, tenant_id, owner_id')
      .eq('id', pet_id)
      .single()

    if (!pet) {
      return apiError('NOT_FOUND', HTTP_STATUS.NOT_FOUND, {
        details: { resource: 'pet' },
      })
    }

    if (pet.tenant_id !== profile.tenant_id) {
      return apiError('FORBIDDEN', HTTP_STATUS.FORBIDDEN)
    }

    // Verify owner
    if (pet.owner_id !== owner_id) {
      return apiError('VALIDATION_ERROR', HTTP_STATUS.BAD_REQUEST, {
        details: { message: 'Owner does not match pet' },
      })
    }

    // Get template to check if it needs witness
    const { data: template } = await supabase
      .from('consent_templates')
      .select('id, requires_witness, can_be_revoked, default_expiry_days')
      .eq('id', template_id)
      .single()

    if (!template) {
      return apiError('NOT_FOUND', HTTP_STATUS.NOT_FOUND, {
        details: { resource: 'template' },
      })
    }

    // Validate witness signature if required
    if (template.requires_witness && !witness_signature_data) {
      return apiError('MISSING_FIELDS', HTTP_STATUS.BAD_REQUEST, {
        details: { required: ['witness_signature_data'] },
      })
    }

    // Calculate expiry date
    let calculatedExpiresAt = null
    if (expires_at) {
      calculatedExpiresAt = expires_at
    } else if (template.default_expiry_days) {
      const expiryDate = new Date()
      expiryDate.setDate(expiryDate.getDate() + template.default_expiry_days)
      calculatedExpiresAt = expiryDate.toISOString()
    }

    // Insert consent document
    const { data, error } = await supabase
      .from('consent_documents')
      .insert({
        template_id,
        pet_id,
        owner_id,
        custom_content: custom_content || null,
        field_values: field_values || {},
        signature_data,
        signed_by_id: user.id,
        signed_at: new Date().toISOString(),
        witness_signature_data: witness_signature_data || null,
        witness_name: witness_name || null,
        id_verification_type: id_verification_type || null,
        id_verification_number: id_verification_number || null,
        expires_at: calculatedExpiresAt,
        status: 'active',
        can_be_revoked: template.can_be_revoked,
      })
      .select()
      .single()

    if (error) {
      logger.error('Error creating consent document', {
        tenantId: profile.tenant_id,
        userId: user.id,
        error: error.message,
      })
      return apiError('DATABASE_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR)
    }

    return NextResponse.json(data, { status: HTTP_STATUS.CREATED })
  },
  { roles: ['vet', 'admin'], rateLimit: 'write' }
)
