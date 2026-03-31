import { NextRequest, NextResponse } from 'next/server'
import { withApiAuth, type ApiHandlerContext } from '@/lib/auth'
import { getFastAuth } from '@/lib/auth/fast-auth'
import { apiError, HTTP_STATUS } from '@/lib/api/errors'
import { logger } from '@/lib/logger'

/**
 * GET /api/notifications
 * Fetch in-app notifications for the authenticated user
 *
 * PERF: Uses getFastAuth() for session caching since this endpoint:
 * - Is read-only (non-sensitive)
 * - Polls frequently (every 60s)
 * - Only accesses user's own data
 *
 * Expected schema: notifications table
 * - user_id: UUID (auth user ID)
 * - type: notification type
 * - title, message: content
 * - read_at: NULL = unread, timestamp = read
 */
export async function GET(request: NextRequest) {
  try {
    // PERF: Use cached session for fast auth (non-sensitive read)
    const { user, supabase, fromCache } = await getFastAuth()

    if (!user) {
      return apiError('UNAUTHORIZED', HTTP_STATUS.UNAUTHORIZED)
    }

    if (fromCache) {
      logger.debug('Notifications: Auth from cache', { userId: user.id.substring(0, 8) })
    }

    // Parse query params
    const { searchParams } = new URL(request.url)
    const statusFilter = searchParams.get('status')

    // Check if notifications table exists and query it
    const { data: notifications, error: notificationsError } = await supabase
      .from('notifications')
      .select(
        'id, title, message, type, priority, reference_type, reference_id, action_url, read_at, dismissed_at, created_at'
      )
      .eq('user_id', user.id)
      .is('dismissed_at', null)
      .order('created_at', { ascending: false })
      .limit(50)

    // Handle table not existing (PGRST205) - return empty list gracefully
    if (notificationsError) {
      if (notificationsError.code === 'PGRST205') {
        // Table doesn't exist yet - return empty notifications (not an error)
        return NextResponse.json({
          notifications: [],
          unreadCount: 0,
        })
      }
      logger.error('Error fetching notifications', {
        error: notificationsError.message,
        userId: user.id,
      })
      return apiError('DATABASE_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR)
    }

    // Filter by status if provided
    let filteredNotifications = notifications || []
    if (statusFilter === 'read') {
      filteredNotifications = filteredNotifications.filter((n) => n.read_at !== null)
    } else if (statusFilter === 'unread') {
      filteredNotifications = filteredNotifications.filter((n) => n.read_at === null)
    }

    // Count unread
    const unreadCount = (notifications || []).filter((n) => n.read_at === null).length

    // Return response (map to consistent format)
    return NextResponse.json({
      notifications: filteredNotifications.map((n) => ({
        ...n,
        status: n.read_at ? 'read' : 'unread',
      })),
      unreadCount,
    })
  } catch (error) {
    logger.error('Unexpected error fetching notifications', {
      error: error instanceof Error ? error.message : 'Unknown',
    })
    return apiError('SERVER_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR)
  }
}

/**
 * PATCH /api/notifications
 * Mark notifications as read
 * Expects:
 *   - { notificationIds: string[] } - mark specific notifications
 *   - { markAllRead: true } - mark all unread notifications as read
 */
export const PATCH = withApiAuth(async ({ request, user, supabase }: ApiHandlerContext) => {
  try {
    const body = await request.json()
    const { notificationIds, markAllRead } = body

    // Handle mark all read
    if (markAllRead === true) {
      const { data, error: updateError } = await supabase
        .from('notifications')
        .update({
          read_at: new Date().toISOString(),
        })
        .eq('user_id', user.id) // Security: only update own notifications
        .is('read_at', null) // Only mark unread ones
        .select()

      if (updateError) {
        // Handle table not existing gracefully
        if (updateError.code === 'PGRST205') {
          return NextResponse.json({
            success: true,
            updated: 0,
            message: 'No hay notificaciones',
          })
        }
        logger.error('Error marking all notifications as read', {
          error: updateError.message,
          userId: user.id,
        })
        return apiError('DATABASE_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR)
      }

      return NextResponse.json({
        success: true,
        updated: data?.length || 0,
        message: 'Todas las notificaciones marcadas como leídas',
      })
    }

    // Handle specific notification IDs
    if (!notificationIds || !Array.isArray(notificationIds)) {
      return apiError('MISSING_FIELDS', HTTP_STATUS.BAD_REQUEST, {
        details: { required: ['notificationIds (array) o markAllRead (boolean)'] },
      })
    }

    if (notificationIds.length === 0) {
      return apiError('VALIDATION_ERROR', HTTP_STATUS.BAD_REQUEST, {
        details: { reason: 'El array de IDs no puede estar vacío' },
      })
    }

    // Update specific notifications to read status
    // Only update notifications that belong to the current user
    const { data, error: updateError } = await supabase
      .from('notifications')
      .update({
        read_at: new Date().toISOString(),
      })
      .in('id', notificationIds)
      .eq('user_id', user.id) // Security: only update own notifications
      .select()

    if (updateError) {
      // Handle table not existing gracefully
      if (updateError.code === 'PGRST205') {
        return NextResponse.json({
          success: true,
          updated: 0,
          message: 'No hay notificaciones',
        })
      }
      logger.error('Error updating notifications', {
        error: updateError.message,
        userId: user.id,
        notificationIds,
      })
      return apiError('DATABASE_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR)
    }

    // Return success response
    return NextResponse.json({
      success: true,
      updated: data?.length || 0,
      message: 'Notificaciones marcadas como leídas',
    })
  } catch (error) {
    logger.error('Unexpected error updating notifications', {
      error: error instanceof Error ? error.message : 'Unknown',
      userId: user?.id,
    })
    return apiError('SERVER_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR)
  }
}, { rateLimit: 'write' })
