-- =============================================================================
-- MIGRATION 049: Kennel Status Atomicity
-- =============================================================================
-- RACE-002: Prevent double-booking of kennels via database constraints and triggers
--
-- Problem: Hospitalization insert and kennel status update are separate operations
-- Solution: Unique index + trigger for atomic status management
-- =============================================================================

-- =============================================================================
-- UNIQUE CONSTRAINT: Only one active hospitalization per kennel
-- =============================================================================
-- This prevents two concurrent transactions from both inserting active hospitalizations
-- for the same kennel - the second one will fail with unique constraint violation

CREATE UNIQUE INDEX IF NOT EXISTS idx_hospitalizations_one_active_per_kennel
ON public.hospitalizations (kennel_id)
WHERE status NOT IN ('discharged', 'cancelled', 'transferred');

COMMENT ON INDEX idx_hospitalizations_one_active_per_kennel IS
  'RACE-002: Prevents double-booking kennels by ensuring only one active hospitalization per kennel';

-- =============================================================================
-- TRIGGER: Auto-update kennel status on hospitalization changes
-- =============================================================================

CREATE OR REPLACE FUNCTION public.sync_kennel_status_on_hospitalization()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- On new hospitalization, mark kennel as occupied
    -- The unique index above prevents race conditions
    UPDATE kennels
    SET
      kennel_status = 'occupied',
      updated_at = NOW()
    WHERE id = NEW.kennel_id
    AND kennel_status = 'available';  -- Only update if currently available

    -- Check if update succeeded (kennel was available)
    IF NOT FOUND THEN
      -- Kennel was not available - this shouldn't happen if unique index is working
      -- but provides defense in depth
      RAISE EXCEPTION 'Kennel % is not available', NEW.kennel_id
        USING ERRCODE = 'P0001';
    END IF;

    RETURN NEW;

  ELSIF TG_OP = 'UPDATE' THEN
    -- Handle status changes
    IF OLD.status NOT IN ('discharged', 'cancelled', 'transferred')
       AND NEW.status IN ('discharged', 'cancelled', 'transferred') THEN
      -- Patient leaving - mark kennel as available (or needs cleaning)
      UPDATE kennels
      SET
        kennel_status = 'cleaning',  -- Requires cleaning before next use
        updated_at = NOW()
      WHERE id = OLD.kennel_id;
    END IF;

    -- Handle kennel transfer
    IF NEW.kennel_id IS DISTINCT FROM OLD.kennel_id THEN
      -- Mark old kennel as needs cleaning
      UPDATE kennels
      SET
        kennel_status = 'cleaning',
        updated_at = NOW()
      WHERE id = OLD.kennel_id;

      -- Mark new kennel as occupied (if status is still active)
      IF NEW.status NOT IN ('discharged', 'cancelled', 'transferred') THEN
        UPDATE kennels
        SET
          kennel_status = 'occupied',
          updated_at = NOW()
        WHERE id = NEW.kennel_id
        AND kennel_status IN ('available', 'cleaning');

        IF NOT FOUND THEN
          RAISE EXCEPTION 'Target kennel % is not available', NEW.kennel_id
            USING ERRCODE = 'P0001';
        END IF;
      END IF;
    END IF;

    RETURN NEW;

  ELSIF TG_OP = 'DELETE' THEN
    -- On deletion (rare), mark kennel as available
    IF OLD.status NOT IN ('discharged', 'cancelled', 'transferred') THEN
      UPDATE kennels
      SET
        kennel_status = 'available',
        updated_at = NOW()
      WHERE id = OLD.kennel_id;
    END IF;

    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$;

COMMENT ON FUNCTION public.sync_kennel_status_on_hospitalization() IS
  'RACE-002: Automatically syncs kennel status when hospitalizations change';

-- Drop existing trigger if any
DROP TRIGGER IF EXISTS trg_sync_kennel_status ON public.hospitalizations;

-- Create the trigger
CREATE TRIGGER trg_sync_kennel_status
  AFTER INSERT OR UPDATE OR DELETE ON public.hospitalizations
  FOR EACH ROW
  EXECUTE FUNCTION sync_kennel_status_on_hospitalization();

-- =============================================================================
-- HELPER FUNCTION: Mark kennel as available after cleaning
-- =============================================================================
-- Staff uses this after cleaning a kennel

CREATE OR REPLACE FUNCTION public.mark_kennel_cleaned(
  p_kennel_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE kennels
  SET
    kennel_status = 'available',
    updated_at = NOW()
  WHERE id = p_kennel_id
  AND kennel_status = 'cleaning';

  IF NOT FOUND THEN
    RAISE NOTICE 'Kennel % was not in cleaning status', p_kennel_id;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.mark_kennel_cleaned(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_kennel_cleaned(UUID) TO service_role;

-- =============================================================================
-- FIX EXISTING DATA: Sync current kennel statuses
-- =============================================================================
-- Update kennels with active hospitalizations to 'occupied'
-- Update kennels without active hospitalizations to 'available' (if not already)

UPDATE kennels k
SET kennel_status = 'occupied'
WHERE EXISTS (
  SELECT 1 FROM hospitalizations h
  WHERE h.kennel_id = k.id
  AND h.status NOT IN ('discharged', 'cancelled', 'transferred')
)
AND k.kennel_status != 'occupied';

-- Note: We don't automatically set to 'available' as some may need cleaning
