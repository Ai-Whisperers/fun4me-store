-- =============================================
-- Recurring Appointments Tables
-- =============================================
-- Allows scheduling recurring appointments (weekly, monthly, etc.)
-- A cron job generates individual appointments from these patterns

CREATE TABLE IF NOT EXISTS appointment_recurrences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  pet_id UUID NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  vet_id UUID REFERENCES profiles(id),

  -- Recurrence pattern (inspired by RFC 5545 / iCalendar)
  frequency TEXT NOT NULL CHECK (frequency IN ('daily', 'weekly', 'biweekly', 'monthly', 'custom')),
  interval_value INTEGER DEFAULT 1 CHECK (interval_value >= 1 AND interval_value <= 12),
  day_of_week INTEGER[] CHECK (
    day_of_week IS NULL OR 
    array_length(day_of_week, 1) <= 7 AND 
    day_of_week <@ ARRAY[0,1,2,3,4,5,6]  -- 0=Sunday to 6=Saturday
  ),
  day_of_month INTEGER CHECK (day_of_month IS NULL OR (day_of_month >= 1 AND day_of_month <= 31)),
  preferred_time TIME NOT NULL,
  duration_minutes INTEGER NOT NULL CHECK (duration_minutes > 0 AND duration_minutes <= 480),

  -- Bounds
  start_date DATE NOT NULL,
  end_date DATE,                     -- NULL = indefinite
  max_occurrences INTEGER CHECK (max_occurrences IS NULL OR max_occurrences > 0),
  occurrences_generated INTEGER DEFAULT 0,

  -- Status
  is_active BOOLEAN DEFAULT true,
  paused_until DATE,                 -- Temporary pause until this date

  -- Metadata
  notes TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Link generated appointments to their recurrence
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS recurrence_id UUID REFERENCES appointment_recurrences(id);
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS recurrence_index INTEGER;

-- Enable RLS
ALTER TABLE appointment_recurrences ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Staff manage recurrences" ON appointment_recurrences FOR ALL
  USING (is_staff_of(tenant_id));

CREATE POLICY "Owners view own pet recurrences" ON appointment_recurrences FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM pets 
    WHERE pets.id = appointment_recurrences.pet_id
    AND pets.owner_id = auth.uid()
  ));

CREATE POLICY "Owners can create recurrences for own pets" ON appointment_recurrences FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM pets 
    WHERE pets.id = appointment_recurrences.pet_id
    AND pets.owner_id = auth.uid()
  ));

CREATE POLICY "Owners can update own pet recurrences" ON appointment_recurrences FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM pets 
    WHERE pets.id = appointment_recurrences.pet_id
    AND pets.owner_id = auth.uid()
  ));

-- Indexes
CREATE INDEX IF NOT EXISTS idx_recurrences_tenant_active 
  ON appointment_recurrences(tenant_id, is_active) 
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_recurrences_pet 
  ON appointment_recurrences(pet_id);

CREATE INDEX IF NOT EXISTS idx_recurrences_next_gen 
  ON appointment_recurrences(tenant_id, start_date, is_active)
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_appointments_recurrence 
  ON appointments(recurrence_id) 
  WHERE recurrence_id IS NOT NULL;

-- Handle updated_at trigger
DROP TRIGGER IF EXISTS handle_updated_at ON appointment_recurrences;
CREATE TRIGGER handle_updated_at
  BEFORE UPDATE ON appointment_recurrences
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

-- Function to calculate next occurrence date from a recurrence pattern
CREATE OR REPLACE FUNCTION calculate_next_occurrence(
  p_frequency TEXT,
  p_interval_value INTEGER,
  p_day_of_week INTEGER[],
  p_day_of_month INTEGER,
  p_start_date DATE,
  p_from_date DATE
) RETURNS DATE AS $$
DECLARE
  v_next_date DATE;
  v_dow INTEGER;
BEGIN
  -- Start from the later of start_date or from_date
  v_next_date := GREATEST(p_start_date, p_from_date);
  
  CASE p_frequency
    WHEN 'daily' THEN
      -- Next day (or start date if in future)
      IF v_next_date <= p_from_date THEN
        v_next_date := p_from_date + (p_interval_value || ' days')::INTERVAL;
      END IF;
      
    WHEN 'weekly' THEN
      -- Find next occurrence on specified day(s) of week
      IF p_day_of_week IS NOT NULL AND array_length(p_day_of_week, 1) > 0 THEN
        -- Find next matching day of week
        FOR i IN 0..13 LOOP  -- Look up to 2 weeks ahead
          v_next_date := p_from_date + i;
          v_dow := EXTRACT(DOW FROM v_next_date)::INTEGER;
          IF v_dow = ANY(p_day_of_week) AND v_next_date >= p_start_date THEN
            EXIT;
          END IF;
        END LOOP;
      ELSE
        -- Same day of week as start date
        v_dow := EXTRACT(DOW FROM p_start_date)::INTEGER;
        v_next_date := p_from_date + ((7 - EXTRACT(DOW FROM p_from_date)::INTEGER + v_dow) % 7);
        IF v_next_date <= p_from_date THEN
          v_next_date := v_next_date + (p_interval_value * 7);
        END IF;
      END IF;
      
    WHEN 'biweekly' THEN
      -- Every 2 weeks from start date
      v_dow := EXTRACT(DOW FROM p_start_date)::INTEGER;
      v_next_date := p_start_date;
      WHILE v_next_date <= p_from_date LOOP
        v_next_date := v_next_date + INTERVAL '14 days';
      END LOOP;
      
    WHEN 'monthly' THEN
      -- Same day each month (or specified day)
      IF p_day_of_month IS NOT NULL THEN
        v_next_date := DATE_TRUNC('month', p_from_date) + (p_day_of_month - 1);
        IF v_next_date <= p_from_date THEN
          v_next_date := DATE_TRUNC('month', p_from_date + INTERVAL '1 month') + (p_day_of_month - 1);
        END IF;
      ELSE
        v_next_date := DATE_TRUNC('month', p_from_date) + (EXTRACT(DAY FROM p_start_date)::INTEGER - 1);
        IF v_next_date <= p_from_date THEN
          v_next_date := DATE_TRUNC('month', p_from_date + INTERVAL '1 month') + (EXTRACT(DAY FROM p_start_date)::INTEGER - 1);
        END IF;
      END IF;
      -- Apply interval
      IF p_interval_value > 1 THEN
        v_next_date := v_next_date + ((p_interval_value - 1) || ' months')::INTERVAL;
      END IF;
      
    WHEN 'custom' THEN
      -- Custom interval in days
      v_next_date := p_start_date;
      WHILE v_next_date <= p_from_date LOOP
        v_next_date := v_next_date + (p_interval_value || ' days')::INTERVAL;
      END LOOP;
      
    ELSE
      v_next_date := NULL;
  END CASE;
  
  RETURN v_next_date;
END;
$$ LANGUAGE plpgsql;

-- Function to generate appointments from recurrences (called by cron)
CREATE OR REPLACE FUNCTION generate_recurring_appointments(
  p_days_ahead INTEGER DEFAULT 30
) RETURNS TABLE(
  recurrence_id UUID,
  appointment_id UUID,
  scheduled_for TIMESTAMPTZ
) AS $$
DECLARE
  v_recurrence RECORD;
  v_next_date DATE;
  v_end_date DATE;
  v_appointment_id UUID;
  v_start_time TIMESTAMPTZ;
  v_end_time TIMESTAMPTZ;
  v_current_index INTEGER;
BEGIN
  v_end_date := CURRENT_DATE + p_days_ahead;
  
  -- Loop through active recurrences
  FOR v_recurrence IN 
    SELECT * FROM appointment_recurrences
    WHERE is_active = true
      AND (paused_until IS NULL OR paused_until <= CURRENT_DATE)
      AND start_date <= v_end_date
      AND (end_date IS NULL OR end_date >= CURRENT_DATE)
      AND (max_occurrences IS NULL OR occurrences_generated < max_occurrences)
  LOOP
    -- Calculate next occurrence
    v_next_date := calculate_next_occurrence(
      v_recurrence.frequency,
      v_recurrence.interval_value,
      v_recurrence.day_of_week,
      v_recurrence.day_of_month,
      v_recurrence.start_date,
      CURRENT_DATE
    );
    
    -- Generate appointments up to end_date
    WHILE v_next_date IS NOT NULL 
      AND v_next_date <= v_end_date
      AND (v_recurrence.end_date IS NULL OR v_next_date <= v_recurrence.end_date)
      AND (v_recurrence.max_occurrences IS NULL OR v_recurrence.occurrences_generated < v_recurrence.max_occurrences)
    LOOP
      -- Check if appointment already exists for this date
      IF NOT EXISTS (
        SELECT 1 FROM appointments
        WHERE appointments.recurrence_id = v_recurrence.id
          AND DATE(start_time) = v_next_date
      ) THEN
        -- Calculate start and end times
        v_start_time := v_next_date + v_recurrence.preferred_time;
        v_end_time := v_start_time + (v_recurrence.duration_minutes || ' minutes')::INTERVAL;
        
        -- Check for conflicts
        IF NOT EXISTS (
          SELECT 1 FROM appointments
          WHERE tenant_id = v_recurrence.tenant_id
            AND pet_id = v_recurrence.pet_id
            AND status NOT IN ('cancelled', 'no_show')
            AND (start_time, end_time) OVERLAPS (v_start_time, v_end_time)
        ) THEN
          -- Get next index
          SELECT COALESCE(MAX(recurrence_index), 0) + 1 
          INTO v_current_index
          FROM appointments 
          WHERE appointments.recurrence_id = v_recurrence.id;
          
          -- Create appointment
          INSERT INTO appointments (
            tenant_id, pet_id, service_id, vet_id,
            start_time, end_time, status,
            recurrence_id, recurrence_index,
            notes, created_by
          ) VALUES (
            v_recurrence.tenant_id,
            v_recurrence.pet_id,
            v_recurrence.service_id,
            v_recurrence.vet_id,
            v_start_time,
            v_end_time,
            'scheduled',
            v_recurrence.id,
            v_current_index,
            COALESCE(v_recurrence.notes, 'Cita recurrente #' || v_current_index),
            v_recurrence.created_by
          )
          RETURNING id INTO v_appointment_id;
          
          -- Update counter
          UPDATE appointment_recurrences 
          SET occurrences_generated = occurrences_generated + 1,
              updated_at = NOW()
          WHERE id = v_recurrence.id;
          
          -- Return result
          recurrence_id := v_recurrence.id;
          appointment_id := v_appointment_id;
          scheduled_for := v_start_time;
          RETURN NEXT;
        END IF;
      END IF;
      
      -- Calculate next occurrence after this one
      v_next_date := calculate_next_occurrence(
        v_recurrence.frequency,
        v_recurrence.interval_value,
        v_recurrence.day_of_week,
        v_recurrence.day_of_month,
        v_recurrence.start_date,
        v_next_date + 1
      );
    END LOOP;
  END LOOP;
  
  RETURN;
END;
$$ LANGUAGE plpgsql;

-- Comments
COMMENT ON TABLE appointment_recurrences IS 'Recurring appointment patterns for automatic scheduling';
COMMENT ON COLUMN appointment_recurrences.frequency IS 'Recurrence frequency: daily, weekly, biweekly, monthly, custom';
COMMENT ON COLUMN appointment_recurrences.interval_value IS 'Interval between occurrences (e.g., every 2 weeks)';
COMMENT ON COLUMN appointment_recurrences.day_of_week IS 'Days of week for weekly recurrence (0=Sunday to 6=Saturday)';
COMMENT ON COLUMN appointment_recurrences.paused_until IS 'Temporarily pause generation until this date';
COMMENT ON FUNCTION generate_recurring_appointments(INTEGER) IS 'Called by cron to generate appointments ahead of time';
