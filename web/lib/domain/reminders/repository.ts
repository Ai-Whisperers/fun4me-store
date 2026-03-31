/**
 * Reminders Repository
 *
 * Data access layer for reminder rules, reminders, and notifications.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  ReminderRule,
  CreateRuleInput,
  UpdateRuleInput,
  Reminder,
  ReminderWithRelations,
  ReminderFilters,
  CreateReminderInput,
  ReminderStatus,
  Notification,
  NotificationFilters,
  QueueNotificationInput,
} from './types'

export class ReminderRepository {
  constructor(private supabase: SupabaseClient) {}

  // ===========================================================================
  // REMINDER RULES
  // ===========================================================================

  async findRules(tenantId: string, activeOnly: boolean = true): Promise<ReminderRule[]> {
    let query = this.supabase
      .from('reminder_rules')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('type')
      .order('priority', { ascending: false })

    if (activeOnly) {
      query = query.eq('is_active', true)
    }

    const { data, error } = await query

    if (error) throw new Error(`Error al cargar reglas: ${error.message}`)
    return (data || []) as ReminderRule[]
  }

  async findRuleById(id: string, tenantId: string): Promise<ReminderRule | null> {
    const { data, error } = await this.supabase
      .from('reminder_rules')
      .select('*')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null
      throw new Error(`Error al cargar regla: ${error.message}`)
    }

    return data as ReminderRule
  }

  async createRule(tenantId: string, input: CreateRuleInput): Promise<ReminderRule> {
    const { data, error } = await this.supabase
      .from('reminder_rules')
      .insert({
        tenant_id: tenantId,
        name: input.name,
        description: input.description || null,
        type: input.type,
        days_offset: input.days_offset,
        hours_offset: input.hours_offset || 0,
        time_of_day: input.time_of_day || '09:00:00',
        channels: input.channels,
        template_id: input.template_id || null,
        conditions: input.conditions || null,
        priority: input.priority || 0,
        is_active: true,
      })
      .select()
      .single()

    if (error) throw new Error(`Error al crear regla: ${error.message}`)
    return data as ReminderRule
  }

  async updateRule(id: string, tenantId: string, updates: UpdateRuleInput): Promise<ReminderRule> {
    const { data, error } = await this.supabase
      .from('reminder_rules')
      .update(updates)
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .select()
      .single()

    if (error) throw new Error(`Error al actualizar regla: ${error.message}`)
    return data as ReminderRule
  }

  async deleteRule(id: string, tenantId: string): Promise<void> {
    const { error } = await this.supabase
      .from('reminder_rules')
      .delete()
      .eq('id', id)
      .eq('tenant_id', tenantId)

    if (error) throw new Error(`Error al eliminar regla: ${error.message}`)
  }

  // ===========================================================================
  // REMINDERS
  // ===========================================================================

  async findReminders(
    tenantId: string,
    filters: ReminderFilters = {}
  ): Promise<ReminderWithRelations[]> {
    let query = this.supabase
      .from('reminders')
      .select(
        `
        *,
        client:profiles!client_id(id, full_name, email, phone),
        pet:pets(id, name, species)
      `
      )
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .order('scheduled_at', { ascending: true })

    if (filters.client_id) {
      query = query.eq('client_id', filters.client_id)
    }

    if (filters.pet_id) {
      query = query.eq('pet_id', filters.pet_id)
    }

    if (filters.type) {
      query = query.eq('type', filters.type)
    }

    if (filters.status) {
      query = query.eq('status', filters.status)
    }

    if (filters.from_date) {
      query = query.gte('scheduled_at', filters.from_date)
    }

    if (filters.to_date) {
      query = query.lte('scheduled_at', filters.to_date)
    }

    if (filters.pending_only) {
      query = query.eq('status', 'pending')
    }

    const { data, error } = await query

    if (error) throw new Error(`Error al cargar recordatorios: ${error.message}`)
    return (data || []) as ReminderWithRelations[]
  }

  async findReminderById(id: string, tenantId: string): Promise<ReminderWithRelations | null> {
    const { data, error } = await this.supabase
      .from('reminders')
      .select(
        `
        *,
        client:profiles!client_id(id, full_name, email, phone),
        pet:pets(id, name, species)
      `
      )
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null
      throw new Error(`Error al cargar recordatorio: ${error.message}`)
    }

    return data as ReminderWithRelations
  }

  async createReminder(tenantId: string, input: CreateReminderInput): Promise<Reminder> {
    const { data, error } = await this.supabase
      .from('reminders')
      .insert({
        tenant_id: tenantId,
        client_id: input.client_id,
        pet_id: input.pet_id || null,
        type: input.type,
        reference_type: input.reference_type || null,
        reference_id: input.reference_id || null,
        scheduled_at: input.scheduled_at,
        status: 'pending',
        custom_subject: input.custom_subject || null,
        custom_body: input.custom_body || null,
      })
      .select()
      .single()

    if (error) throw new Error(`Error al crear recordatorio: ${error.message}`)
    return data as Reminder
  }

  async updateReminderStatus(
    id: string,
    tenantId: string,
    status: ReminderStatus
  ): Promise<Reminder> {
    const { data, error } = await this.supabase
      .from('reminders')
      .update({ status })
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .select()
      .single()

    if (error) throw new Error(`Error al actualizar estado: ${error.message}`)
    return data as Reminder
  }

  async findDueReminders(tenantId: string, limit: number = 100): Promise<ReminderWithRelations[]> {
    const now = new Date().toISOString()

    const { data, error } = await this.supabase
      .from('reminders')
      .select(
        `
        *,
        client:profiles!client_id(id, full_name, email, phone),
        pet:pets(id, name, species)
      `
      )
      .eq('tenant_id', tenantId)
      .eq('status', 'pending')
      .lte('scheduled_at', now)
      .is('deleted_at', null)
      .order('scheduled_at', { ascending: true })
      .limit(limit)

    if (error) throw new Error(`Error al obtener recordatorios: ${error.message}`)
    return (data || []) as ReminderWithRelations[]
  }

  async markReminderSent(id: string, tenantId: string): Promise<Reminder> {
    const { data, error } = await this.supabase
      .from('reminders')
      .update({
        status: 'sent',
        attempts: 1,
        last_attempt_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .select()
      .single()

    if (error) throw new Error(`Error al marcar como enviado: ${error.message}`)
    return data as Reminder
  }

  async markReminderFailed(
    id: string,
    tenantId: string,
    attempts: number,
    maxAttempts: number,
    errorMessage: string
  ): Promise<Reminder> {
    const status = attempts >= maxAttempts ? 'failed' : 'pending'
    const nextAttempt =
      status === 'pending'
        ? new Date(Date.now() + Math.pow(2, attempts) * 60000).toISOString()
        : null

    const { data, error } = await this.supabase
      .from('reminders')
      .update({
        status,
        attempts,
        last_attempt_at: new Date().toISOString(),
        next_attempt_at: nextAttempt,
        error_message: errorMessage,
      })
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .select()
      .single()

    if (error) throw new Error(`Error al marcar como fallido: ${error.message}`)
    return data as Reminder
  }

  async getReminderForRetry(id: string): Promise<{ attempts: number; max_attempts: number } | null> {
    const { data, error } = await this.supabase
      .from('reminders')
      .select('attempts, max_attempts')
      .eq('id', id)
      .single()

    if (error) return null
    return data
  }

  // ===========================================================================
  // NOTIFICATIONS
  // ===========================================================================

  async findNotifications(
    tenantId: string,
    filters: NotificationFilters = {}
  ): Promise<Notification[]> {
    let query = this.supabase
      .from('notification_queue')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })

    if (filters.reminder_id) {
      query = query.eq('reminder_id', filters.reminder_id)
    }

    if (filters.client_id) {
      query = query.eq('client_id', filters.client_id)
    }

    if (filters.channel_type) {
      query = query.eq('channel_type', filters.channel_type)
    }

    if (filters.status) {
      query = query.eq('status', filters.status)
    }

    if (filters.from_date) {
      query = query.gte('created_at', filters.from_date)
    }

    if (filters.to_date) {
      query = query.lte('created_at', filters.to_date)
    }

    const { data, error } = await query

    if (error) throw new Error(`Error al cargar notificaciones: ${error.message}`)
    return (data || []) as Notification[]
  }

  async queueNotification(tenantId: string, input: QueueNotificationInput): Promise<Notification> {
    const { data, error } = await this.supabase
      .from('notification_queue')
      .insert({
        tenant_id: tenantId,
        reminder_id: input.reminder_id || null,
        client_id: input.client_id,
        channel_type: input.channel_type,
        destination: input.destination,
        subject: input.subject || null,
        body: input.body,
        status: 'queued',
      })
      .select()
      .single()

    if (error) throw new Error(`Error al encolar notificación: ${error.message}`)
    return data as Notification
  }

  // ===========================================================================
  // STATISTICS
  // ===========================================================================

  async getRemindersForStats(
    tenantId: string
  ): Promise<Array<{ id: string; type: string; status: string; updated_at: string }>> {
    const { data, error } = await this.supabase
      .from('reminders')
      .select('id, type, status, updated_at')
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)

    if (error) throw new Error(`Error al obtener estadísticas: ${error.message}`)
    return data || []
  }
}
