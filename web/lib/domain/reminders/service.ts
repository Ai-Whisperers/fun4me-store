/**
 * Reminders Service
 *
 * Business logic for reminder rules, reminders, and notifications.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { ReminderRepository } from './repository'
import type {
  ReminderRule,
  CreateRuleInput,
  UpdateRuleInput,
  Reminder,
  ReminderWithRelations,
  ReminderFilters,
  CreateReminderInput,
  Notification,
  NotificationFilters,
  QueueNotificationInput,
  ReminderStats,
} from './types'
import { logger } from '@/lib/logger'

export class ReminderService {
  private repository: ReminderRepository

  constructor(private supabase: SupabaseClient) {
    this.repository = new ReminderRepository(supabase)
  }

  // ===========================================================================
  // REMINDER RULES
  // ===========================================================================

  async listRules(tenantId: string, activeOnly: boolean = true): Promise<ReminderRule[]> {
    return this.repository.findRules(tenantId, activeOnly)
  }

  async getRuleById(id: string, tenantId: string): Promise<ReminderRule | null> {
    return this.repository.findRuleById(id, tenantId)
  }

  async createRule(tenantId: string, input: CreateRuleInput): Promise<ReminderRule> {
    if (!input.name || !input.type || input.days_offset === undefined || !input.channels?.length) {
      throw new Error('Campos requeridos: name, type, days_offset, channels')
    }

    const rule = await this.repository.createRule(tenantId, input)

    logger.info('[ReminderService] Rule created', {
      ruleId: rule.id,
      type: input.type,
    })

    return rule
  }

  async updateRule(id: string, tenantId: string, updates: UpdateRuleInput): Promise<ReminderRule> {
    const rule = await this.repository.updateRule(id, tenantId, updates)

    logger.info('[ReminderService] Rule updated', { ruleId: id })

    return rule
  }

  async deleteRule(id: string, tenantId: string): Promise<void> {
    await this.repository.deleteRule(id, tenantId)

    logger.info('[ReminderService] Rule deleted', { ruleId: id })
  }

  // ===========================================================================
  // REMINDERS
  // ===========================================================================

  async listReminders(
    tenantId: string,
    filters?: ReminderFilters
  ): Promise<ReminderWithRelations[]> {
    return this.repository.findReminders(tenantId, filters)
  }

  async getReminderById(id: string, tenantId: string): Promise<ReminderWithRelations | null> {
    return this.repository.findReminderById(id, tenantId)
  }

  async createReminder(tenantId: string, input: CreateReminderInput): Promise<Reminder> {
    if (!input.client_id || !input.type || !input.scheduled_at) {
      throw new Error('Campos requeridos: client_id, type, scheduled_at')
    }

    const reminder = await this.repository.createReminder(tenantId, input)

    logger.info('[ReminderService] Reminder created', {
      reminderId: reminder.id,
      type: input.type,
      scheduledAt: input.scheduled_at,
    })

    return reminder
  }

  async cancelReminder(id: string, tenantId: string): Promise<Reminder> {
    const existing = await this.repository.findReminderById(id, tenantId)
    if (!existing) {
      throw new Error('Recordatorio no encontrado')
    }

    if (existing.status !== 'pending') {
      throw new Error('Solo se pueden cancelar recordatorios pendientes')
    }

    const reminder = await this.repository.updateReminderStatus(id, tenantId, 'cancelled')

    logger.info('[ReminderService] Reminder cancelled', { reminderId: id })

    return reminder
  }

  async getDueReminders(tenantId: string, limit: number = 100): Promise<ReminderWithRelations[]> {
    return this.repository.findDueReminders(tenantId, limit)
  }

  async markAsSent(id: string, tenantId: string): Promise<Reminder> {
    const reminder = await this.repository.markReminderSent(id, tenantId)

    logger.info('[ReminderService] Reminder marked as sent', { reminderId: id })

    return reminder
  }

  async markAsFailed(id: string, tenantId: string, errorMessage: string): Promise<Reminder> {
    const current = await this.repository.getReminderForRetry(id)
    const attempts = (current?.attempts || 0) + 1
    const maxAttempts = current?.max_attempts || 3

    const reminder = await this.repository.markReminderFailed(
      id,
      tenantId,
      attempts,
      maxAttempts,
      errorMessage
    )

    logger.warn('[ReminderService] Reminder marked as failed', {
      reminderId: id,
      attempts,
      maxAttempts,
      errorMessage,
    })

    return reminder
  }

  // ===========================================================================
  // NOTIFICATIONS
  // ===========================================================================

  async listNotifications(
    tenantId: string,
    filters?: NotificationFilters
  ): Promise<Notification[]> {
    return this.repository.findNotifications(tenantId, filters)
  }

  async queueNotification(tenantId: string, input: QueueNotificationInput): Promise<Notification> {
    if (!input.client_id || !input.channel_type || !input.destination || !input.body) {
      throw new Error('Campos requeridos: client_id, channel_type, destination, body')
    }

    const notification = await this.repository.queueNotification(tenantId, input)

    logger.info('[ReminderService] Notification queued', {
      notificationId: notification.id,
      channel: input.channel_type,
    })

    return notification
  }

  // ===========================================================================
  // STATISTICS
  // ===========================================================================

  async getStats(tenantId: string): Promise<ReminderStats> {
    const today = new Date().toISOString().split('T')[0]
    const reminders = await this.repository.getRemindersForStats(tenantId)

    const stats: ReminderStats = {
      pending_count: reminders.filter((r) => r.status === 'pending').length,
      sent_today: reminders.filter(
        (r) => r.status === 'sent' && r.updated_at.startsWith(today)
      ).length,
      failed_count: reminders.filter((r) => r.status === 'failed').length,
      success_rate: 0,
      by_type: {},
    }

    // Calculate success rate
    const completed = reminders.filter((r) => r.status === 'sent' || r.status === 'failed')
    const sent = completed.filter((r) => r.status === 'sent').length
    stats.success_rate = completed.length > 0 ? (sent / completed.length) * 100 : 100

    // Group by type
    reminders.forEach((r) => {
      stats.by_type[r.type] = (stats.by_type[r.type] || 0) + 1
    })

    return stats
  }
}
