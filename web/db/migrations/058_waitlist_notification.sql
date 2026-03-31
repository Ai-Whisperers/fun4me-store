-- BUG-004: Add notification when waitlist slot becomes available
-- Updates the process_waitlist_on_cancellation trigger to notify customers

CREATE OR REPLACE FUNCTION process_waitlist_on_cancellation()
RETURNS TRIGGER AS $$
DECLARE
  v_waitlist_entry RECORD;
  v_offer_duration INTERVAL := INTERVAL '4 hours';
  v_service_name TEXT;
  v_pet_name TEXT;
BEGIN
  -- Only process if appointment is being cancelled or rescheduled
  IF NEW.status IN ('cancelled', 'rescheduled') AND OLD.status NOT IN ('cancelled', 'rescheduled') THEN

    -- Find the next person on the waitlist for this service and date range
    SELECT w.*, p.full_name as client_name, pets.name as pet_name
    INTO v_waitlist_entry
    FROM appointment_waitlists w
    JOIN profiles p ON p.id = w.client_id
    LEFT JOIN pets ON pets.id = w.pet_id
    WHERE w.service_id = OLD.service_id
      AND w.status = 'waiting'
      AND w.preferred_date_start <= OLD.start_time::date
      AND w.preferred_date_end >= OLD.start_time::date
    ORDER BY w.priority DESC, w.position ASC
    LIMIT 1;

    -- If found, offer the slot and notify
    IF v_waitlist_entry.id IS NOT NULL THEN
      -- Get service name for notification
      SELECT name INTO v_service_name
      FROM services
      WHERE id = OLD.service_id;

      -- Update waitlist entry status
      UPDATE appointment_waitlists
      SET
        status = 'offered',
        offered_appointment_id = OLD.id,
        offered_at = NOW(),
        offer_expires_at = NOW() + v_offer_duration,
        updated_at = NOW()
      WHERE id = v_waitlist_entry.id;

      -- BUG-004: Create notification for the client
      INSERT INTO notifications (
        user_id,
        title,
        message,
        type,
        link,
        data
      ) VALUES (
        v_waitlist_entry.client_id,
        '¡Turno disponible!',
        COALESCE(
          'Hay un turno disponible para ' || v_service_name ||
          CASE WHEN v_waitlist_entry.pet_name IS NOT NULL
            THEN ' para ' || v_waitlist_entry.pet_name
            ELSE ''
          END ||
          '. Tienes 4 horas para confirmarlo.',
          'Hay un turno disponible en la lista de espera. Tienes 4 horas para confirmarlo.'
        ),
        'waitlist_offer',
        '/portal/appointments/waitlist',
        jsonb_build_object(
          'waitlist_id', v_waitlist_entry.id,
          'service_id', OLD.service_id,
          'service_name', v_service_name,
          'pet_id', v_waitlist_entry.pet_id,
          'available_time', OLD.start_time,
          'expires_at', NOW() + v_offer_duration
        )
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Also update expire function to notify when offer expires
CREATE OR REPLACE FUNCTION expire_waitlist_offers()
RETURNS INTEGER AS $$
DECLARE
  v_expired_count INTEGER := 0;
  v_expired_entry RECORD;
  v_next_entry RECORD;
  v_service_name TEXT;
BEGIN
  -- Find and expire old offers
  FOR v_expired_entry IN
    SELECT w.*, s.name as service_name
    FROM appointment_waitlists w
    LEFT JOIN services s ON s.id = w.service_id
    WHERE w.status = 'offered'
      AND w.offer_expires_at < NOW()
  LOOP
    -- Mark as expired
    UPDATE appointment_waitlists
    SET
      status = 'expired',
      updated_at = NOW()
    WHERE id = v_expired_entry.id;

    v_expired_count := v_expired_count + 1;

    -- Notify user that their offer expired
    INSERT INTO notifications (
      user_id,
      title,
      message,
      type,
      data
    ) VALUES (
      v_expired_entry.client_id,
      'Oferta de turno expirada',
      COALESCE(
        'La oferta de turno para ' || v_expired_entry.service_name || ' ha expirado.',
        'Una oferta de turno en la lista de espera ha expirado.'
      ),
      'waitlist_expired',
      jsonb_build_object(
        'waitlist_id', v_expired_entry.id,
        'service_id', v_expired_entry.service_id
      )
    );

    -- Find next person in line for the same service/date
    SELECT w.*, p.full_name as client_name, pets.name as pet_name
    INTO v_next_entry
    FROM appointment_waitlists w
    JOIN profiles p ON p.id = w.client_id
    LEFT JOIN pets ON pets.id = w.pet_id
    WHERE w.service_id = v_expired_entry.service_id
      AND w.status = 'waiting'
      AND w.preferred_date_start <= v_expired_entry.preferred_date_start
      AND w.preferred_date_end >= v_expired_entry.preferred_date_end
    ORDER BY w.priority DESC, w.position ASC
    LIMIT 1;

    -- Offer to next person if found
    IF v_next_entry.id IS NOT NULL AND v_expired_entry.offered_appointment_id IS NOT NULL THEN
      UPDATE appointment_waitlists
      SET
        status = 'offered',
        offered_appointment_id = v_expired_entry.offered_appointment_id,
        offered_at = NOW(),
        offer_expires_at = NOW() + INTERVAL '4 hours',
        updated_at = NOW()
      WHERE id = v_next_entry.id;

      -- Notify next person
      INSERT INTO notifications (
        user_id,
        title,
        message,
        type,
        link,
        data
      ) VALUES (
        v_next_entry.client_id,
        '¡Turno disponible!',
        COALESCE(
          'Hay un turno disponible para ' || v_expired_entry.service_name ||
          CASE WHEN v_next_entry.pet_name IS NOT NULL
            THEN ' para ' || v_next_entry.pet_name
            ELSE ''
          END ||
          '. Tienes 4 horas para confirmarlo.',
          'Hay un turno disponible en la lista de espera. Tienes 4 horas para confirmarlo.'
        ),
        'waitlist_offer',
        '/portal/appointments/waitlist',
        jsonb_build_object(
          'waitlist_id', v_next_entry.id,
          'service_id', v_expired_entry.service_id,
          'service_name', v_expired_entry.service_name,
          'pet_id', v_next_entry.pet_id,
          'expires_at', NOW() + INTERVAL '4 hours'
        )
      );
    END IF;
  END LOOP;

  RETURN v_expired_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION process_waitlist_on_cancellation IS
'BUG-004: Processes waitlist when appointment is cancelled, now includes customer notification';

COMMENT ON FUNCTION expire_waitlist_offers IS
'BUG-004: Expires old waitlist offers and notifies customers, cascades to next in line';
