/**
 * ReminderService Tests
 *
 * Tests reminder management functionality:
 * - Reminder rules configuration
 * - Creating and scheduling reminders
 * - Processing reminder status
 * - Notification queue
 * - Statistics
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  ReminderService,
  type ReminderRule,
  type Reminder,
  type ReminderWithRelations,
  type Notification,
} from '@/lib/services/reminder-service';
import { createMockSupabaseClient, type MockSupabaseClient } from './__mocks__/supabase-mock';

// Mock the logger
vi.mock('@/lib/logger', () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

// =============================================================================
// TEST DATA FACTORIES
// =============================================================================

const TEST_TENANT_ID = 'tenant-vet-clinic';
const TEST_CLIENT_ID = 'client-john-123';
const TEST_PET_ID = 'pet-max-456';

function createMockRule(overrides: Partial<ReminderRule> = {}): ReminderRule {
  return {
    id: 'rule-123',
    tenant_id: TEST_TENANT_ID,
    name: 'Recordatorio de Vacuna',
    description: 'Enviar 7 días antes de que venza',
    type: 'vaccine_due',
    days_offset: -7,
    hours_offset: 0,
    time_of_day: '09:00:00',
    channels: ['email', 'sms'],
    template_id: null,
    conditions: null,
    priority: 0,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

function createMockReminder(overrides: Partial<Reminder> = {}): Reminder {
  return {
    id: 'rem-123',
    tenant_id: TEST_TENANT_ID,
    client_id: TEST_CLIENT_ID,
    pet_id: TEST_PET_ID,
    type: 'vaccine_reminder',
    reference_type: 'vaccine',
    reference_id: 'vac-789',
    scheduled_at: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
    status: 'pending',
    attempts: 0,
    max_attempts: 3,
    last_attempt_at: null,
    next_attempt_at: null,
    error_message: null,
    custom_subject: null,
    custom_body: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

function createMockReminderWithRelations(
  overrides: Partial<ReminderWithRelations> = {}
): ReminderWithRelations {
  return {
    ...createMockReminder(),
    client: {
      id: TEST_CLIENT_ID,
      full_name: 'John Doe',
      email: 'john@example.com',
      phone: '+1234567890',
    },
    pet: {
      id: TEST_PET_ID,
      name: 'Max',
      species: 'dog',
    },
    ...overrides,
  };
}

function createMockNotification(overrides: Partial<Notification> = {}): Notification {
  return {
    id: 'notif-123',
    tenant_id: TEST_TENANT_ID,
    reminder_id: 'rem-123',
    client_id: TEST_CLIENT_ID,
    channel_type: 'email',
    destination: 'john@example.com',
    subject: 'Recordatorio de Vacuna',
    body: 'Tu mascota Max tiene una vacuna pendiente.',
    status: 'queued',
    sent_at: null,
    delivered_at: null,
    opened_at: null,
    clicked_at: null,
    error_code: null,
    error_message: null,
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

// =============================================================================
// TESTS
// =============================================================================

describe('ReminderService', () => {
  let mockClient: MockSupabaseClient;
  let service: ReminderService;

  beforeEach(() => {
    mockClient = createMockSupabaseClient();
    service = new ReminderService(mockClient as never);
    vi.clearAllMocks();
  });

  // ===========================================================================
  // REMINDER RULES
  // ===========================================================================

  describe('listRules', () => {
    it('should return active rules for tenant', async () => {
      const rules = [
        createMockRule({ id: 'rule-1' }),
        createMockRule({ id: 'rule-2', type: 'appointment_before' }),
      ];

      mockClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({ data: rules, error: null }),
              }),
            }),
          }),
        }),
      });

      const result = await service.listRules(TEST_TENANT_ID);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.length).toBe(2);
      }
    });

    it('should include inactive rules when requested', async () => {
      const rules = [createMockRule({ is_active: false })];

      mockClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({ data: rules, error: null }),
            }),
          }),
        }),
      });

      const result = await service.listRules(TEST_TENANT_ID, false);

      expect(result.success).toBe(true);
    });
  });

  describe('createRule', () => {
    it('should create a reminder rule', async () => {
      const rule = createMockRule();

      mockClient.from.mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: rule, error: null }),
          }),
        }),
      });

      const result = await service.createRule(TEST_TENANT_ID, {
        name: 'Recordatorio de Vacuna',
        type: 'vaccine_due',
        days_offset: -7,
        channels: ['email', 'sms'],
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.type).toBe('vaccine_due');
      }
    });

    it('should fail when required fields missing', async () => {
      const result = await service.createRule(TEST_TENANT_ID, {
        name: '',
        type: 'vaccine_due',
        days_offset: -7,
        channels: [],
      });

      expect(result.success).toBe(false);
    });
  });

  describe('updateRule', () => {
    it('should update a rule', async () => {
      const updatedRule = createMockRule({ days_offset: -14 });

      mockClient.from.mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: updatedRule, error: null }),
              }),
            }),
          }),
        }),
      });

      const result = await service.updateRule('rule-123', TEST_TENANT_ID, {
        days_offset: -14,
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.days_offset).toBe(-14);
      }
    });
  });

  describe('deleteRule', () => {
    it('should delete a rule', async () => {
      mockClient.from.mockReturnValue({
        delete: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: null }),
          }),
        }),
      });

      const result = await service.deleteRule('rule-123', TEST_TENANT_ID);

      expect(result.success).toBe(true);
    });
  });

  // ===========================================================================
  // REMINDERS
  // ===========================================================================

  describe('listReminders', () => {
    it('should return reminders for tenant', async () => {
      const reminders = [
        createMockReminderWithRelations({ id: 'rem-1' }),
        createMockReminderWithRelations({ id: 'rem-2' }),
      ];

      mockClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            is: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({ data: reminders, error: null }),
            }),
          }),
        }),
      });

      const result = await service.listReminders(TEST_TENANT_ID);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.length).toBe(2);
      }
    });

    it('should filter by status', async () => {
      const reminders = [createMockReminderWithRelations({ status: 'pending' })];

      mockClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            is: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({ data: reminders, error: null }),
              }),
            }),
          }),
        }),
      });

      const result = await service.listReminders(TEST_TENANT_ID, { status: 'pending' });

      expect(result.success).toBe(true);
    });

    it('should filter by type', async () => {
      const reminders = [createMockReminderWithRelations({ type: 'vaccine_reminder' })];

      mockClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            is: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({ data: reminders, error: null }),
              }),
            }),
          }),
        }),
      });

      const result = await service.listReminders(TEST_TENANT_ID, { type: 'vaccine_reminder' });

      expect(result.success).toBe(true);
    });
  });

  describe('createReminder', () => {
    it('should create a reminder', async () => {
      const reminder = createMockReminder();

      mockClient.from.mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: reminder, error: null }),
          }),
        }),
      });

      const result = await service.createReminder(TEST_TENANT_ID, {
        client_id: TEST_CLIENT_ID,
        pet_id: TEST_PET_ID,
        type: 'vaccine_reminder',
        scheduled_at: new Date().toISOString(),
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.type).toBe('vaccine_reminder');
        expect(result.data.status).toBe('pending');
      }
    });

    it('should fail when required fields missing', async () => {
      const result = await service.createReminder(TEST_TENANT_ID, {
        client_id: '',
        type: 'vaccine_reminder',
        scheduled_at: new Date().toISOString(),
      });

      expect(result.success).toBe(false);
    });
  });

  describe('cancelReminder', () => {
    it('should cancel a pending reminder', async () => {
      const reminder = createMockReminderWithRelations({ status: 'pending' });
      const cancelledReminder = createMockReminder({ status: 'cancelled' });

      mockClient.from.mockImplementation((table: string) => {
        if (table === 'reminders') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  is: vi.fn().mockReturnValue({
                    single: vi.fn().mockResolvedValue({ data: reminder, error: null }),
                  }),
                }),
              }),
            }),
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  select: vi.fn().mockReturnValue({
                    single: vi.fn().mockResolvedValue({ data: cancelledReminder, error: null }),
                  }),
                }),
              }),
            }),
          };
        }
        return mockClient._queryBuilder;
      });

      const result = await service.cancelReminder('rem-123', TEST_TENANT_ID);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.status).toBe('cancelled');
      }
    });

    it('should fail when reminder is already sent', async () => {
      const reminder = createMockReminderWithRelations({ status: 'sent' });

      mockClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              is: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: reminder, error: null }),
              }),
            }),
          }),
        }),
      });

      const result = await service.cancelReminder('rem-123', TEST_TENANT_ID);

      expect(result.success).toBe(false);
    });
  });

  describe('getDueReminders', () => {
    it('should return reminders due for processing', async () => {
      const dueReminders = [
        createMockReminderWithRelations({
          scheduled_at: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
        }),
      ];

      mockClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              lte: vi.fn().mockReturnValue({
                is: vi.fn().mockReturnValue({
                  order: vi.fn().mockReturnValue({
                    limit: vi.fn().mockResolvedValue({ data: dueReminders, error: null }),
                  }),
                }),
              }),
            }),
          }),
        }),
      });

      const result = await service.getDueReminders(TEST_TENANT_ID);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.length).toBe(1);
      }
    });
  });

  describe('markAsSent', () => {
    it('should mark reminder as sent', async () => {
      const sentReminder = createMockReminder({ status: 'sent', attempts: 1 });

      mockClient.from.mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: sentReminder, error: null }),
              }),
            }),
          }),
        }),
      });

      const result = await service.markAsSent('rem-123', TEST_TENANT_ID);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.status).toBe('sent');
        expect(result.data.attempts).toBe(1);
      }
    });
  });

  describe('markAsFailed', () => {
    it('should retry when under max attempts', async () => {
      const currentReminder = { attempts: 1, max_attempts: 3 };
      const failedReminder = createMockReminder({
        status: 'pending',
        attempts: 2,
        error_message: 'SMTP error',
      });

      mockClient.from.mockImplementation((table: string) => {
        if (table === 'reminders') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: currentReminder, error: null }),
              }),
            }),
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  select: vi.fn().mockReturnValue({
                    single: vi.fn().mockResolvedValue({ data: failedReminder, error: null }),
                  }),
                }),
              }),
            }),
          };
        }
        return mockClient._queryBuilder;
      });

      const result = await service.markAsFailed('rem-123', TEST_TENANT_ID, 'SMTP error');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.status).toBe('pending');
        expect(result.data.attempts).toBe(2);
      }
    });

    it('should mark as failed when max attempts reached', async () => {
      const currentReminder = { attempts: 2, max_attempts: 3 };
      const failedReminder = createMockReminder({
        status: 'failed',
        attempts: 3,
        error_message: 'SMTP error',
      });

      mockClient.from.mockImplementation((table: string) => {
        if (table === 'reminders') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: currentReminder, error: null }),
              }),
            }),
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  select: vi.fn().mockReturnValue({
                    single: vi.fn().mockResolvedValue({ data: failedReminder, error: null }),
                  }),
                }),
              }),
            }),
          };
        }
        return mockClient._queryBuilder;
      });

      const result = await service.markAsFailed('rem-123', TEST_TENANT_ID, 'SMTP error');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.status).toBe('failed');
      }
    });
  });

  // ===========================================================================
  // NOTIFICATIONS
  // ===========================================================================

  describe('listNotifications', () => {
    it('should return notifications for tenant', async () => {
      const notifications = [
        createMockNotification({ id: 'notif-1' }),
        createMockNotification({ id: 'notif-2' }),
      ];

      mockClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({ data: notifications, error: null }),
          }),
        }),
      });

      const result = await service.listNotifications(TEST_TENANT_ID);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.length).toBe(2);
      }
    });

    it('should filter by channel type', async () => {
      const notifications = [createMockNotification({ channel_type: 'sms' })];

      mockClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ data: notifications, error: null }),
            }),
          }),
        }),
      });

      const result = await service.listNotifications(TEST_TENANT_ID, { channel_type: 'sms' });

      expect(result.success).toBe(true);
    });
  });

  describe('queueNotification', () => {
    it('should queue a notification', async () => {
      const notification = createMockNotification();

      mockClient.from.mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: notification, error: null }),
          }),
        }),
      });

      const result = await service.queueNotification(TEST_TENANT_ID, {
        client_id: TEST_CLIENT_ID,
        channel_type: 'email',
        destination: 'john@example.com',
        body: 'Test notification',
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.status).toBe('queued');
      }
    });

    it('should fail when required fields missing', async () => {
      const result = await service.queueNotification(TEST_TENANT_ID, {
        client_id: '',
        channel_type: 'email',
        destination: 'john@example.com',
        body: 'Test notification',
      });

      expect(result.success).toBe(false);
    });
  });

  // ===========================================================================
  // STATISTICS
  // ===========================================================================

  describe('getStats', () => {
    it('should return reminder statistics', async () => {
      const today = new Date().toISOString();
      const reminders = [
        { id: 'rem-1', type: 'vaccine_reminder', status: 'pending', updated_at: today },
        { id: 'rem-2', type: 'vaccine_reminder', status: 'sent', updated_at: today },
        { id: 'rem-3', type: 'appointment_reminder', status: 'sent', updated_at: today },
        { id: 'rem-4', type: 'vaccine_reminder', status: 'failed', updated_at: today },
      ];

      mockClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            is: vi.fn().mockResolvedValue({ data: reminders, error: null }),
          }),
        }),
      });

      const result = await service.getStats(TEST_TENANT_ID);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.pending_count).toBe(1);
        expect(result.data.failed_count).toBe(1);
        expect(result.data.by_type['vaccine_reminder']).toBe(3);
        expect(result.data.by_type['appointment_reminder']).toBe(1);
      }
    });
  });
});
