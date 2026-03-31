/**
 * ConsentService Tests
 *
 * Comprehensive tests for consent management:
 * - Template CRUD operations
 * - Template versioning
 * - Document creation and signing
 * - Document revocation
 * - User consent preferences
 * - Analytics and audit
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  ConsentService,
  type ConsentTemplate,
  type ConsentDocument,
  type ConsentPreference,
  type ConsentCategory,
  type ConsentPreferenceType,
  type ConsentDocumentStatus,
} from '@/lib/services/consent-service';
import {
  createMockSupabaseClient,
  type MockSupabaseClient,
} from './__mocks__/supabase-mock';

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
// CHAINABLE MOCK HELPER
// =============================================================================

function createChainableMock<T>(response: {
  data: T | null;
  error: { message: string; code?: string } | null;
}) {
  const mockObj: Record<string, unknown> = {};

  const chainMethods = [
    'select',
    'eq',
    'is',
    'in',
    'not',
    'or',
    'ilike',
    'order',
    'limit',
    'range',
    'gte',
    'lte',
    'gt',
    'lt',
    'neq',
    'insert',
    'update',
    'delete',
    'upsert',
  ];
  
  // Create a fresh mock object each time to avoid state pollution
  chainMethods.forEach((method) => {
    mockObj[method] = vi.fn().mockImplementation(() => {
      // Return a fresh chainable mock to maintain chain but avoid state issues
      return createChainableMock(response);
    });
  });

  mockObj.single = vi.fn().mockResolvedValue(response);
  mockObj.maybeSingle = vi.fn().mockResolvedValue(response);

  mockObj.then = vi
    .fn()
    .mockImplementation((resolve: (value: typeof response) => void) => {
      return Promise.resolve(response).then(resolve);
    });

  return mockObj;
}

// =============================================================================
// TEST DATA FACTORIES
// =============================================================================

function createMockTemplate(overrides: Partial<ConsentTemplate> = {}): ConsentTemplate {
  return {
    id: 'template-123',
    tenant_id: 'tenant-abc',
    code: 'SURGERY-GENERAL',
    name: 'Consentimiento Quirúrgico General',
    category: 'surgical' as ConsentCategory,
    title: 'Autorización de Procedimiento Quirúrgico',
    content_html: '<h1>Consentimiento</h1><p>Contenido del consentimiento...</p>',
    requires_witness: false,
    validity_days: 30,
    version: '1.0',
    is_active: true,
    is_current: true,
    requires_id_verification: false,
    can_be_revoked: true,
    default_expiry_days: null,
    published_at: '2026-01-01T00:00:00Z',
    change_summary: null,
    parent_version_id: null,
    created_by: 'user-123',
    updated_by: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    deleted_at: null,
    ...overrides,
  };
}

function createMockDocument(overrides: Partial<ConsentDocument> = {}): ConsentDocument {
  return {
    id: 'doc-456',
    tenant_id: 'tenant-abc',
    template_id: 'template-123',
    pet_id: 'pet-789',
    client_id: 'client-111',
    appointment_id: 'appt-222',
    status: 'pending' as ConsentDocumentStatus,
    signed_at: null,
    signature_url: null,
    witness_name: null,
    witness_signature_url: null,
    expires_at: '2026-02-01T00:00:00Z',
    revoked_at: null,
    revoked_reason: null,
    email_sent_at: null,
    ip_address: null,
    user_agent: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

function createMockPreference(
  overrides: Partial<ConsentPreference> = {}
): ConsentPreference {
  return {
    id: 'pref-123',
    user_id: 'user-456',
    tenant_id: 'tenant-abc',
    consent_type: 'marketing_email' as ConsentPreferenceType,
    granted: true,
    granted_at: '2026-01-01T00:00:00Z',
    withdrawn_at: null,
    source: 'signup',
    version: 1,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

// =============================================================================
// TESTS
// =============================================================================

describe('ConsentService', () => {
  let service: ConsentService;
  let mockClient: MockSupabaseClient;

  beforeEach(() => {
    mockClient = createMockSupabaseClient();
    service = new ConsentService(mockClient as never);
  });

  // ===========================================================================
  // TEMPLATE TESTS
  // ===========================================================================

  describe('listTemplates', () => {
    it('returns templates for tenant including global templates', async () => {
      const templates = [
        createMockTemplate({ id: 'template-1', tenant_id: 'tenant-abc' }),
        createMockTemplate({ id: 'template-2', tenant_id: null }),
      ];

      mockClient.from.mockReturnValue(
        createChainableMock({ data: templates, error: null })
      );

      const result = await service.listTemplates('tenant-abc');

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
      expect(mockClient.from).toHaveBeenCalledWith('consent_templates');
    });

    it('filters by category', async () => {
      const templates = [createMockTemplate({ category: 'surgical' })];

      mockClient.from.mockReturnValue(
        createChainableMock({ data: templates, error: null })
      );

      const result = await service.listTemplates('tenant-abc', {
        category: 'surgical',
      });

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
    });

    it('filters by active status', async () => {
      const templates = [createMockTemplate({ is_active: true })];

      mockClient.from.mockReturnValue(
        createChainableMock({ data: templates, error: null })
      );

      const result = await service.listTemplates('tenant-abc', {
        is_active: true,
      });

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
    });

    it('handles database errors', async () => {
      mockClient.from.mockReturnValue(
        createChainableMock({
          data: null,
          error: { message: 'Database error', code: 'PGRST116' },
        })
      );

      const result = await service.listTemplates('tenant-abc');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Database error');
    });
  });

  describe('getTemplate', () => {
    it('returns a single template by ID', async () => {
      const template = createMockTemplate();

      mockClient.from.mockReturnValue(
        createChainableMock({ data: template, error: null })
      );

      const result = await service.getTemplate('template-123');

      expect(result.success).toBe(true);
      expect(result.data?.id).toBe('template-123');
    });

    it('handles not found', async () => {
      mockClient.from.mockReturnValue(
        createChainableMock({
          data: null,
          error: { message: 'Not found', code: 'PGRST116' },
        })
      );

      const result = await service.getTemplate('nonexistent');

      expect(result.success).toBe(false);
    });
  });

  describe('getTemplateByCode', () => {
    it('returns template by code preferring tenant-specific', async () => {
      const template = createMockTemplate({ tenant_id: 'tenant-abc' });

      mockClient.from.mockReturnValue(
        createChainableMock({ data: template, error: null })
      );

      const result = await service.getTemplateByCode('tenant-abc', 'SURGERY-GENERAL');

      expect(result.success).toBe(true);
      expect(result.data?.code).toBe('SURGERY-GENERAL');
    });
  });

  describe('createTemplate', () => {
    it('creates a new consent template', async () => {
      const template = createMockTemplate();

      mockClient.from.mockReturnValue(
        createChainableMock({ data: template, error: null })
      );

      const result = await service.createTemplate(
        'tenant-abc',
        {
          code: 'SURGERY-GENERAL',
          name: 'Consentimiento Quirúrgico General',
          category: 'surgical',
          title: 'Autorización de Procedimiento Quirúrgico',
          content_html: '<h1>Consentimiento</h1>',
        },
        'user-123'
      );

      expect(result.success).toBe(true);
      expect(result.data?.code).toBe('SURGERY-GENERAL');
    });

    it('handles creation errors', async () => {
      mockClient.from.mockReturnValue(
        createChainableMock({
          data: null,
          error: { message: 'Duplicate code', code: '23505' },
        })
      );

      const result = await service.createTemplate(
        'tenant-abc',
        {
          code: 'DUPLICATE',
          name: 'Test',
          category: 'general',
          title: 'Test',
          content_html: '',
        },
        'user-123'
      );

      expect(result.success).toBe(false);
    });
  });

  describe('updateTemplate', () => {
    it('updates template without versioning for non-content changes', async () => {
      const template = createMockTemplate({ name: 'Updated Name' });

      mockClient.from.mockReturnValue(
        createChainableMock({ data: template, error: null })
      );

      const result = await service.updateTemplate(
        'template-123',
        { name: 'Updated Name' },
        'user-123'
      );

      expect(result.success).toBe(true);
      expect(result.data?.name).toBe('Updated Name');
    });

    it('creates version when content changes', async () => {
      const template = createMockTemplate({ version: '2.0' });

      mockClient.rpc.mockResolvedValue({ data: 'version-id', error: null });
      mockClient.from.mockReturnValue(
        createChainableMock({ data: template, error: null })
      );

      const result = await service.updateTemplate(
        'template-123',
        {
          title: 'New Title',
          content_html: '<p>New content</p>',
          change_summary: 'Updated content',
        },
        'user-123'
      );

      expect(result.success).toBe(true);
      expect(mockClient.rpc).toHaveBeenCalledWith(
        'create_consent_template_version',
        expect.any(Object)
      );
    });
  });

  describe('deleteTemplate', () => {
    it('soft deletes a template', async () => {
      mockClient.from.mockReturnValue(
        createChainableMock({ data: null, error: null })
      );

      const result = await service.deleteTemplate('template-123', 'user-123');

      expect(result.success).toBe(true);
    });
  });

  describe('getTemplateVersions', () => {
    it('returns version history for a template', async () => {
      const versions = [
        { id: 'v1', template_id: 'template-123', version_number: 1, version_label: '1.0' },
        { id: 'v2', template_id: 'template-123', version_number: 2, version_label: '2.0' },
      ];

      mockClient.from.mockReturnValue(
        createChainableMock({ data: versions, error: null })
      );

      const result = await service.getTemplateVersions('template-123');

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
    });
  });

  describe('rollbackTemplate', () => {
    it('rolls back template to a previous version', async () => {
      mockClient.rpc.mockResolvedValue({ data: 'new-version-id', error: null });

      const result = await service.rollbackTemplate('template-123', 1, 'user-123');

      expect(result.success).toBe(true);
      expect(mockClient.rpc).toHaveBeenCalledWith('rollback_consent_template_version', {
        p_template_id: 'template-123',
        p_target_version_number: 1,
        p_user_id: 'user-123',
      });
    });
  });

  // ===========================================================================
  // DOCUMENT TESTS
  // ===========================================================================

  describe('listDocuments', () => {
    it('returns consent documents for tenant', async () => {
      const documents = [
        createMockDocument({ id: 'doc-1' }),
        createMockDocument({ id: 'doc-2' }),
      ];

      mockClient.from.mockReturnValue(
        createChainableMock({ data: documents, error: null })
      );

      const result = await service.listDocuments('tenant-abc');

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
    });

    it('filters by status', async () => {
      const documents = [createMockDocument({ status: 'signed' })];

      mockClient.from.mockReturnValue(
        createChainableMock({ data: documents, error: null })
      );

      const result = await service.listDocuments('tenant-abc', { status: 'signed' });

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
    });

    it('filters by pet_id', async () => {
      const documents = [createMockDocument({ pet_id: 'pet-789' })];

      mockClient.from.mockReturnValue(
        createChainableMock({ data: documents, error: null })
      );

      const result = await service.listDocuments('tenant-abc', { pet_id: 'pet-789' });

      expect(result.success).toBe(true);
    });

    it('filters by client_id', async () => {
      const documents = [createMockDocument({ client_id: 'client-111' })];

      mockClient.from.mockReturnValue(
        createChainableMock({ data: documents, error: null })
      );

      const result = await service.listDocuments('tenant-abc', {
        client_id: 'client-111',
      });

      expect(result.success).toBe(true);
    });

    it('filters by date range', async () => {
      const documents = [createMockDocument()];

      mockClient.from.mockReturnValue(
        createChainableMock({ data: documents, error: null })
      );

      const result = await service.listDocuments('tenant-abc', {
        from_date: '2026-01-01',
        to_date: '2026-01-31',
      });

      expect(result.success).toBe(true);
    });
  });

  describe('getDocument', () => {
    it('returns a single document by ID', async () => {
      const document = createMockDocument();

      mockClient.from.mockReturnValue(
        createChainableMock({ data: document, error: null })
      );

      const result = await service.getDocument('doc-456');

      expect(result.success).toBe(true);
      expect(result.data?.id).toBe('doc-456');
    });
  });

  describe('createDocument', () => {
    it('creates a pending consent document', async () => {
      const template = { validity_days: 30, default_expiry_days: null };
      const document = createMockDocument();

      mockClient.from
        .mockReturnValueOnce(createChainableMock({ data: template, error: null }))
        .mockReturnValueOnce(createChainableMock({ data: document, error: null }));

      const result = await service.createDocument('tenant-abc', {
        template_id: 'template-123',
        client_id: 'client-111',
        pet_id: 'pet-789',
      });

      expect(result.success).toBe(true);
      expect(result.data?.status).toBe('pending');
    });

    it('sets expiry date based on template validity', async () => {
      const template = { validity_days: 30, default_expiry_days: null };
      const document = createMockDocument({ expires_at: '2026-02-01T00:00:00Z' });

      mockClient.from
        .mockReturnValueOnce(createChainableMock({ data: template, error: null }))
        .mockReturnValueOnce(createChainableMock({ data: document, error: null }));

      const result = await service.createDocument('tenant-abc', {
        template_id: 'template-123',
        client_id: 'client-111',
      });

      expect(result.success).toBe(true);
      expect(result.data?.expires_at).toBeDefined();
    });
  });

  describe('signDocument', () => {
    it('signs a pending document', async () => {
      const signedDoc = createMockDocument({
        status: 'signed',
        signed_at: '2026-01-15T10:00:00Z',
        signature_url: 'https://storage.example.com/signature.png',
      });

      mockClient.from.mockReturnValue(
        createChainableMock({ data: signedDoc, error: null })
      );

      const result = await service.signDocument('doc-456', {
        signature_url: 'https://storage.example.com/signature.png',
        ip_address: '192.168.1.1',
        user_agent: 'Mozilla/5.0',
      });

      expect(result.success).toBe(true);
      expect(result.data?.status).toBe('signed');
      expect(result.data?.signature_url).toBeDefined();
    });

    it('includes witness information if provided', async () => {
      const signedDoc = createMockDocument({
        status: 'signed',
        witness_name: 'Juan Testigo',
        witness_signature_url: 'https://storage.example.com/witness.png',
      });

      mockClient.from.mockReturnValue(
        createChainableMock({ data: signedDoc, error: null })
      );

      const result = await service.signDocument('doc-456', {
        signature_url: 'https://storage.example.com/signature.png',
        witness_name: 'Juan Testigo',
        witness_signature_url: 'https://storage.example.com/witness.png',
      });

      expect(result.success).toBe(true);
      expect(result.data?.witness_name).toBe('Juan Testigo');
    });
  });

  describe('revokeDocument', () => {
    // Fixed: Use sequential mock setup instead of chained mockReturnValueOnce
    it('revokes a signed document', async () => {
      const currentDoc = {
        tenant_id: 'tenant-abc',
        template: [{ can_be_revoked: true }],
      };
      const revokedDoc = createMockDocument({
        status: 'revoked',
        revoked_at: '2026-01-20T10:00:00Z',
        revoked_reason: 'Patient request',
      });

      // Set up mocks sequentially for each call
      let callCount = 0;
      mockClient.from.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return createChainableMock({ data: currentDoc, error: null });
        } else if (callCount === 2) {
          return createChainableMock({ data: revokedDoc, error: null });
        } else if (callCount === 3) {
          return createChainableMock({ data: null, error: null });
        }
        return createChainableMock({ data: null, error: null });
      });

      const result = await service.revokeDocument(
        'doc-456',
        { reason: 'Patient request' },
        'user-123'
      );

      expect(result.success).toBe(true);
      expect(result.data?.status).toBe('revoked');
    });

    it('prevents revocation if template does not allow it', async () => {
      const currentDoc = {
        tenant_id: 'tenant-abc',
        template: { can_be_revoked: false },
      };

      mockClient.from.mockReturnValue(
        createChainableMock({ data: currentDoc, error: null })
      );

      const result = await service.revokeDocument(
        'doc-456',
        { reason: 'Patient request' },
        'user-123'
      );

      expect(result.success).toBe(false);
      // The specific error message is wrapped by handleError
      expect(result.error).toBeDefined();
    });
  });

  describe('markDocumentSent', () => {
    it('marks document as email sent', async () => {
      const document = createMockDocument({
        email_sent_at: '2026-01-15T10:00:00Z',
      });

      mockClient.from
        .mockReturnValueOnce(createChainableMock({ data: document, error: null }))
        .mockReturnValueOnce(createChainableMock({ data: null, error: null }));

      const result = await service.markDocumentSent('doc-456', 'user-123');

      expect(result.success).toBe(true);
      expect(result.data?.email_sent_at).toBeDefined();
    });
  });

  describe('hasValidConsent', () => {
    it('returns true if valid consent exists', async () => {
      mockClient.from.mockReturnValue(
        createChainableMock({
          data: [{ id: 'doc-123', expires_at: null }],
          error: null,
        })
      );

      const result = await service.hasValidConsent('pet-789', 'SURGERY-GENERAL');

      expect(result.success).toBe(true);
      expect(result.data).toBe(true);
    });

    it('returns false if no valid consent', async () => {
      mockClient.from.mockReturnValue(
        createChainableMock({ data: [], error: null })
      );

      const result = await service.hasValidConsent('pet-789', 'SURGERY-GENERAL');

      expect(result.success).toBe(true);
      expect(result.data).toBe(false);
    });
  });

  // ===========================================================================
  // PREFERENCE TESTS
  // ===========================================================================

  describe('getUserPreferences', () => {
    it('returns all consent preferences for a user', async () => {
      const preferences = [
        createMockPreference({ consent_type: 'marketing_email', granted: true }),
        createMockPreference({ consent_type: 'marketing_sms', granted: false }),
      ];

      mockClient.from.mockReturnValue(
        createChainableMock({ data: preferences, error: null })
      );

      const result = await service.getUserPreferences('user-456', 'tenant-abc');

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
    });
  });

  describe('hasPreferenceConsent', () => {
    it('uses RPC to check if user has consent', async () => {
      mockClient.rpc.mockResolvedValue({ data: true, error: null });

      const result = await service.hasPreferenceConsent(
        'user-456',
        'tenant-abc',
        'marketing_email'
      );

      expect(result.success).toBe(true);
      expect(result.data).toBe(true);
      expect(mockClient.rpc).toHaveBeenCalledWith('has_consent', {
        p_user_id: 'user-456',
        p_tenant_id: 'tenant-abc',
        p_consent_type: 'marketing_email',
      });
    });

    it('returns false if consent not granted', async () => {
      mockClient.rpc.mockResolvedValue({ data: false, error: null });

      const result = await service.hasPreferenceConsent(
        'user-456',
        'tenant-abc',
        'marketing_email'
      );

      expect(result.success).toBe(true);
      expect(result.data).toBe(false);
    });
  });

  describe('updatePreference', () => {
    it('updates a consent preference', async () => {
      const preference = createMockPreference({ granted: true });

      mockClient.from.mockReturnValue(
        createChainableMock({ data: preference, error: null })
      );

      const result = await service.updatePreference(
        'user-456',
        'tenant-abc',
        'marketing_email',
        { granted: true, source: 'settings' }
      );

      expect(result.success).toBe(true);
      expect(result.data?.granted).toBe(true);
    });

    it('withdraws consent when granted is false', async () => {
      const preference = createMockPreference({
        granted: false,
        withdrawn_at: '2026-01-15T10:00:00Z',
      });

      mockClient.from.mockReturnValue(
        createChainableMock({ data: preference, error: null })
      );

      const result = await service.updatePreference(
        'user-456',
        'tenant-abc',
        'marketing_email',
        { granted: false }
      );

      expect(result.success).toBe(true);
      expect(result.data?.granted).toBe(false);
      expect(result.data?.withdrawn_at).toBeDefined();
    });
  });

  describe('updatePreferences', () => {
    it('bulk updates multiple consent preferences', async () => {
      const preferences = [
        createMockPreference({ consent_type: 'marketing_email', granted: true }),
        createMockPreference({ consent_type: 'marketing_sms', granted: false }),
      ];

      mockClient.from.mockReturnValue(
        createChainableMock({ data: preferences, error: null })
      );

      const result = await service.updatePreferences(
        'user-456',
        'tenant-abc',
        [
          { consent_type: 'marketing_email', granted: true },
          { consent_type: 'marketing_sms', granted: false },
        ],
        'signup'
      );

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
    });
  });

  describe('getPreferenceAuditHistory', () => {
    it('returns audit history for user preferences', async () => {
      const auditEntries = [
        {
          id: 'audit-1',
          consent_type: 'marketing_email',
          old_value: null,
          new_value: true,
        },
        {
          id: 'audit-2',
          consent_type: 'marketing_email',
          old_value: true,
          new_value: false,
        },
      ];

      mockClient.from.mockReturnValue(
        createChainableMock({ data: auditEntries, error: null })
      );

      const result = await service.getPreferenceAuditHistory('user-456', 'tenant-abc');

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
    });
  });

  describe('getConsentAnalytics', () => {
    it('returns consent analytics for tenant', async () => {
      const analytics = [
        {
          consent_type: 'marketing_email',
          total_users: 100,
          granted_count: 75,
          withdrawn_count: 5,
          grant_rate: 75.0,
          changes_last_30_days: 10,
        },
      ];

      mockClient.rpc.mockResolvedValue({ data: analytics, error: null });

      const result = await service.getConsentAnalytics('tenant-abc');

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(mockClient.rpc).toHaveBeenCalledWith('get_consent_analytics', {
        p_tenant_id: 'tenant-abc',
      });
    });
  });

  // ===========================================================================
  // AUDIT TESTS
  // ===========================================================================

  describe('getDocumentAuditLog', () => {
    it('returns audit log for a document', async () => {
      const auditLog = [
        { id: 'log-1', action: 'signed', created_at: '2026-01-15T10:00:00Z' },
        { id: 'log-2', action: 'viewed', created_at: '2026-01-16T10:00:00Z' },
      ];

      mockClient.from.mockReturnValue(
        createChainableMock({ data: auditLog, error: null })
      );

      const result = await service.getDocumentAuditLog('doc-456');

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
    });
  });

  // ===========================================================================
  // BLANKET CONSENT TESTS
  // ===========================================================================

  describe('getBlanketConsents', () => {
    it('returns blanket consents for a client', async () => {
      const consents = [
        createMockDocument({ pet_id: null, status: 'signed' }),
      ];

      mockClient.from.mockReturnValue(
        createChainableMock({ data: consents, error: null })
      );

      const result = await service.getBlanketConsents('tenant-abc', 'client-111');

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.data?.[0].pet_id).toBeNull();
    });
  });
});
