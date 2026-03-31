/**
 * ReminderService - Automated Reminder Management Service Layer
 *
 * Handles reminder operations:
 * - Reminder rules configuration
 * - Creating and scheduling reminders
 * - Processing reminder queues
 * - Tracking delivery status
 *
 * @example
 * ```typescript
 * const service = new ReminderService(supabase);
 * const result = await service.createReminder({
 *   client_id: 'user-123',
 *   pet_id: 'pet-456',
 *   type: 'vaccine_reminder',
 *   scheduled_at: '2024-03-15T09:00:00Z'
 * });
 * ```
 */

import { BaseService, type ServiceResult } from './base-service';

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

export type ReminderType =
  | 'vaccine_reminder'
  | 'vaccine_overdue'
  | 'appointment_reminder'
  | 'appointment_confirmation'
  | 'appointment_cancelled'
  | 'invoice_sent'
  | 'payment_received'
  | 'payment_overdue'
  | 'birthday'
  | 'follow_up'
  | 'lab_results_ready'
  | 'hospitalization_update'
  | 'custom';

export type ReminderStatus = 'pending' | 'processing' | 'sent' | 'failed' | 'cancelled' | 'skipped';

export type RuleType =
  | 'vaccine_due'
  | 'vaccine_overdue'
  | 'appointment_before'
  | 'appointment_after'
  | 'birthday'
  | 'wellness_checkup'
  | 'medication_refill'
  | 'custom';

export type NotificationChannel = 'email' | 'sms' | 'whatsapp' | 'push' | 'in_app';

export type NotificationStatus =
  | 'queued'
  | 'sending'
  | 'sent'
  | 'delivered'
  | 'failed'
  | 'bounced';

/**
 * Reminder rule configuration
 */
export interface ReminderRule {
  id: string;
  tenant_id: string;
  name: string;
  description: string | null;
  type: RuleType;
  days_offset: number;
  hours_offset: number;
  time_of_day: string;
  channels: NotificationChannel[];
  template_id: string | null;
  conditions: Record<string, unknown> | null;
  priority: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Reminder record
 */
export interface Reminder {
  id: string;
  tenant_id: string;
  client_id: string;
  pet_id: string | null;
  type: ReminderType;
  reference_type: string | null;
  reference_id: string | null;
  scheduled_at: string;
  status: ReminderStatus;
  attempts: number;
  max_attempts: number;
  last_attempt_at: string | null;
  next_attempt_at: string | null;
  error_message: string | null;
  custom_subject: string | null;
  custom_body: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Reminder with related data
 */
export interface ReminderWithRelations extends Reminder {
  client?: {
    id: string;
    full_name: string;
    email: string;
    phone: string | null;
  };
  pet?: {
    id: string;
    name: string;
    species: string;
  };
}

/**
 * Notification queue entry
 */
export interface Notification {
  id: string;
  tenant_id: string;
  reminder_id: string | null;
  client_id: string;
  channel_type: NotificationChannel;
  destination: string;
  subject: string | null;
  body: string;
  status: NotificationStatus;
  sent_at: string | null;
  delivered_at: string | null;
  opened_at: string | null;
  clicked_at: string | null;
  error_code: string | null;
  error_message: string | null;
  created_at: string;
}

/**
 * Input for creating a rule
 */
export interface CreateRuleInput extends Record<string, unknown> {
  name: string;
  description?: string;
  type: RuleType;
  days_offset: number;
  hours_offset?: number;
  time_of_day?: string;
  channels: NotificationChannel[];
  template_id?: string;
  conditions?: Record<string, unknown>;
  priority?: number;
}

/**
 * Input for creating a reminder
 */
export interface CreateReminderInput extends Record<string, unknown> {
  client_id: string;
  pet_id?: string;
  type: ReminderType;
  reference_type?: string;
  reference_id?: string;
  scheduled_at: string;
  custom_subject?: string;
  custom_body?: string;
}

/**
 * Filters for listing reminders
 */
export interface ReminderFilters {
  client_id?: string;
  pet_id?: string;
  type?: ReminderType;
  status?: ReminderStatus;
  from_date?: string;
  to_date?: string;
  pending_only?: boolean;
}

/**
 * Filters for listing notifications
 */
export interface NotificationFilters {
  reminder_id?: string;
  client_id?: string;
  channel_type?: NotificationChannel;
  status?: NotificationStatus;
  from_date?: string;
  to_date?: string;
}

// =============================================================================
// REMINDER SERVICE
// =============================================================================

export class ReminderService extends BaseService {
  // ---------------------------------------------------------------------------
  // REMINDER RULES
  // ---------------------------------------------------------------------------

  /**
   * List reminder rules for a tenant
   *
   * @param tenantId - Tenant ID
   * @param activeOnly - Only return active rules
   * @returns List of rules
   */
  async listRules(
    tenantId: string,
    activeOnly: boolean = true
  ): Promise<ServiceResult<ReminderRule[]>> {
    return this.handleError(async () => {
      let query = this.supabase
        .from('reminder_rules')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('type')
        .order('priority', { ascending: false });

      if (activeOnly) {
        query = query.eq('is_active', true);
      }

      const { data, error } = await query;

      if (error) throw error;
      return (data || []) as ReminderRule[];
    }, 'Error al cargar reglas de recordatorio');
  }

  /**
   * Get a rule by ID
   *
   * @param id - Rule ID
   * @param tenantId - Tenant ID for access control
   * @returns Rule
   */
  async getRuleById(id: string, tenantId: string): Promise<ServiceResult<ReminderRule>> {
    return this.handleError(async () => {
      const { data, error } = await this.supabase
        .from('reminder_rules')
        .select('*')
        .eq('id', id)
        .eq('tenant_id', tenantId)
        .single();

      if (error) throw error;
      if (!data) throw new Error('Regla no encontrada');

      return data as ReminderRule;
    }, 'Error al cargar regla');
  }

  /**
   * Create a reminder rule
   *
   * @param tenantId - Tenant ID
   * @param input - Rule data
   * @returns Created rule
   */
  async createRule(tenantId: string, input: CreateRuleInput): Promise<ServiceResult<ReminderRule>> {
    return this.handleError(async () => {
      this.validateRequiredFields(input, ['name', 'type', 'days_offset', 'channels']);

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
        .single();

      if (error) throw error;
      return data as ReminderRule;
    }, 'Error al crear regla');
  }

  /**
   * Update a reminder rule
   *
   * @param id - Rule ID
   * @param tenantId - Tenant ID
   * @param updates - Fields to update
   * @returns Updated rule
   */
  async updateRule(
    id: string,
    tenantId: string,
    updates: Partial<CreateRuleInput> & { is_active?: boolean }
  ): Promise<ServiceResult<ReminderRule>> {
    return this.handleError(async () => {
      const { data, error } = await this.supabase
        .from('reminder_rules')
        .update(updates)
        .eq('id', id)
        .eq('tenant_id', tenantId)
        .select()
        .single();

      if (error) throw error;
      if (!data) throw new Error('Regla no encontrada');

      return data as ReminderRule;
    }, 'Error al actualizar regla');
  }

  /**
   * Delete a reminder rule
   *
   * @param id - Rule ID
   * @param tenantId - Tenant ID
   * @returns Success status
   */
  async deleteRule(id: string, tenantId: string): Promise<ServiceResult<void>> {
    return this.handleError(async () => {
      const { error } = await this.supabase
        .from('reminder_rules')
        .delete()
        .eq('id', id)
        .eq('tenant_id', tenantId);

      if (error) throw error;
    }, 'Error al eliminar regla');
  }

  // ---------------------------------------------------------------------------
  // REMINDERS
  // ---------------------------------------------------------------------------

  /**
   * List reminders for a tenant
   *
   * @param tenantId - Tenant ID
   * @param filters - Optional filters
   * @returns List of reminders
   */
  async listReminders(
    tenantId: string,
    filters?: ReminderFilters
  ): Promise<ServiceResult<ReminderWithRelations[]>> {
    return this.handleError(async () => {
      let query = this.supabase
        .from('reminders')
        .select(`
          *,
          client:profiles!client_id(id, full_name, email, phone),
          pet:pets(id, name, species)
        `)
        .eq('tenant_id', tenantId)
        .is('deleted_at', null)
        .order('scheduled_at', { ascending: true });

      // Apply filters
      if (filters?.client_id) {
        query = query.eq('client_id', filters.client_id);
      }

      if (filters?.pet_id) {
        query = query.eq('pet_id', filters.pet_id);
      }

      if (filters?.type) {
        query = query.eq('type', filters.type);
      }

      if (filters?.status) {
        query = query.eq('status', filters.status);
      }

      if (filters?.from_date) {
        query = query.gte('scheduled_at', filters.from_date);
      }

      if (filters?.to_date) {
        query = query.lte('scheduled_at', filters.to_date);
      }

      if (filters?.pending_only) {
        query = query.eq('status', 'pending');
      }

      const { data, error } = await query;

      if (error) throw error;
      return (data || []) as ReminderWithRelations[];
    }, 'Error al cargar recordatorios');
  }

  /**
   * Get a reminder by ID
   *
   * @param id - Reminder ID
   * @param tenantId - Tenant ID for access control
   * @returns Reminder
   */
  async getReminderById(
    id: string,
    tenantId: string
  ): Promise<ServiceResult<ReminderWithRelations>> {
    return this.handleError(async () => {
      const { data, error } = await this.supabase
        .from('reminders')
        .select(`
          *,
          client:profiles!client_id(id, full_name, email, phone),
          pet:pets(id, name, species)
        `)
        .eq('id', id)
        .eq('tenant_id', tenantId)
        .is('deleted_at', null)
        .single();

      if (error) throw error;
      if (!data) throw new Error('Recordatorio no encontrado');

      return data as ReminderWithRelations;
    }, 'Error al cargar recordatorio');
  }

  /**
   * Create a reminder
   *
   * @param tenantId - Tenant ID
   * @param input - Reminder data
   * @returns Created reminder
   */
  async createReminder(
    tenantId: string,
    input: CreateReminderInput
  ): Promise<ServiceResult<Reminder>> {
    return this.handleError(async () => {
      this.validateRequiredFields(input, ['client_id', 'type', 'scheduled_at']);

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
        .single();

      if (error) throw error;
      return data as Reminder;
    }, 'Error al crear recordatorio');
  }

  /**
   * Cancel a pending reminder
   *
   * @param id - Reminder ID
   * @param tenantId - Tenant ID
   * @returns Updated reminder
   */
  async cancelReminder(id: string, tenantId: string): Promise<ServiceResult<Reminder>> {
    return this.handleError(async () => {
      // Verify reminder exists and is pending
      const existing = await this.getReminderById(id, tenantId);
      if (!existing.success) {
        throw new Error('Recordatorio no encontrado');
      }

      if (existing.data.status !== 'pending') {
        throw new Error('Solo se pueden cancelar recordatorios pendientes');
      }

      const { data, error } = await this.supabase
        .from('reminders')
        .update({ status: 'cancelled' })
        .eq('id', id)
        .eq('tenant_id', tenantId)
        .select()
        .single();

      if (error) throw error;
      return data as Reminder;
    }, 'Error al cancelar recordatorio');
  }

  /**
   * Get pending reminders due for processing
   *
   * @param tenantId - Tenant ID
   * @param limit - Max reminders to return
   * @returns List of due reminders
   */
  async getDueReminders(
    tenantId: string,
    limit: number = 100
  ): Promise<ServiceResult<ReminderWithRelations[]>> {
    return this.handleError(async () => {
      const now = new Date().toISOString();

      const { data, error } = await this.supabase
        .from('reminders')
        .select(`
          *,
          client:profiles!client_id(id, full_name, email, phone),
          pet:pets(id, name, species)
        `)
        .eq('tenant_id', tenantId)
        .eq('status', 'pending')
        .lte('scheduled_at', now)
        .is('deleted_at', null)
        .order('scheduled_at', { ascending: true })
        .limit(limit);

      if (error) throw error;
      return (data || []) as ReminderWithRelations[];
    }, 'Error al obtener recordatorios pendientes');
  }

  /**
   * Mark reminder as sent
   *
   * @param id - Reminder ID
   * @param tenantId - Tenant ID
   * @returns Updated reminder
   */
  async markAsSent(id: string, tenantId: string): Promise<ServiceResult<Reminder>> {
    return this.handleError(async () => {
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
        .single();

      if (error) throw error;
      return data as Reminder;
    }, 'Error al actualizar recordatorio');
  }

  /**
   * Mark reminder as failed
   *
   * @param id - Reminder ID
   * @param tenantId - Tenant ID
   * @param errorMessage - Error message
   * @returns Updated reminder
   */
  async markAsFailed(
    id: string,
    tenantId: string,
    errorMessage: string
  ): Promise<ServiceResult<Reminder>> {
    return this.handleError(async () => {
      // Get current reminder to check attempts
      const { data: current } = await this.supabase
        .from('reminders')
        .select('attempts, max_attempts')
        .eq('id', id)
        .single();

      const attempts = (current?.attempts || 0) + 1;
      const maxAttempts = current?.max_attempts || 3;
      const status = attempts >= maxAttempts ? 'failed' : 'pending';

      // Calculate next retry (exponential backoff)
      const nextAttempt = status === 'pending'
        ? new Date(Date.now() + Math.pow(2, attempts) * 60000).toISOString()
        : null;

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
        .single();

      if (error) throw error;
      return data as Reminder;
    }, 'Error al actualizar recordatorio');
  }

  // ---------------------------------------------------------------------------
  // NOTIFICATIONS
  // ---------------------------------------------------------------------------

  /**
   * List notification queue entries
   *
   * @param tenantId - Tenant ID
   * @param filters - Optional filters
   * @returns List of notifications
   */
  async listNotifications(
    tenantId: string,
    filters?: NotificationFilters
  ): Promise<ServiceResult<Notification[]>> {
    return this.handleError(async () => {
      let query = this.supabase
        .from('notification_queue')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false });

      if (filters?.reminder_id) {
        query = query.eq('reminder_id', filters.reminder_id);
      }

      if (filters?.client_id) {
        query = query.eq('client_id', filters.client_id);
      }

      if (filters?.channel_type) {
        query = query.eq('channel_type', filters.channel_type);
      }

      if (filters?.status) {
        query = query.eq('status', filters.status);
      }

      if (filters?.from_date) {
        query = query.gte('created_at', filters.from_date);
      }

      if (filters?.to_date) {
        query = query.lte('created_at', filters.to_date);
      }

      const { data, error } = await query;

      if (error) throw error;
      return (data || []) as Notification[];
    }, 'Error al cargar notificaciones');
  }

  /**
   * Queue a notification for sending
   *
   * @param tenantId - Tenant ID
   * @param notification - Notification data
   * @returns Created notification
   */
  async queueNotification(
    tenantId: string,
    notification: {
      reminder_id?: string;
      client_id: string;
      channel_type: NotificationChannel;
      destination: string;
      subject?: string;
      body: string;
    }
  ): Promise<ServiceResult<Notification>> {
    return this.handleError(async () => {
      this.validateRequiredFields(notification, [
        'client_id',
        'channel_type',
        'destination',
        'body',
      ]);

      const { data, error } = await this.supabase
        .from('notification_queue')
        .insert({
          tenant_id: tenantId,
          reminder_id: notification.reminder_id || null,
          client_id: notification.client_id,
          channel_type: notification.channel_type,
          destination: notification.destination,
          subject: notification.subject || null,
          body: notification.body,
          status: 'queued',
        })
        .select()
        .single();

      if (error) throw error;
      return data as Notification;
    }, 'Error al encolar notificación');
  }

  // ---------------------------------------------------------------------------
  // STATISTICS
  // ---------------------------------------------------------------------------

  /**
   * Get reminder statistics
   *
   * @param tenantId - Tenant ID
   * @returns Reminder stats
   */
  async getStats(tenantId: string): Promise<ServiceResult<{
    pending_count: number;
    sent_today: number;
    failed_count: number;
    success_rate: number;
    by_type: Record<string, number>;
  }>> {
    return this.handleError(async () => {
      const today = new Date().toISOString().split('T')[0];

      const { data: reminders, error } = await this.supabase
        .from('reminders')
        .select('id, type, status, updated_at')
        .eq('tenant_id', tenantId)
        .is('deleted_at', null);

      if (error) throw error;

      const stats = {
        pending_count: reminders?.filter((r: { status: string }) => r.status === 'pending').length || 0,
        sent_today: reminders?.filter(
          (r: { status: string; updated_at: string }) =>
            r.status === 'sent' && r.updated_at.startsWith(today)
        ).length || 0,
        failed_count: reminders?.filter((r: { status: string }) => r.status === 'failed').length || 0,
        success_rate: 0,
        by_type: {} as Record<string, number>,
      };

      // Calculate success rate
      const completed = reminders?.filter(
        (r: { status: string }) => r.status === 'sent' || r.status === 'failed'
      ) || [];
      const sent = completed.filter((r: { status: string }) => r.status === 'sent').length;
      stats.success_rate = completed.length > 0 ? (sent / completed.length) * 100 : 100;

      // Group by type
      reminders?.forEach((r: { type: string }) => {
        stats.by_type[r.type] = (stats.by_type[r.type] || 0) + 1;
      });

      return stats;
    }, 'Error al obtener estadísticas');
  }
}
