-- Migration: 053_financial_audit_logs.sql
-- Description: AUDIT-001 - Dedicated table for financial operation audit trail
-- Created: January 2026

-- =============================================================================
-- FINANCIAL AUDIT LOGS TABLE
-- =============================================================================

/**
 * financial_audit_logs - Immutable audit trail for financial operations
 *
 * Unlike general audit_logs, this table captures:
 * - Previous and new state for change tracking
 * - Amount and currency for financial traceability
 * - IP address and user agent for compliance
 * - Actor type (user, system, cron) for accountability
 *
 * Operations tracked:
 * - order_created, order_cancelled, order_refunded
 * - payment_recorded, payment_voided
 * - invoice_created, invoice_sent, invoice_paid, invoice_voided
 * - refund_processed, refund_approved, refund_rejected
 * - discount_applied, price_override
 */
CREATE TABLE IF NOT EXISTS financial_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL REFERENCES tenants(id),

  -- Operation details
  operation TEXT NOT NULL,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('order', 'invoice', 'payment', 'refund', 'subscription')),
  entity_id UUID NOT NULL,

  -- Actor information
  actor_id UUID REFERENCES auth.users(id),
  actor_type TEXT NOT NULL CHECK (actor_type IN ('user', 'system', 'cron')),

  -- Financial details
  amount DECIMAL(12, 2),
  currency TEXT DEFAULT 'PYG',

  -- State tracking
  previous_state JSONB,
  new_state JSONB,

  -- Additional context
  metadata JSONB DEFAULT '{}',

  -- Request context (for compliance)
  ip_address INET,
  user_agent TEXT,

  -- Timestamp
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- =============================================================================
-- INDEXES
-- =============================================================================

-- Primary lookup pattern: by tenant and entity
CREATE INDEX idx_financial_audit_tenant_entity
ON financial_audit_logs (tenant_id, entity_type, entity_id);

-- Time-based queries for reports
CREATE INDEX idx_financial_audit_created
ON financial_audit_logs (created_at DESC);

-- Actor lookup for user activity tracking
CREATE INDEX idx_financial_audit_actor
ON financial_audit_logs (actor_id, created_at DESC)
WHERE actor_id IS NOT NULL;

-- Operation type queries
CREATE INDEX idx_financial_audit_operation
ON financial_audit_logs (tenant_id, operation, created_at DESC);

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE financial_audit_logs ENABLE ROW LEVEL SECURITY;

-- Staff can view audit logs for their tenant
CREATE POLICY "Staff can view financial audit logs"
ON financial_audit_logs FOR SELECT
USING (is_staff_of(tenant_id));

-- Insert only policy - logs are immutable
CREATE POLICY "Insert financial audit logs"
ON financial_audit_logs FOR INSERT
WITH CHECK (true);

-- No update or delete policies - financial audit logs are immutable

-- =============================================================================
-- COMMENTS
-- =============================================================================

COMMENT ON TABLE financial_audit_logs IS
'AUDIT-001: Immutable audit trail for all financial operations.
Captures state changes, amounts, and request context for compliance.';

COMMENT ON COLUMN financial_audit_logs.previous_state IS
'State before the operation (for updates/deletes)';

COMMENT ON COLUMN financial_audit_logs.new_state IS
'State after the operation';

COMMENT ON COLUMN financial_audit_logs.actor_type IS
'user = authenticated user, system = background job, cron = scheduled task';
