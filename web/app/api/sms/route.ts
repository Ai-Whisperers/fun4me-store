import { NextResponse } from 'next/server'
import { withApiAuth, type ApiHandlerContext } from '@/lib/auth'
import { apiError, HTTP_STATUS } from '@/lib/api/errors'
import { logger } from '@/lib/logger'

/**
 * GET /api/sms
 * Get SMS message history and stats (staff only)
 */
export const GET = withApiAuth(
  async ({ request, profile, supabase }: ApiHandlerContext) => {
    const { searchParams } = new URL(request.url)
    const view = searchParams.get('view') // 'history' or 'stats'
    const days = parseInt(searchParams.get('days') || '30')
    const limit = parseInt(searchParams.get('limit') || '50')

    try {
      if (view === 'stats') {
        // Get SMS statistics
        const sinceDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()

        // Get notification log stats for SMS
        const { data: logs } = await supabase
          .from('notification_log')
          .select('status, sent_at, cost')
          .eq('tenant_id', profile.tenant_id)
          .eq('channel_type', 'sms')
          .gte('sent_at', sinceDate)

        const stats = {
          total: logs?.length || 0,
          sent: logs?.filter((l) => l.status === 'sent').length || 0,
          delivered: logs?.filter((l) => l.status === 'delivered').length || 0,
          failed: logs?.filter((l) => l.status === 'failed' || l.status === 'bounced').length || 0,
          total_cost: logs?.reduce((sum, l) => sum + (l.cost || 0), 0) || 0,
        }

        // Get daily breakdown
        const dailyStats: Record<string, number> = {}
        logs?.forEach((log) => {
          const day = log.sent_at.split('T')[0]
          dailyStats[day] = (dailyStats[day] || 0) + 1
        })

        return NextResponse.json({
          stats,
          daily: Object.entries(dailyStats)
            .map(([date, count]) => ({ date, count }))
            .sort((a, b) => a.date.localeCompare(b.date)),
        })
      }

      // Get message history from whatsapp_messages (unified messaging)
      const { data: messages, error } = await supabase
        .from('whatsapp_messages')
        .select(
          `
          id, phone_number, direction, content, status,
          external_id, error_message, created_at, delivered_at,
          sender:profiles!whatsapp_messages_sent_by_fkey(full_name)
        `
        )
        .eq('tenant_id', profile.tenant_id)
        .neq('message_type', 'whatsapp') // Exclude WhatsApp messages
        .order('created_at', { ascending: false })
        .limit(limit)

      if (error) {
        logger.error('Error fetching SMS messages', {
          tenantId: profile.tenant_id,
          error: error.message,
        })
        return apiError('DATABASE_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR)
      }

      return NextResponse.json({ data: messages || [] })
    } catch (e) {
      logger.error('SMS API error', {
        tenantId: profile.tenant_id,
        error: e instanceof Error ? e.message : 'Unknown',
      })
      return apiError('SERVER_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR)
    }
  },
  { roles: ['vet', 'admin'] }
)
