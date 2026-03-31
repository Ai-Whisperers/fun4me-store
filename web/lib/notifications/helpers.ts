/**
 * Notification Helpers
 * 
 * Common notification scenarios and utilities
 */

import { sendNotification, sendInAppNotification, notifyStaff } from './service'
import type { NotificationPayload } from './types'
import { logger } from '@/lib/logger'

// =============================================================================
// Common Notification Scenarios
// =============================================================================

/**
 * Send appointment reminder notification
 */
export async function sendAppointmentReminder(options: {
  userId: string
  tenantId: string
  appointmentId: string
  petName: string
  appointmentDate: string
  appointmentTime: string
  clinicName?: string
  channels?: ('email' | 'in_app' | 'sms')[]
}) {
  const payload: NotificationPayload = {
    type: 'appointment_reminder',
    recipientId: options.userId,
    recipientType: 'owner',
    tenantId: options.tenantId,
    title: `Recordatorio de Cita para ${options.petName}`,
    message: `Tienes una cita programada para ${options.petName} el ${options.appointmentDate} a las ${options.appointmentTime}.`,
    channels: options.channels || ['email', 'in_app'],
    priority: 'normal',
    actionUrl: `/portal/appointments/${options.appointmentId}`,
    data: {
      appointmentId: options.appointmentId,
      petName: options.petName,
      date: options.appointmentDate,
      time: options.appointmentTime,
      clinicName: options.clinicName,
    },
  }

  return sendNotification(payload)
}

/**
 * Send lab results ready notification
 */
export async function sendLabResultsReady(options: {
  userId: string
  tenantId: string
  petName: string
  resultType: string
  urgent?: boolean
  channels?: ('email' | 'in_app')[]
}) {
  const isUrgent = options.urgent === true
  
  const payload: NotificationPayload = {
    type: isUrgent ? 'lab_critical_result' : 'lab_results_ready',
    recipientId: options.userId,
    recipientType: 'owner',
    tenantId: options.tenantId,
    title: isUrgent 
      ? `⚠️ Resultado URGENTE para ${options.petName}` 
      : `Resultados listos para ${options.petName}`,
    message: isUrgent
      ? `Los resultados de ${options.resultType} para ${options.petName} requieren atención inmediata. Contacta a la clínica.`
      : `Los resultados de ${options.resultType} para ${options.petName} están listos para revisar.`,
    channels: options.channels || ['email', 'in_app'],
    priority: isUrgent ? 'urgent' : 'normal',
    actionUrl: `/portal/pets/${options.petName.toLowerCase()}/medical-records`,
    data: {
      petName: options.petName,
      resultType: options.resultType,
      urgent: isUrgent,
    },
  }

  return sendNotification(payload)
}

/**
 * Send order confirmation notification
 */
export async function sendOrderConfirmation(options: {
  userId: string
  tenantId: string
  orderId: string
  orderTotal: string
  expectedDelivery?: string
  channels?: ('email' | 'in_app')[]
}) {
  const payload: NotificationPayload = {
    type: 'order_confirmation',
    recipientId: options.userId,
    recipientType: 'owner',
    tenantId: options.tenantId,
    title: 'Pedido Confirmado',
    message: `Tu pedido #${options.orderId} por ${options.orderTotal} ha sido confirmado.${
      options.expectedDelivery ? ` Entrega esperada: ${options.expectedDelivery}.` : ''
    }`,
    channels: options.channels || ['email', 'in_app'],
    priority: 'normal',
    actionUrl: `/portal/orders/${options.orderId}`,
    data: {
      orderId: options.orderId,
      total: options.orderTotal,
      expectedDelivery: options.expectedDelivery,
    },
  }

  return sendNotification(payload)
}

/**
 * Send low stock alert to staff
 */
export async function sendLowStockAlert(options: {
  tenantId: string
  productName: string
  currentStock: number
  reorderPoint: number
  productId?: string
}) {
  return notifyStaff({
    tenantId: options.tenantId,
    type: 'low_stock_alert',
    title: 'Alerta de Stock Bajo',
    message: `El producto "${options.productName}" tiene stock bajo (${options.currentStock} unidades). Punto de reorden: ${options.reorderPoint}.`,
    channels: ['email', 'in_app'],
    roles: ['admin', 'vet'], // Only notify admins and vets
    data: {
      productName: options.productName,
      currentStock: options.currentStock,
      reorderPoint: options.reorderPoint,
      productId: options.productId,
    },
  })
}

/**
 * Send waitlist slot available notification
 */
export async function sendWaitlistSlotAvailable(options: {
  userId: string
  tenantId: string
  availableDate: string
  availableTime: string
  expiresAt?: string
  channels?: ('email' | 'in_app' | 'sms')[]
}) {
  const payload: NotificationPayload = {
    type: 'waitlist_slot_available',
    recipientId: options.userId,
    recipientType: 'owner',
    tenantId: options.tenantId,
    title: '¡Cita Disponible!',
    message: `Se ha liberado una cita para el ${options.availableDate} a las ${options.availableTime}.${
      options.expiresAt ? ` Esta oferta expira ${options.expiresAt}.` : ''
    }`,
    channels: options.channels || ['email', 'in_app', 'sms'],
    priority: 'high',
    actionUrl: `/portal/appointments/book`,
    data: {
      availableDate: options.availableDate,
      availableTime: options.availableTime,
      expiresAt: options.expiresAt,
    },
  }

  return sendNotification(payload)
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Send simple in-app notification
 */
export async function sendSimpleNotification(options: {
  userId: string
  title: string
  message: string
  actionUrl?: string
  type?: string
}) {
  return sendInAppNotification({
    userId: options.userId,
    type: options.type || 'custom',
    title: options.title,
    message: options.message,
    data: {
      actionUrl: options.actionUrl,
    },
  })
}

/**
 * Send bulk notifications to multiple users
 */
export async function sendBulkNotifications(
  users: Array<{ id: string; tenantId: string }>,
  notificationTemplate: Omit<NotificationPayload, 'recipientId' | 'tenantId'>
) {
  const promises = users.map(user => 
    sendNotification({
      ...notificationTemplate,
      recipientId: user.id,
      tenantId: user.tenantId,
    })
  )

  const results = await Promise.allSettled(promises)
  
  return {
    total: users.length,
    successful: results.filter(r => r.status === 'fulfilled' && r.value.success).length,
    failed: results.filter(r => r.status === 'rejected' || (r.status === 'fulfilled' && !r.value.success)).length,
    results,
  }
}

/**
 * Schedule a notification for later (placeholder - would integrate with job queue)
 */
export async function scheduleNotification(
  payload: NotificationPayload,
  scheduledAt: Date
) {
  // This would typically integrate with a job queue like Bull, Inngest, or similar
  // For now, just log the scheduled notification
  logger.debug('Scheduled notification:', {
    ...payload,
    scheduledAt: scheduledAt.toISOString(),
  })

  return {
    success: true,
    message: 'Notification scheduled (mock implementation)',
    scheduledAt: scheduledAt.toISOString(),
  }
}

// =============================================================================
// Notification Preferences
// =============================================================================

/**
 * Get user notification preferences (placeholder)
 */
export async function getUserNotificationPreferences(userId: string) {
  // This would read from a user_notification_preferences table
  // For now, return default preferences
  return {
    email: true,
    push: true,
    sms: false,
    in_app: true,
    types: {
      appointment_reminder: ['email', 'in_app'],
      lab_results_ready: ['email', 'in_app'],
      lab_critical_result: ['email', 'in_app', 'sms'],
      order_confirmation: ['email'],
      low_stock_alert: [], // Not applicable for owners
    },
  }
}

/**
 * Update user notification preferences (placeholder)
 */
export async function updateNotificationPreferences(
  userId: string, 
  preferences: Record<string, unknown>
) {
  // This would update a user_notification_preferences table
  logger.debug('Updated notification preferences for user:', { userId, preferences })
  
  return {
    success: true,
    message: 'Preferences updated (mock implementation)',
  }
}