-- =============================================================================
-- 02_REMINDER_RULES.SQL
-- =============================================================================
-- Automated reminder rules configuration
-- Allows clinics to configure automatic reminders for vaccines, appointments, etc.
--
-- DEPENDENCIES: 10_core/*, 70_communications/01_messaging.sql
-- =============================================================================

-- =============================================================================
-- REMINDER RULES
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.reminder_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL REFERENCES public.tenants(id),

    -- Rule identification
    name TEXT NOT NULL,
    description TEXT,

    -- Rule type
    type TEXT NOT NULL CHECK (type IN (
        'vaccine_due',           -- X days before vaccine due date
        'vaccine_overdue',       -- X days after vaccine due date
        'appointment_before',    -- X days/hours before appointment
        'appointment_after',     -- Follow-up X days after appointment
        'birthday',              -- Pet birthday reminder
        'wellness_checkup',      -- Annual/semi-annual checkup reminder
        'medication_refill',     -- Recurring medication reminders
        'custom'                 -- Custom reminders
    )),

    -- Timing
    days_offset INTEGER NOT NULL DEFAULT 0,      -- Days before (negative) or after (positive)
    hours_offset INTEGER DEFAULT 0,              -- Hours for appointment reminders
    time_of_day TIME DEFAULT '09:00:00',         -- What time to send (in tenant timezone)

    -- Channels
    channels TEXT[] NOT NULL DEFAULT ARRAY['email'],

    -- Template (optional - uses default if not specified)
    template_id UUID REFERENCES public.message_templates(id),

    -- Conditions (JSONB for flexibility)
    -- Examples:
    -- { "species": ["dog", "cat"] } - Only for dogs and cats
    -- { "appointment_type": ["consultation"] } - Only for consultations
    -- { "min_age_months": 12 } - Only for pets older than 1 year
    conditions JSONB,

    -- Priority (for deduplication - higher priority wins)
    priority INTEGER DEFAULT 0,

    -- Status
    is_active BOOLEAN DEFAULT true,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Unique constraint per tenant and rule type
    UNIQUE(tenant_id, name)
);

COMMENT ON TABLE public.reminder_rules IS 'Configuration for automated reminder generation. Clinics can customize when and how reminders are sent.';
COMMENT ON COLUMN public.reminder_rules.days_offset IS 'Days relative to event. Negative = before, positive = after. E.g., -1 = 1 day before';
COMMENT ON COLUMN public.reminder_rules.hours_offset IS 'Hours for fine-grained control (useful for appointment reminders)';
COMMENT ON COLUMN public.reminder_rules.conditions IS 'JSONB conditions for filtering (species, appointment_type, etc.)';

-- =============================================================================
-- REMINDER GENERATION LOG
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.reminder_generation_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL REFERENCES public.tenants(id),

    -- Run info
    run_date DATE NOT NULL,
    rule_type TEXT NOT NULL,

    -- Stats
    reminders_checked INTEGER DEFAULT 0,
    reminders_created INTEGER DEFAULT 0,
    reminders_skipped INTEGER DEFAULT 0,
    errors INTEGER DEFAULT 0,

    -- Details
    error_details JSONB,

    -- Timing
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,

    UNIQUE(tenant_id, run_date, rule_type)
);

COMMENT ON TABLE public.reminder_generation_log IS 'Audit log for reminder generation runs. Tracks what was processed each day.';

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE public.reminder_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reminder_generation_log ENABLE ROW LEVEL SECURITY;

-- Reminder rules
DROP POLICY IF EXISTS "Admins manage rules" ON public.reminder_rules;
CREATE POLICY "Admins manage rules" ON public.reminder_rules
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.tenant_id = reminder_rules.tenant_id
            AND profiles.role = 'admin'
        )
    );

DROP POLICY IF EXISTS "Staff view rules" ON public.reminder_rules;
CREATE POLICY "Staff view rules" ON public.reminder_rules
    FOR SELECT TO authenticated
    USING (public.is_staff_of(tenant_id));

DROP POLICY IF EXISTS "Service role full access rules" ON public.reminder_rules;
CREATE POLICY "Service role full access rules" ON public.reminder_rules
    FOR ALL TO service_role USING (true);

-- Generation log
DROP POLICY IF EXISTS "Staff view log" ON public.reminder_generation_log;
CREATE POLICY "Staff view log" ON public.reminder_generation_log
    FOR SELECT TO authenticated
    USING (public.is_staff_of(tenant_id));

DROP POLICY IF EXISTS "Service role full access log" ON public.reminder_generation_log;
CREATE POLICY "Service role full access log" ON public.reminder_generation_log
    FOR ALL TO service_role USING (true);

-- =============================================================================
-- INDEXES
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_reminder_rules_tenant ON public.reminder_rules(tenant_id);
CREATE INDEX IF NOT EXISTS idx_reminder_rules_type ON public.reminder_rules(type);
CREATE INDEX IF NOT EXISTS idx_reminder_rules_active ON public.reminder_rules(tenant_id, type)
    WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_reminder_gen_log_tenant ON public.reminder_generation_log(tenant_id);
CREATE INDEX IF NOT EXISTS idx_reminder_gen_log_date ON public.reminder_generation_log(run_date DESC);

-- =============================================================================
-- TRIGGERS
-- =============================================================================

DROP TRIGGER IF EXISTS handle_updated_at ON public.reminder_rules;
CREATE TRIGGER handle_updated_at
    BEFORE UPDATE ON public.reminder_rules
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- =============================================================================
-- SEED DATA - Default Rules
-- =============================================================================

-- Insert default rules for new tenants (can be done in trigger or app logic)
-- These are examples that clinics can customize

INSERT INTO public.reminder_rules (tenant_id, name, type, days_offset, time_of_day, channels, description)
SELECT
    t.id,
    'Recordatorio de Vacuna (7 días antes)',
    'vaccine_due',
    -7,
    '09:00:00',
    ARRAY['email', 'sms'],
    'Enviar recordatorio 7 días antes de que venza una vacuna'
FROM public.tenants t
WHERE NOT EXISTS (
    SELECT 1 FROM public.reminder_rules r
    WHERE r.tenant_id = t.id AND r.type = 'vaccine_due' AND r.days_offset = -7
)
ON CONFLICT DO NOTHING;

INSERT INTO public.reminder_rules (tenant_id, name, type, days_offset, time_of_day, channels, description)
SELECT
    t.id,
    'Recordatorio de Vacuna Vencida',
    'vaccine_overdue',
    7,
    '10:00:00',
    ARRAY['email', 'sms'],
    'Notificar 7 días después de que venció una vacuna'
FROM public.tenants t
WHERE NOT EXISTS (
    SELECT 1 FROM public.reminder_rules r
    WHERE r.tenant_id = t.id AND r.type = 'vaccine_overdue' AND r.days_offset = 7
)
ON CONFLICT DO NOTHING;

INSERT INTO public.reminder_rules (tenant_id, name, type, days_offset, hours_offset, time_of_day, channels, description)
SELECT
    t.id,
    'Recordatorio de Cita (24 horas)',
    'appointment_before',
    -1,
    0,
    '09:00:00',
    ARRAY['email', 'sms', 'whatsapp'],
    'Recordatorio 24 horas antes de la cita'
FROM public.tenants t
WHERE NOT EXISTS (
    SELECT 1 FROM public.reminder_rules r
    WHERE r.tenant_id = t.id AND r.type = 'appointment_before' AND r.days_offset = -1
)
ON CONFLICT DO NOTHING;

INSERT INTO public.reminder_rules (tenant_id, name, type, days_offset, time_of_day, channels, description)
SELECT
    t.id,
    'Cumpleaños de Mascota',
    'birthday',
    0,
    '08:00:00',
    ARRAY['email'],
    'Felicitación de cumpleaños para mascotas'
FROM public.tenants t
WHERE NOT EXISTS (
    SELECT 1 FROM public.reminder_rules r
    WHERE r.tenant_id = t.id AND r.type = 'birthday'
)
ON CONFLICT DO NOTHING;
