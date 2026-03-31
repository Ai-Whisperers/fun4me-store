-- =============================================================================
-- 02_REALTIME.SQL
-- =============================================================================
-- Supabase Realtime subscriptions for live updates.
--
-- Tables enabled for realtime:
--   - appointments     → Calendar updates
--   - conversations    → New messages
--   - messages         → Chat updates
--   - notifications    → In-app notifications
--   - hospitalizations → Patient status changes
--   - pets             → Pet profile updates
--   - vaccines         → Vaccine status changes
--   - qr_tags          → QR scan events
--   - lost_pets        → Lost pet alerts
--   - clinic_invites   → New staff invitations
--   - lab_orders       → Lab order status
--   - invoices         → Invoice updates
--   - store_orders     → Order status
--
-- Dependencies: All table modules
-- =============================================================================

-- =============================================================================
-- CREATE REALTIME PUBLICATION
-- =============================================================================
-- Subscribe to changes on these tables for real-time updates.
-- Note: RLS policies still apply to realtime subscriptions.

BEGIN;

-- Drop existing publication if it exists
DROP PUBLICATION IF EXISTS supabase_realtime;

-- Create publication with selected tables
CREATE PUBLICATION supabase_realtime FOR TABLE
    public.appointments,
    public.conversations,
    public.messages,
    public.notifications,
    public.hospitalizations,
    public.pets,
    public.vaccines,
    public.qr_tags,
    public.lost_pets,
    public.clinic_invites,
    public.lab_orders,
    public.invoices,
    public.store_orders,
    public.hospitalization_vitals,
    public.hospitalization_medications;

COMMIT;

-- =============================================================================
-- REALTIME CHANNELS
-- =============================================================================
-- Predefined channel patterns for client subscriptions:
--
-- clinic:{tenant_id}:appointments    → All clinic appointments
-- clinic:{tenant_id}:hospitalizations→ All hospitalized patients
-- clinic:{tenant_id}:notifications   → Staff notifications
-- user:{user_id}:notifications       → User's notifications
-- pet:{pet_id}:updates              → Pet profile changes
-- conversation:{conversation_id}     → Chat messages

-- =============================================================================
-- REALTIME HELPER FUNCTIONS
-- =============================================================================

-- Broadcast custom events via pg_notify
CREATE OR REPLACE FUNCTION public.broadcast_realtime_event(
    p_channel TEXT,
    p_event TEXT,
    p_payload JSONB DEFAULT '{}'::jsonb
)
RETURNS void AS $$
BEGIN
    PERFORM pg_notify(
        p_channel,
        json_build_object(
            'event', p_event,
            'payload', p_payload,
            'timestamp', NOW()
        )::text
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Notify on appointment changes
CREATE OR REPLACE FUNCTION public.notify_appointment_change()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM public.broadcast_realtime_event(
        'clinic:' || COALESCE(NEW.tenant_id, OLD.tenant_id) || ':appointments',
        TG_OP,
        jsonb_build_object(
            'appointment_id', COALESCE(NEW.id, OLD.id),
            'status', NEW.status,
            'start_time', NEW.start_time
        )
    );
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS appointment_realtime_notify ON public.appointments;
CREATE TRIGGER appointment_realtime_notify
    AFTER INSERT OR UPDATE OR DELETE ON public.appointments
    FOR EACH ROW EXECUTE FUNCTION public.notify_appointment_change();

-- Notify on hospitalization status changes
CREATE OR REPLACE FUNCTION public.notify_hospitalization_change()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
        PERFORM public.broadcast_realtime_event(
            'clinic:' || NEW.tenant_id || ':hospitalizations',
            'status_change',
            jsonb_build_object(
                'hospitalization_id', NEW.id,
                'pet_id', NEW.pet_id,
                'old_status', OLD.status,
                'new_status', NEW.status
            )
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS hospitalization_realtime_notify ON public.hospitalizations;
CREATE TRIGGER hospitalization_realtime_notify
    AFTER UPDATE ON public.hospitalizations
    FOR EACH ROW EXECUTE FUNCTION public.notify_hospitalization_change();

-- Notify on new messages
CREATE OR REPLACE FUNCTION public.notify_new_message()
RETURNS TRIGGER AS $$
DECLARE
    v_conversation RECORD;
BEGIN
    SELECT tenant_id, client_id INTO v_conversation
    FROM public.conversations
    WHERE id = NEW.conversation_id;

    -- Notify clinic channel
    PERFORM public.broadcast_realtime_event(
        'clinic:' || v_conversation.tenant_id || ':messages',
        'new_message',
        jsonb_build_object(
            'conversation_id', NEW.conversation_id,
            'message_id', NEW.id,
            'sender_type', NEW.sender_type
        )
    );

    -- Notify user channel
    PERFORM public.broadcast_realtime_event(
        'user:' || v_conversation.client_id || ':messages',
        'new_message',
        jsonb_build_object(
            'conversation_id', NEW.conversation_id,
            'message_id', NEW.id
        )
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS message_realtime_notify ON public.messages;
CREATE TRIGGER message_realtime_notify
    AFTER INSERT ON public.messages
    FOR EACH ROW EXECUTE FUNCTION public.notify_new_message();

-- Notify on new notifications
CREATE OR REPLACE FUNCTION public.notify_notification_created()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM public.broadcast_realtime_event(
        'user:' || NEW.user_id || ':notifications',
        'new_notification',
        jsonb_build_object(
            'notification_id', NEW.id,
            'type', NEW.type,
            'title', NEW.title,
            'priority', NEW.priority
        )
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS notification_realtime_notify ON public.notifications;
CREATE TRIGGER notification_realtime_notify
    AFTER INSERT ON public.notifications
    FOR EACH ROW EXECUTE FUNCTION public.notify_notification_created();

-- Notify on QR tag scan
CREATE OR REPLACE FUNCTION public.notify_qr_scan()
RETURNS TRIGGER AS $$
DECLARE
    v_tag RECORD;
BEGIN
    SELECT tenant_id, pet_id INTO v_tag
    FROM public.qr_tags
    WHERE id = NEW.tag_id;

    IF v_tag.tenant_id IS NOT NULL THEN
        PERFORM public.broadcast_realtime_event(
            'clinic:' || v_tag.tenant_id || ':qr_scans',
            'tag_scanned',
            jsonb_build_object(
                'tag_id', NEW.tag_id,
                'pet_id', v_tag.pet_id,
                'scanned_at', NEW.scanned_at,
                'latitude', NEW.latitude,
                'longitude', NEW.longitude
            )
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS qr_scan_realtime_notify ON public.qr_tag_scans;
CREATE TRIGGER qr_scan_realtime_notify
    AFTER INSERT ON public.qr_tag_scans
    FOR EACH ROW EXECUTE FUNCTION public.notify_qr_scan();

-- Notify on lost pet report
CREATE OR REPLACE FUNCTION public.notify_lost_pet()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.is_public = true THEN
        PERFORM public.broadcast_realtime_event(
            'public:lost_pets',
            TG_OP,
            jsonb_build_object(
                'lost_pet_id', NEW.id,
                'pet_id', NEW.pet_id,
                'status', NEW.status,
                'location', NEW.last_seen_location
            )
        );
    END IF;

    PERFORM public.broadcast_realtime_event(
        'clinic:' || NEW.tenant_id || ':lost_pets',
        TG_OP,
        jsonb_build_object(
            'lost_pet_id', NEW.id,
            'pet_id', NEW.pet_id,
            'status', NEW.status
        )
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS lost_pet_realtime_notify ON public.lost_pets;
CREATE TRIGGER lost_pet_realtime_notify
    AFTER INSERT OR UPDATE ON public.lost_pets
    FOR EACH ROW EXECUTE FUNCTION public.notify_lost_pet();


