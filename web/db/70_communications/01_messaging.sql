-- =============================================================================
-- 01_MESSAGING.SQL
-- =============================================================================
-- Communication system: conversations, messages, templates, reminders.
-- INCLUDES tenant_id on messages for optimized RLS.
--
-- DEPENDENCIES: 10_core/*, 20_pets/*, 40_scheduling/*
-- =============================================================================

-- =============================================================================
-- CONVERSATIONS
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL REFERENCES public.tenants(id),

    -- Participants
    client_id UUID NOT NULL REFERENCES public.profiles(id),
    pet_id UUID REFERENCES public.pets(id),

    -- Conversation info
    subject TEXT,
    channel TEXT NOT NULL DEFAULT 'in_app'
        CHECK (channel IN ('in_app', 'sms', 'whatsapp', 'email')),

    -- Status
    status TEXT NOT NULL DEFAULT 'open'
        CHECK (status IN ('open', 'pending', 'resolved', 'closed', 'spam')),
    priority TEXT DEFAULT 'normal'
        CHECK (priority IN ('low', 'normal', 'high', 'urgent')),

    -- Assignment
    assigned_to UUID REFERENCES public.profiles(id),
    assigned_at TIMESTAMPTZ,

    -- Timestamps
    last_message_at TIMESTAMPTZ,
    last_client_message_at TIMESTAMPTZ,
    last_staff_message_at TIMESTAMPTZ,
    client_last_read_at TIMESTAMPTZ,
    staff_last_read_at TIMESTAMPTZ,

    -- Counts
    unread_client_count INTEGER DEFAULT 0,
    unread_staff_count INTEGER DEFAULT 0,

    -- Related entities
    appointment_id UUID REFERENCES public.appointments(id),

    -- Tags
    tags TEXT[],

    -- Soft delete
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES public.profiles(id),

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.conversations IS 'Message threads between clinic staff and clients. Can be linked to pets or appointments.';
COMMENT ON COLUMN public.conversations.channel IS 'Communication channel: in_app, sms, whatsapp, email';
COMMENT ON COLUMN public.conversations.status IS 'Conversation status: open, pending (awaiting response), resolved, closed, spam';
COMMENT ON COLUMN public.conversations.unread_client_count IS 'Unread messages count for the client';
COMMENT ON COLUMN public.conversations.unread_staff_count IS 'Unread messages count for staff';

-- =============================================================================
-- MESSAGES - WITH TENANT_ID
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
    tenant_id TEXT NOT NULL REFERENCES public.tenants(id),

    -- Sender
    sender_id UUID REFERENCES public.profiles(id),
    sender_type TEXT NOT NULL
        CHECK (sender_type IN ('client', 'staff', 'system', 'bot')),
    sender_name TEXT,

    -- Content
    message_type TEXT NOT NULL DEFAULT 'text'
        CHECK (message_type IN (
            'text', 'image', 'file', 'audio', 'video', 'location',
            'appointment_card', 'invoice_card', 'prescription_card', 'system'
        )),
    content TEXT,
    content_html TEXT,

    -- Attachments
    attachments JSONB DEFAULT '[]',

    -- Rich cards
    card_data JSONB,

    -- Reply to
    reply_to_id UUID REFERENCES public.messages(id),

    -- Delivery status
    status TEXT NOT NULL DEFAULT 'sent'
        CHECK (status IN ('pending', 'sent', 'delivered', 'read', 'failed')),
    delivered_at TIMESTAMPTZ,
    read_at TIMESTAMPTZ,
    failed_reason TEXT,

    -- External
    external_message_id TEXT,
    external_channel TEXT,

    -- Metadata
    metadata JSONB DEFAULT '{}',

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.messages IS 'Individual messages within conversations. Includes tenant_id for optimized RLS.';
COMMENT ON COLUMN public.messages.sender_type IS 'Who sent: client, staff, system (automated), bot (AI)';
COMMENT ON COLUMN public.messages.message_type IS 'Content type: text, image, file, audio, video, location, or rich cards (appointment_card, etc.)';
COMMENT ON COLUMN public.messages.status IS 'Delivery status: pending → sent → delivered → read, or failed';
COMMENT ON COLUMN public.messages.card_data IS 'JSON data for rich cards (appointment details, invoice summary, etc.)';

-- =============================================================================
-- MESSAGE TEMPLATES
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.message_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT REFERENCES public.tenants(id),  -- NULL = global

    -- Template info
    code TEXT NOT NULL,
    name TEXT NOT NULL,
    category TEXT NOT NULL
        CHECK (category IN (
            'appointment', 'reminder', 'follow_up', 'marketing', 'transactional',
            'welcome', 'feedback', 'custom'
        )),

    -- Content
    subject TEXT,
    content TEXT NOT NULL,
    content_html TEXT,

    -- Variables
    variables TEXT[],

    -- Channel settings
    channels TEXT[] DEFAULT ARRAY['in_app'],
    sms_approved BOOLEAN DEFAULT false,
    whatsapp_template_id TEXT,

    -- Language
    language TEXT DEFAULT 'es',

    -- Status
    is_active BOOLEAN DEFAULT true,

    -- Soft delete
    deleted_at TIMESTAMPTZ,
    deleted_by UUID,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE(tenant_id, code)
);

COMMENT ON TABLE public.message_templates IS 'Reusable message templates with variable substitution. NULL tenant_id = global templates.';
COMMENT ON COLUMN public.message_templates.variables IS 'Array of variable names like owner_name, pet_name, appointment_date';
COMMENT ON COLUMN public.message_templates.channels IS 'Which channels this template can be sent on: in_app, sms, whatsapp, email';
COMMENT ON COLUMN public.message_templates.whatsapp_template_id IS 'Pre-approved WhatsApp Business template ID for compliant messaging';

CREATE UNIQUE INDEX IF NOT EXISTS idx_message_templates_global_code
ON public.message_templates (code) WHERE tenant_id IS NULL AND deleted_at IS NULL;

-- =============================================================================
-- REMINDERS
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.reminders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL REFERENCES public.tenants(id),

    -- Target
    client_id UUID NOT NULL REFERENCES public.profiles(id),
    pet_id UUID REFERENCES public.pets(id),

    -- Reminder type
    type TEXT NOT NULL
        CHECK (type IN (
            'vaccine_reminder', 'vaccine_overdue',
            'appointment_reminder', 'appointment_confirmation', 'appointment_cancelled',
            'invoice_sent', 'payment_received', 'payment_overdue',
            'birthday', 'follow_up', 'lab_results_ready',
            'hospitalization_update', 'custom'
        )),

    -- Reference
    reference_type TEXT,
    reference_id UUID,

    -- Schedule
    scheduled_at TIMESTAMPTZ NOT NULL,

    -- Status
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'processing', 'sent', 'failed', 'cancelled', 'skipped')),

    -- Attempts
    attempts INTEGER DEFAULT 0,
    max_attempts INTEGER DEFAULT 3,
    last_attempt_at TIMESTAMPTZ,
    next_attempt_at TIMESTAMPTZ,

    -- Error
    error_message TEXT,

    -- Custom content
    custom_subject TEXT,
    custom_body TEXT,

    -- Soft delete
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES public.profiles(id),

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.reminders IS 'Scheduled reminders for vaccines, appointments, payments, etc. Processed by background jobs.';
COMMENT ON COLUMN public.reminders.type IS 'Reminder type: vaccine_reminder, appointment_reminder, payment_overdue, birthday, follow_up, etc.';
COMMENT ON COLUMN public.reminders.status IS 'Processing status: pending → processing → sent, or failed/cancelled/skipped';
COMMENT ON COLUMN public.reminders.reference_type IS 'Type of referenced entity (vaccine, appointment, invoice, etc.)';
COMMENT ON COLUMN public.reminders.reference_id IS 'UUID of the referenced entity';

-- =============================================================================
-- NOTIFICATION QUEUE
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.notification_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL REFERENCES public.tenants(id),
    reminder_id UUID REFERENCES public.reminders(id),

    -- Recipient
    client_id UUID NOT NULL REFERENCES public.profiles(id),

    -- Channel
    channel_type TEXT NOT NULL
        CHECK (channel_type IN ('email', 'sms', 'whatsapp', 'push', 'in_app')),

    -- Destination
    destination TEXT NOT NULL,

    -- Content
    subject TEXT,
    body TEXT NOT NULL,

    -- Status
    status TEXT NOT NULL DEFAULT 'queued'
        CHECK (status IN ('queued', 'sending', 'sent', 'delivered', 'failed', 'bounced')),

    -- Tracking
    sent_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    opened_at TIMESTAMPTZ,
    clicked_at TIMESTAMPTZ,

    -- Error
    error_code TEXT,
    error_message TEXT,

    -- External reference
    external_id TEXT,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.notification_queue IS 'Outbound notification queue for multi-channel delivery (email, SMS, WhatsApp, push)';
COMMENT ON COLUMN public.notification_queue.channel_type IS 'Delivery channel: email, sms, whatsapp, push, in_app';
COMMENT ON COLUMN public.notification_queue.status IS 'Delivery status: queued → sending → sent → delivered, or failed/bounced';

-- =============================================================================
-- COMMUNICATION PREFERENCES
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.communication_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id),
    tenant_id TEXT REFERENCES public.tenants(id),

    -- Channel preferences
    allow_sms BOOLEAN DEFAULT true,
    allow_whatsapp BOOLEAN DEFAULT true,
    allow_email BOOLEAN DEFAULT true,
    allow_in_app BOOLEAN DEFAULT true,
    allow_push BOOLEAN DEFAULT true,

    -- Contact info
    preferred_phone TEXT,
    preferred_email TEXT,
    whatsapp_number TEXT,

    -- Type preferences
    allow_appointment_reminders BOOLEAN DEFAULT true,
    allow_vaccine_reminders BOOLEAN DEFAULT true,
    allow_marketing BOOLEAN DEFAULT false,
    allow_feedback_requests BOOLEAN DEFAULT true,

    -- Quiet hours
    quiet_hours_enabled BOOLEAN DEFAULT false,
    quiet_hours_start TIME DEFAULT '22:00',
    quiet_hours_end TIME DEFAULT '08:00',

    -- Language
    preferred_language TEXT DEFAULT 'es',
    timezone TEXT DEFAULT 'America/Asuncion',

    -- Unsubscribe
    unsubscribed_at TIMESTAMPTZ,
    unsubscribe_reason TEXT,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE(user_id, tenant_id)
);

COMMENT ON TABLE public.communication_preferences IS 'Per-user communication preferences: channels, quiet hours, opt-outs';
COMMENT ON COLUMN public.communication_preferences.allow_marketing IS 'Opt-in for promotional messages (defaults false for GDPR/privacy)';
COMMENT ON COLUMN public.communication_preferences.quiet_hours_enabled IS 'When TRUE, no notifications between quiet_hours_start and quiet_hours_end';

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.communication_preferences ENABLE ROW LEVEL SECURITY;

-- Conversations
DROP POLICY IF EXISTS "Staff manage conversations" ON public.conversations;
CREATE POLICY "Staff manage conversations" ON public.conversations
    FOR ALL TO authenticated
    USING (public.is_staff_of(tenant_id));

DROP POLICY IF EXISTS "Clients view own conversations" ON public.conversations;
CREATE POLICY "Clients view own conversations" ON public.conversations
    FOR SELECT TO authenticated
    USING (client_id = auth.uid());

DROP POLICY IF EXISTS "Clients create conversations" ON public.conversations;
CREATE POLICY "Clients create conversations" ON public.conversations
    FOR INSERT TO authenticated
    WITH CHECK (client_id = auth.uid());

DROP POLICY IF EXISTS "Service role full access conversations" ON public.conversations;
CREATE POLICY "Service role full access conversations" ON public.conversations
    FOR ALL TO service_role USING (true);

-- OPTIMIZED RLS: Messages uses direct tenant_id
DROP POLICY IF EXISTS "Staff manage messages" ON public.messages;
CREATE POLICY "Staff manage messages" ON public.messages
    FOR ALL TO authenticated
    USING (public.is_staff_of(tenant_id));

DROP POLICY IF EXISTS "Clients view own messages" ON public.messages;
CREATE POLICY "Clients view own messages" ON public.messages
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.conversations c
            WHERE c.id = messages.conversation_id
            AND c.client_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Clients send messages" ON public.messages;
CREATE POLICY "Clients send messages" ON public.messages
    FOR INSERT TO authenticated
    WITH CHECK (
        sender_type = 'client' AND sender_id = auth.uid()
    );

DROP POLICY IF EXISTS "Service role full access messages" ON public.messages;
CREATE POLICY "Service role full access messages" ON public.messages
    FOR ALL TO service_role USING (true);

-- Message templates
DROP POLICY IF EXISTS "Read templates" ON public.message_templates;
CREATE POLICY "Read templates" ON public.message_templates
    FOR SELECT TO authenticated
    USING ((tenant_id IS NULL OR public.is_staff_of(tenant_id)) AND deleted_at IS NULL);

DROP POLICY IF EXISTS "Staff manage templates" ON public.message_templates;
CREATE POLICY "Staff manage templates" ON public.message_templates
    FOR ALL TO authenticated
    USING (tenant_id IS NOT NULL AND public.is_staff_of(tenant_id) AND deleted_at IS NULL);

DROP POLICY IF EXISTS "Service role manage templates" ON public.message_templates;
CREATE POLICY "Service role manage templates" ON public.message_templates
    FOR ALL TO service_role USING (true);

-- Reminders
DROP POLICY IF EXISTS "Staff manage reminders" ON public.reminders;
CREATE POLICY "Staff manage reminders" ON public.reminders
    FOR ALL TO authenticated
    USING (public.is_staff_of(tenant_id));

DROP POLICY IF EXISTS "Clients view own reminders" ON public.reminders;
CREATE POLICY "Clients view own reminders" ON public.reminders
    FOR SELECT TO authenticated
    USING (client_id = auth.uid());

DROP POLICY IF EXISTS "Service role full access reminders" ON public.reminders;
CREATE POLICY "Service role full access reminders" ON public.reminders
    FOR ALL TO service_role USING (true);

-- Notification queue
DROP POLICY IF EXISTS "Staff manage queue" ON public.notification_queue;
CREATE POLICY "Staff manage queue" ON public.notification_queue
    FOR ALL TO authenticated
    USING (public.is_staff_of(tenant_id));

DROP POLICY IF EXISTS "Service role full access queue" ON public.notification_queue;
CREATE POLICY "Service role full access queue" ON public.notification_queue
    FOR ALL TO service_role USING (true);

-- Communication preferences
DROP POLICY IF EXISTS "Users manage own preferences" ON public.communication_preferences;
CREATE POLICY "Users manage own preferences" ON public.communication_preferences
    FOR ALL TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Staff view preferences" ON public.communication_preferences;
CREATE POLICY "Staff view preferences" ON public.communication_preferences
    FOR SELECT TO authenticated
    USING (tenant_id IS NOT NULL AND public.is_staff_of(tenant_id));

DROP POLICY IF EXISTS "Service role full access preferences" ON public.communication_preferences;
CREATE POLICY "Service role full access preferences" ON public.communication_preferences
    FOR ALL TO service_role USING (true);

-- =============================================================================
-- INDEXES
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_conversations_tenant ON public.conversations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_conversations_client ON public.conversations(client_id);
CREATE INDEX IF NOT EXISTS idx_conversations_pet ON public.conversations(pet_id);
CREATE INDEX IF NOT EXISTS idx_conversations_status ON public.conversations(status);
CREATE INDEX IF NOT EXISTS idx_conversations_assigned ON public.conversations(assigned_to);
CREATE INDEX IF NOT EXISTS idx_conversations_last_message ON public.conversations(last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversations_unread_staff ON public.conversations(unread_staff_count)
    WHERE unread_staff_count > 0;

-- Staff inbox (unread first)
CREATE INDEX IF NOT EXISTS idx_conversations_inbox ON public.conversations(tenant_id, unread_staff_count DESC, last_message_at DESC)
    INCLUDE (client_id, pet_id, subject, status, priority);

-- Client conversations (covering index)
CREATE INDEX IF NOT EXISTS idx_conversations_client_history ON public.conversations(client_id, last_message_at DESC)
    INCLUDE (tenant_id, subject, status, unread_client_count);

CREATE INDEX IF NOT EXISTS idx_messages_conversation ON public.messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_tenant ON public.messages(tenant_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON public.messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_brin ON public.messages
    USING BRIN(created_at) WITH (pages_per_range = 32);

-- GIN indexes for JSONB columns (efficient message metadata searches)
CREATE INDEX IF NOT EXISTS idx_messages_metadata_gin ON public.messages USING gin(metadata jsonb_path_ops)
    WHERE metadata IS NOT NULL AND metadata != '{}';
CREATE INDEX IF NOT EXISTS idx_messages_attachments_gin ON public.messages USING gin(attachments jsonb_path_ops)
    WHERE attachments IS NOT NULL AND attachments != '[]';

-- BRIN index for notification queue
CREATE INDEX IF NOT EXISTS idx_notification_queue_created_brin ON public.notification_queue
    USING BRIN(created_at) WITH (pages_per_range = 32);
CREATE INDEX IF NOT EXISTS idx_messages_status ON public.messages(status);

CREATE INDEX IF NOT EXISTS idx_message_templates_tenant ON public.message_templates(tenant_id);
CREATE INDEX IF NOT EXISTS idx_message_templates_category ON public.message_templates(category);
CREATE INDEX IF NOT EXISTS idx_message_templates_active ON public.message_templates(is_active)
    WHERE is_active = true AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_reminders_tenant ON public.reminders(tenant_id);
CREATE INDEX IF NOT EXISTS idx_reminders_client ON public.reminders(client_id);
CREATE INDEX IF NOT EXISTS idx_reminders_status ON public.reminders(status);
CREATE INDEX IF NOT EXISTS idx_reminders_scheduled ON public.reminders(scheduled_at)
    WHERE status = 'pending';

-- BRIN index for reminders
CREATE INDEX IF NOT EXISTS idx_reminders_scheduled_brin ON public.reminders
    USING BRIN(scheduled_at) WITH (pages_per_range = 32);

-- Reminders to process
CREATE INDEX IF NOT EXISTS idx_reminders_queue ON public.reminders(scheduled_at, status)
    INCLUDE (tenant_id, client_id, pet_id, type, reference_type, reference_id)
    WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_reminders_reference ON public.reminders(reference_type, reference_id);

CREATE INDEX IF NOT EXISTS idx_notification_queue_status ON public.notification_queue(status)
    WHERE status = 'queued';
CREATE INDEX IF NOT EXISTS idx_notification_queue_tenant ON public.notification_queue(tenant_id);

CREATE INDEX IF NOT EXISTS idx_communication_prefs_user ON public.communication_preferences(user_id);

-- =============================================================================
-- TRIGGERS
-- =============================================================================

DROP TRIGGER IF EXISTS handle_updated_at ON public.conversations;
CREATE TRIGGER handle_updated_at
    BEFORE UPDATE ON public.conversations
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS handle_updated_at ON public.messages;
CREATE TRIGGER handle_updated_at
    BEFORE UPDATE ON public.messages
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS handle_updated_at ON public.message_templates;
CREATE TRIGGER handle_updated_at
    BEFORE UPDATE ON public.message_templates
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS handle_updated_at ON public.reminders;
CREATE TRIGGER handle_updated_at
    BEFORE UPDATE ON public.reminders
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS handle_updated_at ON public.communication_preferences;
CREATE TRIGGER handle_updated_at
    BEFORE UPDATE ON public.communication_preferences
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Auto-set tenant_id for messages
CREATE OR REPLACE FUNCTION public.messages_set_tenant_id()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.tenant_id IS NULL THEN
        SELECT tenant_id INTO NEW.tenant_id
        FROM public.conversations
        WHERE id = NEW.conversation_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS messages_auto_tenant ON public.messages;
CREATE TRIGGER messages_auto_tenant
    BEFORE INSERT ON public.messages
    FOR EACH ROW EXECUTE FUNCTION public.messages_set_tenant_id();

-- =============================================================================
-- FUNCTIONS
-- =============================================================================

-- Update conversation on message
CREATE OR REPLACE FUNCTION public.update_conversation_on_message()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.conversations SET
        last_message_at = NEW.created_at,
        last_client_message_at = CASE WHEN NEW.sender_type = 'client' THEN NEW.created_at ELSE last_client_message_at END,
        last_staff_message_at = CASE WHEN NEW.sender_type = 'staff' THEN NEW.created_at ELSE last_staff_message_at END,
        unread_client_count = CASE WHEN NEW.sender_type IN ('staff', 'system') THEN unread_client_count + 1 ELSE unread_client_count END,
        unread_staff_count = CASE WHEN NEW.sender_type = 'client' THEN unread_staff_count + 1 ELSE unread_staff_count END,
        status = CASE WHEN status = 'resolved' AND NEW.sender_type = 'client' THEN 'open' ELSE status END
    WHERE id = NEW.conversation_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS message_update_conversation ON public.messages;
CREATE TRIGGER message_update_conversation
    AFTER INSERT ON public.messages
    FOR EACH ROW EXECUTE FUNCTION public.update_conversation_on_message();

-- Mark conversation as read
CREATE OR REPLACE FUNCTION public.mark_conversation_read(
    p_conversation_id UUID,
    p_user_type TEXT
)
RETURNS VOID AS $$
BEGIN
    IF p_user_type = 'client' THEN
        UPDATE public.conversations SET
            client_last_read_at = NOW(),
            unread_client_count = 0
        WHERE id = p_conversation_id;

        UPDATE public.messages SET
            status = 'read',
            read_at = NOW()
        WHERE conversation_id = p_conversation_id
          AND sender_type IN ('staff', 'system')
          AND status != 'read';
    ELSE
        UPDATE public.conversations SET
            staff_last_read_at = NOW(),
            unread_staff_count = 0
        WHERE id = p_conversation_id;

        UPDATE public.messages SET
            status = 'read',
            read_at = NOW()
        WHERE conversation_id = p_conversation_id
          AND sender_type = 'client'
          AND status != 'read';
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- =============================================================================
-- SEED DATA
-- =============================================================================

INSERT INTO public.message_templates (tenant_id, code, name, category, subject, content, variables, channels) VALUES
(NULL, 'APPT_CONFIRM', 'Confirmación de Cita', 'appointment',
 'Cita Confirmada',
 'Hola {{owner_name}}, tu cita para {{pet_name}} ha sido confirmada para el {{appointment_date}} a las {{appointment_time}}. Te esperamos en {{clinic_name}}.',
 ARRAY['owner_name', 'pet_name', 'appointment_date', 'appointment_time', 'clinic_name'],
 ARRAY['in_app', 'sms', 'whatsapp']),

(NULL, 'APPT_REMINDER_24H', 'Recordatorio de Cita (24h)', 'reminder',
 'Recordatorio de Cita',
 'Hola {{owner_name}}, te recordamos que tienes una cita mañana {{appointment_date}} a las {{appointment_time}} para {{pet_name}} en {{clinic_name}}.',
 ARRAY['owner_name', 'pet_name', 'appointment_date', 'appointment_time', 'clinic_name'],
 ARRAY['in_app', 'sms', 'whatsapp']),

(NULL, 'VACCINE_REMINDER', 'Recordatorio de Vacuna', 'reminder',
 'Recordatorio de Vacuna',
 'Hola {{owner_name}}, {{pet_name}} tiene pendiente la vacuna {{vaccine_name}}. Por favor agenda una cita llamando al {{clinic_phone}}.',
 ARRAY['owner_name', 'pet_name', 'vaccine_name', 'clinic_phone'],
 ARRAY['in_app', 'sms']),

(NULL, 'WELCOME', 'Bienvenida', 'welcome',
 'Bienvenido a {{clinic_name}}',
 'Bienvenido/a a {{clinic_name}}, {{owner_name}}! Gracias por registrar a {{pet_name}}. Estamos aquí para cuidar de tu mascota.',
 ARRAY['clinic_name', 'owner_name', 'pet_name'],
 ARRAY['in_app', 'email']),

(NULL, 'INVOICE_READY', 'Factura Lista', 'transactional',
 'Factura #{{invoice_number}} Lista',
 'Hola {{owner_name}}, tu factura #{{invoice_number}} por {{amount}} está lista. Puedes verla en tu portal de cliente.',
 ARRAY['owner_name', 'invoice_number', 'amount'],
 ARRAY['in_app', 'email'])
ON CONFLICT DO NOTHING;

