-- =============================================
-- Appointment Waitlist Tables
-- =============================================
-- Allows clients to join a waitlist when desired time slots are full
-- Staff can offer available slots to waitlisted clients

CREATE TABLE IF NOT EXISTS appointment_waitlists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  pet_id UUID NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  preferred_vet_id UUID REFERENCES profiles(id),

  -- Requested timeframe
  preferred_date DATE NOT NULL,
  preferred_time_start TIME,        -- NULL = any time
  preferred_time_end TIME,
  is_flexible_date BOOLEAN DEFAULT false, -- accept +/- 1 day

  -- Queue management
  position INTEGER NOT NULL,        -- FIFO position for that date
  status TEXT DEFAULT 'waiting' CHECK (status IN ('waiting', 'offered', 'booked', 'expired', 'cancelled')),

  -- Offer tracking
  offered_appointment_id UUID REFERENCES appointments(id),
  offered_at TIMESTAMPTZ,
  offer_expires_at TIMESTAMPTZ,

  -- Contact preferences
  notify_via TEXT[] DEFAULT ARRAY['email', 'whatsapp'],

  -- Metadata
  notes TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE appointment_waitlists ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Staff manage waitlist" ON appointment_waitlists FOR ALL
  USING (is_staff_of(tenant_id));

CREATE POLICY "Owners manage own pet waitlist" ON appointment_waitlists FOR ALL
  USING (EXISTS (
    SELECT 1 FROM pets 
    WHERE pets.id = appointment_waitlists.pet_id
    AND pets.owner_id = auth.uid()
  ));

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_waitlist_tenant_date_status 
  ON appointment_waitlists(tenant_id, preferred_date, status)
  WHERE status = 'waiting';

CREATE INDEX IF NOT EXISTS idx_waitlist_pet 
  ON appointment_waitlists(pet_id);

CREATE INDEX IF NOT EXISTS idx_waitlist_service 
  ON appointment_waitlists(service_id);

CREATE INDEX IF NOT EXISTS idx_waitlist_offer_expires 
  ON appointment_waitlists(offer_expires_at)
  WHERE status = 'offered';

-- Function to auto-assign position in queue
CREATE OR REPLACE FUNCTION assign_waitlist_position()
RETURNS TRIGGER AS $$
BEGIN
  SELECT COALESCE(MAX(position), 0) + 1 INTO NEW.position
  FROM appointment_waitlists
  WHERE tenant_id = NEW.tenant_id
    AND preferred_date = NEW.preferred_date
    AND status = 'waiting';
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to set position on insert
DROP TRIGGER IF EXISTS set_waitlist_position ON appointment_waitlists;
CREATE TRIGGER set_waitlist_position
  BEFORE INSERT ON appointment_waitlists
  FOR EACH ROW EXECUTE FUNCTION assign_waitlist_position();

-- Handle updated_at trigger
DROP TRIGGER IF EXISTS handle_updated_at ON appointment_waitlists;
CREATE TRIGGER handle_updated_at
  BEFORE UPDATE ON appointment_waitlists
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

-- Function to process waitlist when appointment is cancelled
-- This finds the first waiting entry and offers the slot
CREATE OR REPLACE FUNCTION process_waitlist_on_cancellation()
RETURNS TRIGGER AS $$
DECLARE
  v_waitlist_entry RECORD;
  v_offer_duration INTERVAL := '2 hours';
BEGIN
  -- Only process when appointment is cancelled
  IF NEW.status = 'cancelled' AND OLD.status != 'cancelled' THEN
    -- Find first waiting entry for same date/time/service
    SELECT * INTO v_waitlist_entry
    FROM appointment_waitlists
    WHERE tenant_id = OLD.tenant_id
      AND service_id = OLD.service_id
      AND preferred_date = DATE(OLD.start_time)
      AND status = 'waiting'
      AND (
        preferred_time_start IS NULL 
        OR (OLD.start_time::TIME >= preferred_time_start AND OLD.start_time::TIME <= preferred_time_end)
      )
    ORDER BY position ASC
    LIMIT 1;

    -- If found, offer the slot
    IF v_waitlist_entry.id IS NOT NULL THEN
      UPDATE appointment_waitlists
      SET 
        status = 'offered',
        offered_appointment_id = OLD.id,
        offered_at = NOW(),
        offer_expires_at = NOW() + v_offer_duration,
        updated_at = NOW()
      WHERE id = v_waitlist_entry.id;
      
      -- TODO: Send notification to client about available slot
      -- This would trigger notification system
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger on appointments to process waitlist
DROP TRIGGER IF EXISTS process_waitlist_on_appointment_cancel ON appointments;
CREATE TRIGGER process_waitlist_on_appointment_cancel
  AFTER UPDATE ON appointments
  FOR EACH ROW EXECUTE FUNCTION process_waitlist_on_cancellation();

-- Function to expire old offers and move to next person
CREATE OR REPLACE FUNCTION expire_waitlist_offers()
RETURNS INTEGER AS $$
DECLARE
  v_expired_count INTEGER := 0;
  v_expired_entry RECORD;
BEGIN
  -- Find and expire old offers
  FOR v_expired_entry IN 
    SELECT * FROM appointment_waitlists
    WHERE status = 'offered'
      AND offer_expires_at < NOW()
  LOOP
    -- Mark as expired
    UPDATE appointment_waitlists
    SET status = 'expired', updated_at = NOW()
    WHERE id = v_expired_entry.id;
    
    v_expired_count := v_expired_count + 1;
    
    -- Find next person in queue for same date
    UPDATE appointment_waitlists
    SET 
      status = 'offered',
      offered_appointment_id = v_expired_entry.offered_appointment_id,
      offered_at = NOW(),
      offer_expires_at = NOW() + INTERVAL '2 hours',
      updated_at = NOW()
    WHERE id = (
      SELECT id FROM appointment_waitlists
      WHERE tenant_id = v_expired_entry.tenant_id
        AND preferred_date = v_expired_entry.preferred_date
        AND service_id = v_expired_entry.service_id
        AND status = 'waiting'
      ORDER BY position ASC
      LIMIT 1
    );
  END LOOP;
  
  RETURN v_expired_count;
END;
$$ LANGUAGE plpgsql;

-- Comments
COMMENT ON TABLE appointment_waitlists IS 'Waitlist for appointments when slots are full';
COMMENT ON COLUMN appointment_waitlists.position IS 'FIFO position in queue for specific date';
COMMENT ON COLUMN appointment_waitlists.is_flexible_date IS 'Client accepts +/- 1 day from preferred date';
COMMENT ON COLUMN appointment_waitlists.offer_expires_at IS 'When offer expires and moves to next person';
COMMENT ON FUNCTION expire_waitlist_offers() IS 'Called by cron to expire old offers and notify next person';
