# AUDIT-110 Missing Appointment Audit Trail

## Priority: P2

## Category: Technical Debt / Audit

## Status: Not Started

## Epic: [EPIC-10: Audit & Compliance](../epics/EPIC-10-audit-compliance.md)

## Description

There is no dedicated audit table for appointment changes. While `financial_audit_logs` tracks invoice/payment changes comprehensively, appointment modifications (status changes, rescheduling, vet assignments) are only tracked via `updated_at` timestamp.

### Current State

- Appointment changes update `updated_at` column
- No record of WHO made the change
- No record of WHAT was changed
- No record of PREVIOUS values
- Cannot audit appointment history for disputes

### Why This Matters

1. **Compliance**: Healthcare regulations may require audit trails
2. **Disputes**: "I didn't cancel that appointment" - no proof either way
3. **Staff accountability**: Who rescheduled without permission?
4. **Debugging**: Why is this appointment in wrong status?

### Comparison: Financial Audit Logs

```sql
-- financial_audit_logs (exists)
CREATE TABLE financial_audit_logs (
  id UUID PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  entity_type TEXT NOT NULL,  -- 'invoice', 'payment', etc.
  entity_id UUID NOT NULL,
  action TEXT NOT NULL,       -- 'created', 'updated', 'deleted'
  actor_id UUID,
  actor_type TEXT,            -- 'user', 'system', 'cron'
  previous_state JSONB,
  new_state JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ
);
```

Appointments should have similar tracking.

## Proposed Fix

### Migration

```sql
-- web/db/migrations/073_appointment_audit_logs.sql

CREATE TABLE appointment_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL REFERENCES tenants(id),
  appointment_id UUID NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  action TEXT NOT NULL,  -- 'created', 'status_changed', 'rescheduled', 'vet_assigned', 'cancelled', etc.
  actor_id UUID REFERENCES profiles(id),
  actor_type TEXT DEFAULT 'user',  -- 'user', 'system', 'cron', 'customer'
  previous_state JSONB,
  new_state JSONB,
  change_summary TEXT,  -- Human-readable summary
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX idx_appointment_audit_appointment ON appointment_audit_logs(appointment_id);
CREATE INDEX idx_appointment_audit_tenant_date ON appointment_audit_logs(tenant_id, created_at);
CREATE INDEX idx_appointment_audit_actor ON appointment_audit_logs(actor_id);

-- RLS
ALTER TABLE appointment_audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff view audit logs" ON appointment_audit_logs
  FOR SELECT USING (is_staff_of(tenant_id));

-- No UPDATE or DELETE - audit logs are immutable
```

### Trigger Function

```sql
CREATE OR REPLACE FUNCTION log_appointment_change()
RETURNS TRIGGER AS $$
DECLARE
  v_action TEXT;
  v_summary TEXT;
  v_actor_id UUID;
BEGIN
  -- Determine action type
  IF TG_OP = 'INSERT' THEN
    v_action := 'created';
    v_summary := 'Appointment created';
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.status != NEW.status THEN
      v_action := 'status_changed';
      v_summary := format('Status changed from %s to %s', OLD.status, NEW.status);
    ELSIF OLD.start_time != NEW.start_time OR OLD.end_time != NEW.end_time THEN
      v_action := 'rescheduled';
      v_summary := format('Rescheduled from %s to %s', OLD.start_time, NEW.start_time);
    ELSIF OLD.vet_id IS DISTINCT FROM NEW.vet_id THEN
      v_action := 'vet_assigned';
      v_summary := 'Veterinarian assignment changed';
    ELSE
      v_action := 'updated';
      v_summary := 'Appointment details updated';
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    v_action := 'deleted';
    v_summary := 'Appointment deleted';
  END IF;

  -- Try to get actor from session context (set by application)
  v_actor_id := NULLIF(current_setting('app.current_user_id', true), '')::UUID;

  INSERT INTO appointment_audit_logs (
    tenant_id,
    appointment_id,
    action,
    actor_id,
    actor_type,
    previous_state,
    new_state,
    change_summary
  ) VALUES (
    COALESCE(NEW.tenant_id, OLD.tenant_id),
    COALESCE(NEW.id, OLD.id),
    v_action,
    v_actor_id,
    CASE WHEN v_actor_id IS NULL THEN 'system' ELSE 'user' END,
    CASE WHEN TG_OP != 'INSERT' THEN to_jsonb(OLD) END,
    CASE WHEN TG_OP != 'DELETE' THEN to_jsonb(NEW) END,
    v_summary
  );

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers
CREATE TRIGGER tr_appointment_audit_insert
AFTER INSERT ON appointments
FOR EACH ROW EXECUTE FUNCTION log_appointment_change();

CREATE TRIGGER tr_appointment_audit_update
AFTER UPDATE ON appointments
FOR EACH ROW EXECUTE FUNCTION log_appointment_change();

CREATE TRIGGER tr_appointment_audit_delete
AFTER DELETE ON appointments
FOR EACH ROW EXECUTE FUNCTION log_appointment_change();
```

### Application Integration

```typescript
// Set actor context before database operations
// web/lib/supabase/audit-context.ts
export async function withAuditContext<T>(
  supabase: SupabaseClient,
  userId: string,
  operation: () => Promise<T>
): Promise<T> {
  // Set session variable for trigger to pick up
  await supabase.rpc('set_config', {
    setting: 'app.current_user_id',
    value: userId,
    is_local: true
  })

  return operation()
}
```

### Audit Log Viewer (Optional)

```typescript
// web/app/[clinic]/dashboard/appointments/[id]/audit/page.tsx
export default async function AppointmentAuditPage({ params }) {
  const { data: logs } = await supabase
    .from('appointment_audit_logs')
    .select(`
      *,
      actor:profiles(full_name)
    `)
    .eq('appointment_id', params.id)
    .order('created_at', { ascending: false })

  return (
    <AuditLogTimeline logs={logs} />
  )
}
```

## Acceptance Criteria

- [ ] `appointment_audit_logs` table created
- [ ] Triggers log all appointment changes
- [ ] Actor ID captured when available
- [ ] Previous and new state stored as JSONB
- [ ] Human-readable summary generated
- [ ] RLS allows only staff to view
- [ ] No DELETE or UPDATE allowed on audit logs
- [ ] Test: Change appointment status → Audit log created
- [ ] Test: Reschedule appointment → Audit log shows old/new times

## Related Files

- `web/db/40_scheduling/02_appointments.sql`
- `web/db/migrations/` - New migration
- `web/lib/supabase/audit-context.ts` (create)
- `web/app/[clinic]/dashboard/appointments/[id]/audit/` (optional)

## Estimated Effort

4-6 hours

## Privacy Considerations

- Audit logs contain appointment details (potentially sensitive)
- Only staff should access
- Consider data retention policy (e.g., 7 years for healthcare)
- GDPR: Include in data export requests
