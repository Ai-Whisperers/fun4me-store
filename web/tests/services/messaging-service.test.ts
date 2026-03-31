/**
 * MessagingService Tests
 *
 * Tests the messaging and communication functionality:
 * - Conversation CRUD operations
 * - Message sending and retrieval
 * - Template management
 * - Read receipts
 * - Statistics
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  MessagingService,
  type Conversation,
  type Message,
  type MessageTemplate,
  type ConversationStatus,
  type ConversationPriority,
  type SenderType,
} from '@/lib/services/messaging-service';
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
// HELPER: CHAINABLE MOCK
// =============================================================================

/**
 * Creates a chainable mock that returns itself for all chain methods
 * and resolves to the response when awaited
 */
function createChainableMock<T>(response: { data: T | null; error: { message: string; code?: string } | null }) {
  const mockObj: Record<string, unknown> = {};

  const chainMethods = [
    'select', 'eq', 'neq', 'is', 'in', 'not', 'or', 'ilike', 'contains',
    'order', 'limit', 'range', 'gte', 'lte', 'gt', 'lt', 'update', 'insert', 'delete'
  ];

  chainMethods.forEach(method => {
    mockObj[method] = vi.fn().mockImplementation(() => mockObj);
  });

  mockObj.single = vi.fn().mockResolvedValue(response);
  mockObj.maybeSingle = vi.fn().mockResolvedValue(response);

  mockObj.then = vi.fn().mockImplementation((resolve: (value: typeof response) => void) => {
    return Promise.resolve(response).then(resolve);
  });

  return mockObj;
}

// =============================================================================
// TEST DATA FACTORIES
// =============================================================================

const TEST_TENANT_ID = 'tenant-vet-clinic';
const TEST_CLIENT_ID = 'client-user-123';
const TEST_CONVERSATION_ID = 'conv-123';

function createMockConversation(overrides: Partial<Conversation> = {}): Conversation {
  return {
    id: TEST_CONVERSATION_ID,
    tenant_id: TEST_TENANT_ID,
    client_id: TEST_CLIENT_ID,
    pet_id: 'pet-456',
    subject: 'Question about vaccine',
    channel: 'in_app',
    status: 'open',
    priority: 'normal',
    assigned_to: null,
    assigned_at: null,
    last_message_at: new Date().toISOString(),
    last_client_message_at: new Date().toISOString(),
    last_staff_message_at: null,
    client_last_read_at: null,
    staff_last_read_at: null,
    unread_client_count: 0,
    unread_staff_count: 1,
    appointment_id: null,
    tags: ['vaccine', 'question'],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

function createMockMessage(overrides: Partial<Message> = {}): Message {
  return {
    id: 'msg-123',
    conversation_id: TEST_CONVERSATION_ID,
    tenant_id: TEST_TENANT_ID,
    sender_id: TEST_CLIENT_ID,
    sender_type: 'client',
    sender_name: 'John Doe',
    message_type: 'text',
    content: 'Hello, I have a question about my pet.',
    content_html: null,
    attachments: [],
    card_data: null,
    reply_to_id: null,
    status: 'sent',
    delivered_at: null,
    read_at: null,
    failed_reason: null,
    external_message_id: null,
    external_channel: null,
    metadata: {},
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

function createMockTemplate(overrides: Partial<MessageTemplate> = {}): MessageTemplate {
  return {
    id: 'tmpl-123',
    tenant_id: TEST_TENANT_ID,
    code: 'APPT_CONFIRM',
    name: 'Appointment Confirmation',
    category: 'appointment',
    subject: 'Your appointment is confirmed',
    content: 'Hello {{owner_name}}, your appointment for {{pet_name}} is confirmed.',
    content_html: null,
    variables: ['owner_name', 'pet_name'],
    channels: ['in_app', 'sms'],
    sms_approved: true,
    whatsapp_template_id: null,
    language: 'es',
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

// =============================================================================
// TESTS
// =============================================================================

describe('MessagingService', () => {
  let mockClient: MockSupabaseClient;
  let service: MessagingService;

  beforeEach(() => {
    mockClient = createMockSupabaseClient();
    service = new MessagingService(mockClient as never);
    vi.clearAllMocks();
  });

  // ===========================================================================
  // LIST CONVERSATIONS
  // ===========================================================================

  describe('listConversations', () => {
    it('should return all conversations for a tenant', async () => {
      const mockConversations = [
        createMockConversation({ id: 'conv-1' }),
        createMockConversation({ id: 'conv-2', status: 'pending' }),
      ];

      mockClient.from.mockReturnValue(
        createChainableMock({ data: mockConversations, error: null })
      );

      const result = await service.listConversations(TEST_TENANT_ID);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.length).toBe(2);
      }
      expect(mockClient.from).toHaveBeenCalledWith('conversations');
    });

    it('should filter by status', async () => {
      const openConversations = [createMockConversation({ status: 'open' })];

      mockClient.from.mockReturnValue(
        createChainableMock({ data: openConversations, error: null })
      );

      const result = await service.listConversations(TEST_TENANT_ID, { status: 'open' });

      expect(result.success).toBe(true);
    });

    it('should filter by priority', async () => {
      const urgentConversations = [
        createMockConversation({ priority: 'urgent' }),
      ];

      mockClient.from.mockReturnValue(
        createChainableMock({ data: urgentConversations, error: null })
      );

      const result = await service.listConversations(TEST_TENANT_ID, { priority: 'urgent' });

      expect(result.success).toBe(true);
    });

    it('should filter by channel', async () => {
      const whatsappConversations = [
        createMockConversation({ channel: 'whatsapp' }),
      ];

      mockClient.from.mockReturnValue(
        createChainableMock({ data: whatsappConversations, error: null })
      );

      const result = await service.listConversations(TEST_TENANT_ID, { channel: 'whatsapp' });

      expect(result.success).toBe(true);
    });

    it('should filter by client_id', async () => {
      const clientConversations = [createMockConversation()];

      mockClient.from.mockReturnValue(
        createChainableMock({ data: clientConversations, error: null })
      );

      const result = await service.listConversations(TEST_TENANT_ID, { client_id: TEST_CLIENT_ID });

      expect(result.success).toBe(true);
    });

    it('should filter unassigned conversations', async () => {
      const unassignedConversations = [
        createMockConversation({ assigned_to: null }),
      ];

      mockClient.from.mockReturnValue(
        createChainableMock({ data: unassignedConversations, error: null })
      );

      const result = await service.listConversations(TEST_TENANT_ID, { unassigned: true });

      expect(result.success).toBe(true);
    });

    it('should filter conversations with unread messages', async () => {
      const unreadConversations = [
        createMockConversation({ unread_staff_count: 3 }),
      ];

      mockClient.from.mockReturnValue(
        createChainableMock({ data: unreadConversations, error: null })
      );

      const result = await service.listConversations(TEST_TENANT_ID, { has_unread: true });

      expect(result.success).toBe(true);
    });

    it('should search by subject', async () => {
      const searchResults = [
        createMockConversation({ subject: 'Vaccine question' }),
      ];

      mockClient.from.mockReturnValue(
        createChainableMock({ data: searchResults, error: null })
      );

      const result = await service.listConversations(TEST_TENANT_ID, { search: 'vaccine' });

      expect(result.success).toBe(true);
    });

    it('should handle database errors', async () => {
      mockClient.from.mockReturnValue(
        createChainableMock({ data: null, error: { message: 'Connection failed', code: 'CONN_ERR' } })
      );

      const result = await service.listConversations(TEST_TENANT_ID);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('Connection failed');
      }
    });
  });

  // ===========================================================================
  // GET CONVERSATION
  // ===========================================================================

  describe('getConversation', () => {
    it('should return a specific conversation', async () => {
      const conversation = createMockConversation();

      mockClient.from.mockReturnValue(
        createChainableMock({ data: conversation, error: null })
      );

      const result = await service.getConversation(TEST_CONVERSATION_ID, TEST_TENANT_ID);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data?.id).toBe(TEST_CONVERSATION_ID);
      }
    });

    it('should return null when not found', async () => {
      mockClient.from.mockReturnValue(
        createChainableMock({ data: null, error: { code: 'PGRST116', message: 'Not found' } })
      );

      const result = await service.getConversation('nonexistent', TEST_TENANT_ID);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBeNull();
      }
    });

    it('should handle database errors', async () => {
      mockClient.from.mockReturnValue(
        createChainableMock({ data: null, error: { code: 'GENERIC_ERR', message: 'Database error' } })
      );

      const result = await service.getConversation(TEST_CONVERSATION_ID, TEST_TENANT_ID);

      expect(result.success).toBe(false);
    });
  });

  // ===========================================================================
  // CREATE CONVERSATION
  // ===========================================================================

  describe('createConversation', () => {
    it('should create a new conversation', async () => {
      const newConversation = createMockConversation({ id: 'conv-new' });

      mockClient.from.mockReturnValue(
        createChainableMock({ data: newConversation, error: null })
      );

      const result = await service.createConversation(TEST_TENANT_ID, {
        client_id: TEST_CLIENT_ID,
        subject: 'New question',
        channel: 'in_app',
        priority: 'normal',
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.id).toBe('conv-new');
      }
    });

    it('should create conversation with pet_id', async () => {
      const conversationWithPet = createMockConversation({ pet_id: 'pet-999' });

      mockClient.from.mockReturnValue(
        createChainableMock({ data: conversationWithPet, error: null })
      );

      const result = await service.createConversation(TEST_TENANT_ID, {
        client_id: TEST_CLIENT_ID,
        pet_id: 'pet-999',
        subject: 'Pet health question',
      });

      expect(result.success).toBe(true);
    });

    it('should create conversation with appointment link', async () => {
      const conversationWithAppt = createMockConversation({ appointment_id: 'appt-123' });

      mockClient.from.mockReturnValue(
        createChainableMock({ data: conversationWithAppt, error: null })
      );

      const result = await service.createConversation(TEST_TENANT_ID, {
        client_id: TEST_CLIENT_ID,
        appointment_id: 'appt-123',
        subject: 'Appointment question',
      });

      expect(result.success).toBe(true);
    });

    it('should handle database errors on create', async () => {
      mockClient.from.mockReturnValue(
        createChainableMock({ data: null, error: { message: 'Insert failed' } })
      );

      const result = await service.createConversation(TEST_TENANT_ID, {
        client_id: TEST_CLIENT_ID,
        subject: 'Test',
      });

      expect(result.success).toBe(false);
    });
  });

  // ===========================================================================
  // UPDATE CONVERSATION STATUS
  // ===========================================================================

  describe('updateConversationStatus', () => {
    const statuses: ConversationStatus[] = ['open', 'pending', 'resolved', 'closed', 'spam'];

    statuses.forEach((status) => {
      it(`should update conversation to ${status}`, async () => {
        const updatedConversation = createMockConversation({ status });

        mockClient.from.mockReturnValue(
          createChainableMock({ data: updatedConversation, error: null })
        );

        const result = await service.updateConversationStatus(
          TEST_CONVERSATION_ID,
          TEST_TENANT_ID,
          status
        );

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.status).toBe(status);
        }
      });
    });

    it('should fail when conversation not found', async () => {
      mockClient.from.mockReturnValue(
        createChainableMock({ data: null, error: null })
      );

      const result = await service.updateConversationStatus(
        'nonexistent',
        TEST_TENANT_ID,
        'resolved'
      );

      expect(result.success).toBe(false);
    });
  });

  // ===========================================================================
  // ASSIGN CONVERSATION
  // ===========================================================================

  describe('assignConversation', () => {
    it('should assign conversation to staff member', async () => {
      const assignedConversation = createMockConversation({
        assigned_to: 'staff-123',
        assigned_at: new Date().toISOString(),
      });

      mockClient.from.mockReturnValue(
        createChainableMock({ data: assignedConversation, error: null })
      );

      const result = await service.assignConversation(
        TEST_CONVERSATION_ID,
        TEST_TENANT_ID,
        'staff-123'
      );

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.assigned_to).toBe('staff-123');
      }
    });

    it('should unassign conversation', async () => {
      const unassignedConversation = createMockConversation({
        assigned_to: null,
        assigned_at: null,
      });

      mockClient.from.mockReturnValue(
        createChainableMock({ data: unassignedConversation, error: null })
      );

      const result = await service.assignConversation(
        TEST_CONVERSATION_ID,
        TEST_TENANT_ID,
        null
      );

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.assigned_to).toBeNull();
      }
    });
  });

  // ===========================================================================
  // UPDATE CONVERSATION PRIORITY
  // ===========================================================================

  describe('updateConversationPriority', () => {
    const priorities: ConversationPriority[] = ['low', 'normal', 'high', 'urgent'];

    priorities.forEach((priority) => {
      it(`should update priority to ${priority}`, async () => {
        const updatedConversation = createMockConversation({ priority });

        mockClient.from.mockReturnValue(
          createChainableMock({ data: updatedConversation, error: null })
        );

        const result = await service.updateConversationPriority(
          TEST_CONVERSATION_ID,
          TEST_TENANT_ID,
          priority
        );

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.priority).toBe(priority);
        }
      });
    });
  });

  // ===========================================================================
  // LIST MESSAGES
  // ===========================================================================

  describe('listMessages', () => {
    it('should return messages in a conversation', async () => {
      const mockMessages = [
        createMockMessage({ id: 'msg-1', content: 'Hello' }),
        createMockMessage({ id: 'msg-2', content: 'Hi there', sender_type: 'staff' }),
      ];

      mockClient.from.mockReturnValue(
        createChainableMock({ data: mockMessages, error: null })
      );

      const result = await service.listMessages(TEST_CONVERSATION_ID, TEST_TENANT_ID);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.length).toBe(2);
      }
      expect(mockClient.from).toHaveBeenCalledWith('messages');
    });

    it('should filter by sender_type', async () => {
      const clientMessages = [
        createMockMessage({ sender_type: 'client' }),
      ];

      mockClient.from.mockReturnValue(
        createChainableMock({ data: clientMessages, error: null })
      );

      const result = await service.listMessages(
        TEST_CONVERSATION_ID,
        TEST_TENANT_ID,
        { sender_type: 'client' }
      );

      expect(result.success).toBe(true);
    });

    it('should filter by message_type', async () => {
      const imageMessages = [
        createMockMessage({ message_type: 'image' }),
      ];

      mockClient.from.mockReturnValue(
        createChainableMock({ data: imageMessages, error: null })
      );

      const result = await service.listMessages(
        TEST_CONVERSATION_ID,
        TEST_TENANT_ID,
        { message_type: 'image' }
      );

      expect(result.success).toBe(true);
    });

    it('should filter by date range', async () => {
      const dateRangeMessages = [createMockMessage()];

      mockClient.from.mockReturnValue(
        createChainableMock({ data: dateRangeMessages, error: null })
      );

      const result = await service.listMessages(
        TEST_CONVERSATION_ID,
        TEST_TENANT_ID,
        { from_date: '2024-01-01', to_date: '2024-12-31' }
      );

      expect(result.success).toBe(true);
    });

    it('should respect limit parameter', async () => {
      const limitedMessages = [createMockMessage()];

      mockClient.from.mockReturnValue(
        createChainableMock({ data: limitedMessages, error: null })
      );

      const result = await service.listMessages(
        TEST_CONVERSATION_ID,
        TEST_TENANT_ID,
        undefined,
        10
      );

      expect(result.success).toBe(true);
    });
  });

  // ===========================================================================
  // SEND MESSAGE
  // ===========================================================================

  describe('sendMessage', () => {
    it('should send a text message', async () => {
      const newMessage = createMockMessage({ id: 'msg-new' });

      mockClient.from.mockReturnValue(
        createChainableMock({ data: newMessage, error: null })
      );

      const result = await service.sendMessage(TEST_CONVERSATION_ID, TEST_TENANT_ID, {
        sender_id: TEST_CLIENT_ID,
        sender_type: 'client',
        content: 'Hello!',
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.content).toBe('Hello, I have a question about my pet.');
      }
    });

    it('should send message from staff', async () => {
      const staffMessage = createMockMessage({
        sender_id: 'staff-123',
        sender_type: 'staff',
        content: 'How can I help?',
      });

      mockClient.from.mockReturnValue(
        createChainableMock({ data: staffMessage, error: null })
      );

      const result = await service.sendMessage(TEST_CONVERSATION_ID, TEST_TENANT_ID, {
        sender_id: 'staff-123',
        sender_type: 'staff',
        content: 'How can I help?',
      });

      expect(result.success).toBe(true);
    });

    it('should send message with attachments', async () => {
      const messageWithAttachment = createMockMessage({
        message_type: 'image',
        attachments: [{ url: 'https://example.com/image.jpg', type: 'image/jpeg' }],
      });

      mockClient.from.mockReturnValue(
        createChainableMock({ data: messageWithAttachment, error: null })
      );

      const result = await service.sendMessage(TEST_CONVERSATION_ID, TEST_TENANT_ID, {
        sender_id: TEST_CLIENT_ID,
        sender_type: 'client',
        message_type: 'image',
        content: 'Here is a photo',
        attachments: [{ url: 'https://example.com/image.jpg', type: 'image/jpeg' }],
      });

      expect(result.success).toBe(true);
    });

    it('should send system message', async () => {
      const systemMessage = createMockMessage({
        sender_type: 'system',
        message_type: 'system',
        content: 'Appointment confirmed',
      });

      mockClient.from.mockReturnValue(
        createChainableMock({ data: systemMessage, error: null })
      );

      const result = await service.sendMessage(TEST_CONVERSATION_ID, TEST_TENANT_ID, {
        sender_type: 'system',
        message_type: 'system',
        content: 'Appointment confirmed',
      });

      expect(result.success).toBe(true);
    });

    it('should send message as reply', async () => {
      const replyMessage = createMockMessage({
        reply_to_id: 'msg-original',
      });

      mockClient.from.mockReturnValue(
        createChainableMock({ data: replyMessage, error: null })
      );

      const result = await service.sendMessage(TEST_CONVERSATION_ID, TEST_TENANT_ID, {
        sender_id: TEST_CLIENT_ID,
        sender_type: 'client',
        content: 'This is a reply',
        reply_to_id: 'msg-original',
      });

      expect(result.success).toBe(true);
    });

    it('should handle send errors', async () => {
      mockClient.from.mockReturnValue(
        createChainableMock({ data: null, error: { message: 'Send failed' } })
      );

      const result = await service.sendMessage(TEST_CONVERSATION_ID, TEST_TENANT_ID, {
        sender_id: TEST_CLIENT_ID,
        sender_type: 'client',
        content: 'Test',
      });

      expect(result.success).toBe(false);
    });
  });

  // ===========================================================================
  // MARK CONVERSATION READ
  // ===========================================================================

  describe('markConversationRead', () => {
    it('should mark conversation as read for client', async () => {
      mockClient.rpc.mockResolvedValue({ data: null, error: null });

      const result = await service.markConversationRead(
        TEST_CONVERSATION_ID,
        TEST_TENANT_ID,
        'client'
      );

      expect(result.success).toBe(true);
      expect(mockClient.rpc).toHaveBeenCalledWith('mark_conversation_read', {
        p_conversation_id: TEST_CONVERSATION_ID,
        p_user_type: 'client',
      });
    });

    it('should mark conversation as read for staff', async () => {
      mockClient.rpc.mockResolvedValue({ data: null, error: null });

      const result = await service.markConversationRead(
        TEST_CONVERSATION_ID,
        TEST_TENANT_ID,
        'staff'
      );

      expect(result.success).toBe(true);
      expect(mockClient.rpc).toHaveBeenCalledWith('mark_conversation_read', {
        p_conversation_id: TEST_CONVERSATION_ID,
        p_user_type: 'staff',
      });
    });

    it('should handle RPC errors', async () => {
      mockClient.rpc.mockResolvedValue({ data: null, error: { message: 'RPC failed' } });

      const result = await service.markConversationRead(
        TEST_CONVERSATION_ID,
        TEST_TENANT_ID,
        'staff'
      );

      expect(result.success).toBe(false);
    });
  });

  // ===========================================================================
  // GET UNREAD COUNT
  // ===========================================================================

  describe('getUnreadCount', () => {
    it('should return total unread count', async () => {
      const conversations = [
        { unread_staff_count: 3 },
        { unread_staff_count: 2 },
        { unread_staff_count: 0 },
      ];

      mockClient.from.mockReturnValue(
        createChainableMock({ data: conversations, error: null })
      );

      const result = await service.getUnreadCount(TEST_TENANT_ID);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe(5); // 3 + 2 + 0
      }
    });

    it('should return 0 when no unread', async () => {
      mockClient.from.mockReturnValue(
        createChainableMock({ data: [], error: null })
      );

      const result = await service.getUnreadCount(TEST_TENANT_ID);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe(0);
      }
    });
  });

  // ===========================================================================
  // LIST TEMPLATES
  // ===========================================================================

  describe('listTemplates', () => {
    it('should return all templates including global', async () => {
      const templates = [
        createMockTemplate({ id: 'tmpl-1', tenant_id: TEST_TENANT_ID }),
        createMockTemplate({ id: 'tmpl-2', tenant_id: null }), // Global
      ];

      mockClient.from.mockReturnValue(
        createChainableMock({ data: templates, error: null })
      );

      const result = await service.listTemplates(TEST_TENANT_ID);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.length).toBe(2);
      }
      expect(mockClient.from).toHaveBeenCalledWith('message_templates');
    });

    it('should filter by category', async () => {
      const appointmentTemplates = [
        createMockTemplate({ category: 'appointment' }),
      ];

      mockClient.from.mockReturnValue(
        createChainableMock({ data: appointmentTemplates, error: null })
      );

      const result = await service.listTemplates(TEST_TENANT_ID, { category: 'appointment' });

      expect(result.success).toBe(true);
    });

    it('should filter by channel', async () => {
      const smsTemplates = [
        createMockTemplate({ channels: ['sms'] }),
      ];

      mockClient.from.mockReturnValue(
        createChainableMock({ data: smsTemplates, error: null })
      );

      const result = await service.listTemplates(TEST_TENANT_ID, { channel: 'sms' });

      expect(result.success).toBe(true);
    });

    it('should filter by active status', async () => {
      const activeTemplates = [
        createMockTemplate({ is_active: true }),
      ];

      mockClient.from.mockReturnValue(
        createChainableMock({ data: activeTemplates, error: null })
      );

      const result = await service.listTemplates(TEST_TENANT_ID, { is_active: true });

      expect(result.success).toBe(true);
    });

    it('should search templates', async () => {
      const searchResults = [
        createMockTemplate({ name: 'Appointment Reminder' }),
      ];

      mockClient.from.mockReturnValue(
        createChainableMock({ data: searchResults, error: null })
      );

      const result = await service.listTemplates(TEST_TENANT_ID, { search: 'appointment' });

      expect(result.success).toBe(true);
    });
  });

  // ===========================================================================
  // GET TEMPLATE BY CODE
  // ===========================================================================

  describe('getTemplateByCode', () => {
    it('should return template by code', async () => {
      const template = createMockTemplate({ code: 'APPT_CONFIRM' });

      mockClient.from.mockReturnValue(
        createChainableMock({ data: template, error: null })
      );

      const result = await service.getTemplateByCode('APPT_CONFIRM', TEST_TENANT_ID);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data?.code).toBe('APPT_CONFIRM');
      }
    });

    it('should return null when template not found', async () => {
      mockClient.from.mockReturnValue(
        createChainableMock({ data: null, error: { code: 'PGRST116', message: 'Not found' } })
      );

      const result = await service.getTemplateByCode('NONEXISTENT', TEST_TENANT_ID);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBeNull();
      }
    });
  });

  // ===========================================================================
  // CREATE TEMPLATE
  // ===========================================================================

  describe('createTemplate', () => {
    it('should create a new template', async () => {
      const newTemplate = createMockTemplate({ id: 'tmpl-new' });

      mockClient.from.mockReturnValue(
        createChainableMock({ data: newTemplate, error: null })
      );

      const result = await service.createTemplate(TEST_TENANT_ID, {
        code: 'NEW_TEMPLATE',
        name: 'New Template',
        category: 'custom',
        content: 'Hello {{name}}',
        variables: ['name'],
      });

      expect(result.success).toBe(true);
    });

    it('should handle duplicate code error', async () => {
      mockClient.from.mockReturnValue(
        createChainableMock({ data: null, error: { message: 'Duplicate key', code: '23505' } })
      );

      const result = await service.createTemplate(TEST_TENANT_ID, {
        code: 'DUPLICATE',
        name: 'Duplicate',
        category: 'custom',
        content: 'Test',
      });

      expect(result.success).toBe(false);
    });
  });

  // ===========================================================================
  // UPDATE TEMPLATE
  // ===========================================================================

  describe('updateTemplate', () => {
    it('should update template content', async () => {
      const updatedTemplate = createMockTemplate({
        content: 'Updated content',
      });

      mockClient.from.mockReturnValue(
        createChainableMock({ data: updatedTemplate, error: null })
      );

      const result = await service.updateTemplate('tmpl-123', TEST_TENANT_ID, {
        content: 'Updated content',
      });

      expect(result.success).toBe(true);
    });

    it('should update template active status', async () => {
      const deactivatedTemplate = createMockTemplate({
        is_active: false,
      });

      mockClient.from.mockReturnValue(
        createChainableMock({ data: deactivatedTemplate, error: null })
      );

      const result = await service.updateTemplate('tmpl-123', TEST_TENANT_ID, {
        is_active: false,
      });

      expect(result.success).toBe(true);
    });

    it('should fail when template not found', async () => {
      mockClient.from.mockReturnValue(
        createChainableMock({ data: null, error: null })
      );

      const result = await service.updateTemplate('nonexistent', TEST_TENANT_ID, {
        content: 'Test',
      });

      expect(result.success).toBe(false);
    });
  });

  // ===========================================================================
  // DELETE TEMPLATE
  // ===========================================================================

  describe('deleteTemplate', () => {
    it('should soft delete template', async () => {
      mockClient.from.mockReturnValue(
        createChainableMock({ data: null, error: null })
      );

      const result = await service.deleteTemplate('tmpl-123', TEST_TENANT_ID, 'user-admin');

      expect(result.success).toBe(true);
    });

    it('should handle delete errors', async () => {
      mockClient.from.mockReturnValue(
        createChainableMock({ data: null, error: { message: 'Delete failed' } })
      );

      const result = await service.deleteTemplate('tmpl-123', TEST_TENANT_ID, 'user-admin');

      expect(result.success).toBe(false);
    });
  });

  // ===========================================================================
  // RENDER TEMPLATE
  // ===========================================================================

  describe('renderTemplate', () => {
    it('should render template with variables', () => {
      const template = createMockTemplate({
        subject: 'Hello {{owner_name}}',
        content: 'Hi {{owner_name}}, your pet {{pet_name}} has an appointment.',
      });

      const result = service.renderTemplate(template, {
        owner_name: 'John',
        pet_name: 'Max',
      });

      expect(result.subject).toBe('Hello John');
      expect(result.content).toBe('Hi John, your pet Max has an appointment.');
    });

    it('should handle missing variables gracefully', () => {
      const template = createMockTemplate({
        content: 'Hello {{owner_name}}, appointment at {{time}}',
      });

      const result = service.renderTemplate(template, {
        owner_name: 'Jane',
        // time is missing
      });

      expect(result.content).toBe('Hello Jane, appointment at {{time}}');
    });

    it('should handle template without subject', () => {
      const template = createMockTemplate({
        subject: null,
        content: 'Simple message for {{name}}',
      });

      const result = service.renderTemplate(template, { name: 'Test' });

      expect(result.subject).toBeNull();
      expect(result.content).toBe('Simple message for Test');
    });

    it('should replace multiple occurrences', () => {
      const template = createMockTemplate({
        content: '{{name}} {{name}} {{name}}',
      });

      const result = service.renderTemplate(template, { name: 'Echo' });

      expect(result.content).toBe('Echo Echo Echo');
    });
  });

  // ===========================================================================
  // GET STATS
  // ===========================================================================

  describe('getStats', () => {
    it('should return comprehensive messaging statistics', async () => {
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);

      const conversationsData = [
        {
          status: 'open',
          unread_staff_count: 3,
          created_at: twoHoursAgo.toISOString(),
          last_client_message_at: twoHoursAgo.toISOString(),
          last_staff_message_at: oneHourAgo.toISOString(),
        },
        {
          status: 'pending',
          unread_staff_count: 1,
          created_at: now.toISOString(),
          last_client_message_at: null,
          last_staff_message_at: null,
        },
        {
          status: 'resolved',
          unread_staff_count: 0,
          created_at: now.toISOString(),
          last_client_message_at: null,
          last_staff_message_at: null,
        },
      ];

      let callCount = 0;
      mockClient.from.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          // conversations query
          return createChainableMock({ data: conversationsData, error: null });
        }
        // messages count query
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              gte: vi.fn().mockResolvedValue({ count: 15, error: null }),
            }),
          }),
        };
      });

      const result = await service.getStats(TEST_TENANT_ID);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.total_conversations).toBe(3);
        expect(result.data.open_conversations).toBe(2); // open + pending
        expect(result.data.unread_count).toBe(4); // 3 + 1 + 0
        expect(result.data.messages_today).toBe(15);
      }
    });

    it('should handle empty data', async () => {
      mockClient.from.mockImplementation(() => {
        return createChainableMock({ data: [], error: null });
      });

      // Also mock the count query
      const originalFrom = mockClient.from;
      let callCount = 0;
      mockClient.from.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return createChainableMock({ data: [], error: null });
        }
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              gte: vi.fn().mockResolvedValue({ count: 0, error: null }),
            }),
          }),
        };
      });

      const result = await service.getStats(TEST_TENANT_ID);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.total_conversations).toBe(0);
        expect(result.data.open_conversations).toBe(0);
        expect(result.data.unread_count).toBe(0);
        expect(result.data.avg_response_time_hours).toBeNull();
      }
    });

    it('should handle database errors', async () => {
      mockClient.from.mockReturnValue(
        createChainableMock({ data: null, error: { message: 'Query failed' } })
      );

      const result = await service.getStats(TEST_TENANT_ID);

      expect(result.success).toBe(false);
      if (!result.success) {
        // Service returns specific error message from database
        expect(result.error).toBe('Query failed');
      }
    });
  });

  // ===========================================================================
  // SENDER TYPES
  // ===========================================================================

  describe('Sender Types', () => {
    const senderTypes: SenderType[] = ['client', 'staff', 'system', 'bot'];

    senderTypes.forEach((senderType) => {
      it(`should handle ${senderType} sender type`, async () => {
        const message = createMockMessage({ sender_type: senderType });

        mockClient.from.mockReturnValue(
          createChainableMock({ data: message, error: null })
        );

        const result = await service.sendMessage(TEST_CONVERSATION_ID, TEST_TENANT_ID, {
          sender_type: senderType,
          content: `Message from ${senderType}`,
        });

        expect(result.success).toBe(true);
      });
    });
  });
});
