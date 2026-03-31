-- =============================================================================
-- 082_ADD_RLS_TO_ARCHIVE_TABLES.SQL
-- =============================================================================
-- Adds Row-Level Security policies to archive schema tables to enforce
-- proper tenant isolation on archived data.
--
-- SECURITY ISSUE: Archive tables created in migration 028 are missing RLS
-- policies, which means ANY authenticated user can access archived data
-- from ALL tenants without restriction.
--
-- EPIC: EPIC-002-Database-Schema-Consistency
-- TICKET: TICKET-DB-002
-- =============================================================================

BEGIN;

-- =============================================================================
-- A. ENABLE RLS ON ALL ARCHIVE TABLES
-- =============================================================================

ALTER TABLE archive.medical_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE archive.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE archive.invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE archive.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE archive.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE archive.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE archive.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE archive.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE archive.archiving_log ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- B. ARCHIVE.MEDICAL_RECORDS POLICIES
-- =============================================================================

-- Staff can view archived medical records in their tenant
CREATE POLICY "Staff view archived medical records"
ON archive.medical_records
FOR SELECT
TO authenticated
USING (
  is_staff_of(tenant_id)
);

-- Pet owners can view their own pets' archived records
CREATE POLICY "Owners view own archived medical records"
ON archive.medical_records
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM pets
    WHERE pets.id = archive.medical_records.pet_id
    AND is_owner_of_pet(pets.id)
  )
);

-- Service role full access
CREATE POLICY "Service role full access archived medical records"
ON archive.medical_records
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- =============================================================================
-- C. ARCHIVE.INVOICES POLICIES
-- =============================================================================

-- Staff can view archived invoices in their tenant
CREATE POLICY "Staff view archived invoices"
ON archive.invoices
FOR SELECT
TO authenticated
USING (
  is_staff_of(tenant_id)
);

-- Clients can view their own archived invoices
CREATE POLICY "Clients view own archived invoices"
ON archive.invoices
FOR SELECT
TO authenticated
USING (
  client_id = auth.uid()
);

-- Service role full access
CREATE POLICY "Service role full access archived invoices"
ON archive.invoices
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- =============================================================================
-- D. ARCHIVE.INVOICE_ITEMS POLICIES
-- =============================================================================

-- Staff can view archived invoice items in their tenant
CREATE POLICY "Staff view archived invoice items"
ON archive.invoice_items
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM archive.invoices
    WHERE archive.invoices.id = archive.invoice_items.invoice_id
    AND is_staff_of(archive.invoices.tenant_id)
  )
);

-- Clients can view their own archived invoice items
CREATE POLICY "Clients view own archived invoice items"
ON archive.invoice_items
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM archive.invoices
    WHERE archive.invoices.id = archive.invoice_items.invoice_id
    AND archive.invoices.client_id = auth.uid()
  )
);

-- Service role full access
CREATE POLICY "Service role full access archived invoice items"
ON archive.invoice_items
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- =============================================================================
-- E. ARCHIVE.PAYMENTS POLICIES
-- =============================================================================

-- Staff can view archived payments in their tenant
CREATE POLICY "Staff view archived payments"
ON archive.payments
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM archive.invoices
    WHERE archive.invoices.id = archive.payments.invoice_id
    AND is_staff_of(archive.invoices.tenant_id)
  )
);

-- Clients can view their own archived payments
CREATE POLICY "Clients view own archived payments"
ON archive.payments
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM archive.invoices
    WHERE archive.invoices.id = archive.payments.invoice_id
    AND archive.invoices.client_id = auth.uid()
  )
);

-- Service role full access
CREATE POLICY "Service role full access archived payments"
ON archive.payments
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- =============================================================================
-- F. ARCHIVE.AUDIT_LOGS POLICIES
-- =============================================================================

-- Only staff can view archived audit logs (security logs)
CREATE POLICY "Staff view archived audit logs"
ON archive.audit_logs
FOR SELECT
TO authenticated
USING (
  is_staff_of(tenant_id)
);

-- Service role full access
CREATE POLICY "Service role full access archived audit logs"
ON archive.audit_logs
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- =============================================================================
-- G. ARCHIVE.MESSAGES POLICIES
-- =============================================================================

-- Staff can view archived messages in their tenant
CREATE POLICY "Staff view archived messages"
ON archive.messages
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM archive.conversations
    WHERE archive.conversations.id = archive.messages.conversation_id
    AND is_staff_of(archive.conversations.tenant_id)
  )
);

-- Users can view their own archived messages
CREATE POLICY "Users view own archived messages"
ON archive.messages
FOR SELECT
TO authenticated
USING (
  sender_id = auth.uid()
  OR
  EXISTS (
    SELECT 1 FROM archive.conversations
    WHERE archive.conversations.id = archive.messages.conversation_id
    AND archive.conversations.client_id = auth.uid()
  )
);

-- Service role full access
CREATE POLICY "Service role full access archived messages"
ON archive.messages
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- =============================================================================
-- H. ARCHIVE.CONVERSATIONS POLICIES
-- =============================================================================

-- Staff can view archived conversations in their tenant
CREATE POLICY "Staff view archived conversations"
ON archive.conversations
FOR SELECT
TO authenticated
USING (
  is_staff_of(tenant_id)
);

-- Clients can view their own archived conversations
CREATE POLICY "Clients view own archived conversations"
ON archive.conversations
FOR SELECT
TO authenticated
USING (
  client_id = auth.uid()
);

-- Service role full access
CREATE POLICY "Service role full access archived conversations"
ON archive.conversations
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- =============================================================================
-- I. ARCHIVE.APPOINTMENTS POLICIES
-- =============================================================================

-- Staff can view archived appointments in their tenant
CREATE POLICY "Staff view archived appointments"
ON archive.appointments
FOR SELECT
TO authenticated
USING (
  is_staff_of(tenant_id)
);

-- Pet owners can view their own archived appointments
CREATE POLICY "Owners view own archived appointments"
ON archive.appointments
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM pets
    WHERE pets.id = archive.appointments.pet_id
    AND is_owner_of_pet(pets.id)
  )
);

-- Service role full access
CREATE POLICY "Service role full access archived appointments"
ON archive.appointments
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- =============================================================================
-- J. ARCHIVE.ARCHIVING_LOG POLICIES
-- =============================================================================

-- Only service role can access archiving logs (operational data)
CREATE POLICY "Service role only archiving log"
ON archive.archiving_log
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Admins can view archiving logs (read-only)
CREATE POLICY "Admins view archiving log"
ON archive.archiving_log
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- =============================================================================
-- K. UPDATE COMBINED VIEWS TO RESPECT RLS
-- =============================================================================

-- The views created in migration 028 already union public and archive tables
-- RLS policies will automatically apply when querying through the views
-- No changes needed to the views themselves

-- =============================================================================
-- L. CREATE INDEXES FOR RLS POLICY PERFORMANCE
-- =============================================================================

-- Archive medical records
CREATE INDEX IF NOT EXISTS idx_archive_medical_records_tenant_id 
ON archive.medical_records(tenant_id);

CREATE INDEX IF NOT EXISTS idx_archive_medical_records_pet_id 
ON archive.medical_records(pet_id);

-- Archive invoices
CREATE INDEX IF NOT EXISTS idx_archive_invoices_tenant_id 
ON archive.invoices(tenant_id);

CREATE INDEX IF NOT EXISTS idx_archive_invoices_client_id 
ON archive.invoices(client_id);

-- Archive invoice items (for FK lookups)
CREATE INDEX IF NOT EXISTS idx_archive_invoice_items_invoice_id 
ON archive.invoice_items(invoice_id);

-- Archive payments (for FK lookups)
CREATE INDEX IF NOT EXISTS idx_archive_payments_invoice_id 
ON archive.payments(invoice_id);

-- Archive audit logs
CREATE INDEX IF NOT EXISTS idx_archive_audit_logs_tenant_id 
ON archive.audit_logs(tenant_id);

-- Archive conversations
CREATE INDEX IF NOT EXISTS idx_archive_conversations_tenant_id 
ON archive.conversations(tenant_id);

CREATE INDEX IF NOT EXISTS idx_archive_conversations_client_id 
ON archive.conversations(client_id);

-- Archive messages (for FK lookups)
CREATE INDEX IF NOT EXISTS idx_archive_messages_conversation_id 
ON archive.messages(conversation_id);

CREATE INDEX IF NOT EXISTS idx_archive_messages_sender_id 
ON archive.messages(sender_id);

-- Archive appointments
CREATE INDEX IF NOT EXISTS idx_archive_appointments_tenant_id 
ON archive.appointments(tenant_id);

CREATE INDEX IF NOT EXISTS idx_archive_appointments_pet_id 
ON archive.appointments(pet_id);

-- =============================================================================
-- M. VERIFY MIGRATION
-- =============================================================================

DO $$
DECLARE
  tables_with_rls INTEGER;
  total_archive_tables INTEGER := 9;
BEGIN
  -- Count archive tables with RLS enabled
  SELECT COUNT(*) INTO tables_with_rls
  FROM pg_tables t
  JOIN pg_class c ON c.relname = t.tablename
  WHERE t.schemaname = 'archive'
    AND c.relrowsecurity = true;
  
  IF tables_with_rls < total_archive_tables THEN
    RAISE WARNING 'Expected % archive tables with RLS, found %', 
      total_archive_tables, tables_with_rls;
  ELSE
    RAISE NOTICE 'Archive RLS migration complete. % tables secured.', tables_with_rls;
  END IF;
  
  -- Count policies created
  RAISE NOTICE 'Total RLS policies on archive tables: %',
    (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'archive');
END $$;

-- Analyze tables for query planner
ANALYZE archive.medical_records;
ANALYZE archive.invoices;
ANALYZE archive.invoice_items;
ANALYZE archive.payments;
ANALYZE archive.audit_logs;
ANALYZE archive.messages;
ANALYZE archive.conversations;
ANALYZE archive.appointments;
ANALYZE archive.archiving_log;

COMMIT;

-- =============================================================================
-- VERIFICATION QUERIES (Run after migration)
-- =============================================================================
-- Check RLS is enabled:
-- SELECT tablename, rowsecurity 
-- FROM pg_tables t
-- JOIN pg_class c ON c.relname = t.tablename
-- WHERE schemaname = 'archive';
--
-- List all policies:
-- SELECT tablename, policyname, cmd, roles, qual
-- FROM pg_policies
-- WHERE schemaname = 'archive'
-- ORDER BY tablename, policyname;
--
-- Test tenant isolation (as staff user):
-- SELECT COUNT(*) FROM archive.medical_records;  -- Should only see own tenant
-- SELECT COUNT(*) FROM archive.invoices WHERE client_id != auth.uid();  -- Should be 0
-- =============================================================================
