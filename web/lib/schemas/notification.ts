/**
 * Notification settings validation schemas
 */

import { z } from 'zod'

/**
 * Schema for user notification settings update
 */
export const notificationSettingsSchema = z.object({
  settings: z.object({
    email_vaccine_reminders: z.boolean().optional(),
    email_appointment_reminders: z.boolean().optional(),
    email_promotions: z.boolean().optional(),
    sms_vaccine_reminders: z.boolean().optional(),
    sms_appointment_reminders: z.boolean().optional(),
    whatsapp_enabled: z.boolean().optional(),
  }),
})

export type NotificationSettingsInput = z.infer<typeof notificationSettingsSchema>
