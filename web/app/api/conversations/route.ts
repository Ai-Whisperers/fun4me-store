import { NextResponse } from 'next/server'
import { withApiAuth, type ApiHandlerContext } from '@/lib/auth'
import { apiError, apiSuccess, HTTP_STATUS } from '@/lib/api/errors'
import { logger } from '@/lib/logger'
import { z } from 'zod'
import { uuidSchema, requiredString } from '@/lib/schemas/common'

const createConversationWithMessageSchema = z.object({
  subject: requiredString('Asunto', 200),
  pet_id: uuidSchema.optional(),
  message: requiredString('Mensaje', 5000),
  client_id: uuidSchema.optional(),
})

const conversationQuerySchema = z.object({
  status: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})

// GET /api/conversations - List conversations
export const GET = withApiAuth(async ({ request, user, profile, supabase }: ApiHandlerContext) => {

  const { searchParams } = new URL(request.url)
  const queryResult = conversationQuerySchema.safeParse({
    status: searchParams.get('status'),
    page: searchParams.get('page'),
    limit: searchParams.get('limit'),
  })

  if (!queryResult.success) {
    return apiError('VALIDATION_ERROR', HTTP_STATUS.BAD_REQUEST, {
      details: { issues: queryResult.error.issues },
    })
  }

  const { status, page, limit } = queryResult.data
  const offset = (page - 1) * limit

  const isStaff = ['vet', 'admin'].includes(profile.role)

  try {
    let query = supabase
      .from('conversations')
      .select(
        `
        id, subject, status, priority, last_message_at, unread_count_staff, unread_count_client,
        client:profiles!conversations_client_id_fkey(id, full_name, avatar_url),
        pet:pets(id, name, photo_url),
        assigned_staff:profiles!conversations_assigned_to_fkey(id, full_name)
      `,
        { count: 'exact' }
      )
      .eq('tenant_id', profile.tenant_id)
      .is('deleted_at', null)
      .order('last_message_at', { ascending: false })
      .range(offset, offset + limit - 1)

    // Owners only see their own conversations
    if (!isStaff) {
      query = query.eq('client_id', user.id)
    }

    if (status) {
      query = query.eq('status', status)
    }

    const { data: conversations, error, count } = await query

    if (error) throw error

    // Add unread indicator based on role
    const processed = conversations?.map((conv) => ({
      ...conv,
      unread: isStaff ? conv.unread_count_staff > 0 : conv.unread_count_client > 0,
    }))

    return NextResponse.json({
      data: processed,
      total: count || 0,
      page,
      limit,
    })
  } catch (e) {
    logger.error('Error loading conversations', {
      userId: user.id,
      tenantId: profile.tenant_id,
      error: e instanceof Error ? e.message : String(e),
    })
    return apiError('DATABASE_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR)
  }
})

// POST /api/conversations - Start new conversation
export const POST = withApiAuth(
  async ({ request, user, profile, supabase }: ApiHandlerContext) => {
    try {
      const body = await request.json()
      const result = createConversationWithMessageSchema.safeParse(body)
      
      if (!result.success) {
        return apiError('VALIDATION_ERROR', HTTP_STATUS.BAD_REQUEST, {
          details: { issues: result.error.issues },
        })
      }

      const { subject, pet_id, message, client_id } = result.data

      const isStaff = ['vet', 'admin'].includes(profile.role)

      // Determine client_id
      const finalClientId = isStaff ? client_id : user.id

      if (!finalClientId) {
        return apiError('MISSING_FIELDS', HTTP_STATUS.BAD_REQUEST, {
          details: { required: ['client_id'] },
        })
      }

      // Verify pet belongs to client if provided
      if (pet_id) {
        const { data: pet } = await supabase
          .from('pets')
          .select('id, owner_id')
          .eq('id', pet_id)
          .single()

        if (!pet || pet.owner_id !== finalClientId) {
          return apiError('VALIDATION_ERROR', HTTP_STATUS.BAD_REQUEST, {
            details: { reason: 'Mascota no encontrada o no pertenece al cliente' },
          })
        }
      }

      // Create conversation
      const { data: conversation, error: convError } = await supabase
        .from('conversations')
        .insert({
          tenant_id: profile.tenant_id,
          client_id: finalClientId,
          pet_id: pet_id || null,
          subject,
          status: 'open',
          priority: 'normal',
          started_by: isStaff ? 'staff' : 'client',
          last_message_at: new Date().toISOString(),
          unread_count_staff: isStaff ? 0 : 1,
          unread_count_client: isStaff ? 1 : 0,
        })
        .select()
        .single()

      if (convError) throw convError

      // Create first message
      const { error: msgError } = await supabase.from('messages').insert({
        conversation_id: conversation.id,
        sender_id: user.id,
        sender_type: isStaff ? 'staff' : 'client',
        content: message,
        content_type: 'text',
      })

      if (msgError) throw msgError

      return apiSuccess(conversation, 'Conversación creada', HTTP_STATUS.CREATED)
    } catch (e) {
      logger.error('Error creating conversation', {
        userId: user.id,
        tenantId: profile.tenant_id,
        error: e instanceof Error ? e.message : String(e),
      })
      return apiError('DATABASE_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR)
    }
  },
  { rateLimit: 'write' }
)
