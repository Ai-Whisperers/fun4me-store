/**
 * Notification types for in-app and external notifications
 */

export interface Notification {
  id: string
  user_id: string
  title: string
  message: string
  type: NotificationType
  action_url?: string
  read_at: string | null
  created_at: string
}

export type NotificationType =
  | 'appointment_reminder'
  | 'appointment_confirmed'
  | 'appointment_cancelled'
  | 'vaccine_due'
  | 'invoice_sent'
  | 'payment_received'
  | 'lab_results_ready'
  | 'message_received'
  | 'system_alert'

export interface NotificationPreferences {
  email_enabled: boolean
  push_enabled: boolean
  sms_enabled: boolean
  appointment_reminders: boolean
  vaccine_reminders: boolean
  marketing: boolean
}

/**
 * Type guard to check if a string is a valid NotificationType
 */
export function isNotificationType(value: string): value is NotificationType {
  return [
    'appointment_reminder',
    'appointment_confirmed',
    'appointment_cancelled',
    'vaccine_due',
    'invoice_sent',
    'payment_received',
    'lab_results_ready',
    'message_received',
    'system_alert',
  ].includes(value)
}

/**
 * Get user-friendly Spanish label for notification type
 */
export function getNotificationTypeLabel(type: NotificationType): string {
  const labels: Record<NotificationType, string> = {
    appointment_reminder: 'Recordatorio de cita',
    appointment_confirmed: 'Cita confirmada',
    appointment_cancelled: 'Cita cancelada',
    vaccine_due: 'Vacuna pendiente',
    invoice_sent: 'Factura enviada',
    payment_received: 'Pago recibido',
    lab_results_ready: 'Resultados de laboratorio listos',
    message_received: 'Mensaje recibido',
    system_alert: 'Alerta del sistema',
  }
  return labels[type]
}
