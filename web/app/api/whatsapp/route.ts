import { NextResponse } from 'next/server'
import { withApiAuth, type ApiHandlerContext } from '@/lib/auth'
import { apiError, HTTP_STATUS } from '@/lib/api/errors'
import { logger } from '@/lib/logger'

/**
 * GET /api/whatsapp
 * Get WhatsApp message history and conversations (staff only)
 */
export const GET = withApiAuth(
  async ({ request, profile, supabase }: ApiHandlerContext) => {
    try {
      const { searchParams } = new URL(request.url)
      const phone = searchParams.get('phone')
      const page = parseInt(searchParams.get('page') || '1')
      const limit = parseInt(searchParams.get('limit') || '50')
      const offset = (page - 1) * limit

      // If phone is provided, get messages for that conversation
      if (phone) {
        const {
          data: messages,
          error,
          count,
        } = await supabase
          .from('whatsapp_messages')
          .select(
            `
            id,
            phone_number,
            direction,
            content,
            status,
            sent_at,
            delivered_at,
            read_at,
            error_message,
            conversation_type,
            client:profiles!whatsapp_messages_client_id_fkey(id, full_name),
            pet:pets(id, name),
            sender:profiles!whatsapp_messages_sent_by_fkey(id, full_name)
          `,
            { count: 'exact' }
          )
          .eq('tenant_id', profile.tenant_id)
          .eq('phone_number', phone)
          .order('sent_at', { ascending: true })
          .range(offset, offset + limit - 1)

        if (error) {
          logger.error('Error fetching WhatsApp messages', {
            tenantId: profile.tenant_id,
            phone,
            error: error.message,
          })
          return apiError('DATABASE_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR)
        }

        return NextResponse.json({
          data: messages,
          pagination: {
            page,
            limit,
            total: count || 0,
            totalPages: Math.ceil((count || 0) / limit),
          },
        })
      }

      // Otherwise, get conversations (grouped by phone)
      const { data: conversations, error } = await supabase
        .from('whatsapp_messages')
        .select(
          `
          phone_number,
          content,
          direction,
          status,
          sent_at,
          client:profiles!whatsapp_messages_client_id_fkey(id, full_name, phone)
        `
        )
        .eq('tenant_id', profile.tenant_id)
        .order('sent_at', { ascending: false })

      if (error) {
        logger.error('Error fetching WhatsApp conversations', {
          tenantId: profile.tenant_id,
          error: error.message,
        })
        return apiError('DATABASE_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR)
      }

      // Group by phone number, keeping only latest message
      const conversationMap = new Map<string, (typeof conversations)[0] & { unread_count: number }>()

      for (const msg of conversations || []) {
        if (!conversationMap.has(msg.phone_number)) {
          conversationMap.set(msg.phone_number, {
            ...msg,
            unread_count: msg.direction === 'inbound' && msg.status !== 'read' ? 1 : 0,
          })
        } else {
          const existing = conversationMap.get(msg.phone_number)
          if (existing) {
            if (msg.direction === 'inbound' && msg.status !== 'read') {
              existing.unread_count++
            }
          }
        }
      }

      const conversationList = Array.from(conversationMap.values())

      return NextResponse.json({
        data: conversationList,
        pagination: {
          page: 1,
          limit: conversationList.length,
          total: conversationList.length,
          totalPages: 1,
        },
      })
    } catch (error) {
      logger.error('WhatsApp API error', {
        tenantId: profile.tenant_id,
        error: error instanceof Error ? error.message : 'Unknown',
      })
      return apiError('SERVER_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR)
    }
  },
  { roles: ['vet', 'admin'] }
)
