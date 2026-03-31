import { NextResponse } from 'next/server'
import { withApiAuth, type ApiHandlerContext } from '@/lib/auth'
import { apiError, HTTP_STATUS } from '@/lib/api/errors'
import { logger } from '@/lib/logger'

/**
 * POST /api/notifications/mark-all-read
 * Mark all unread notifications as read for the authenticated user
 */
export const POST = withApiAuth(async ({ user, profile, supabase }: ApiHandlerContext) => {
  try {
    // Mark all unread notifications as read for this user
    const { data, error } = await supabase
      .from('notifications')
      .update({
        read_at: new Date().toISOString(),
      })
      .eq('user_id', user.id)
      .is('read_at', null) // Only mark unread ones
      .select()

    if (error) {
      logger.error('Error marking notifications as read', {
        userId: user.id,
        tenantId: profile.tenant_id,
        error: error.message,
      })
      return apiError('DATABASE_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR)
    }

    return NextResponse.json({
      success: true,
      updated: data?.length || 0,
      message: 'Todas las notificaciones marcadas como leídas',
    })
  } catch (error) {
    logger.error('Unexpected error marking notifications', {
      userId: user.id,
      tenantId: profile.tenant_id,
      error: error instanceof Error ? error.message : 'Unknown',
    })
    return apiError('SERVER_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR)
  }
}, { rateLimit: 'write' })
